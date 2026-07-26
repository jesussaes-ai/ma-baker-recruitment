#!/usr/bin/env node
/**
 * Puente Telegram → Cursor Agent (ciclo remoto) para CxC.
 *
 * Lo dispara el escucha de .cursor/hooks/telegram-approval.mjs:
 *   node scripts/telegram-agente.mjs --text "tu pedido"
 *   node scripts/telegram-agente.mjs --reset
 *
 * Requiere CURSOR_API_KEY (variable de usuario Windows o .env)
 * y @cursor/sdk instalado en el repo.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execSync, spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HOOKS = join(ROOT, '.cursor', 'hooks');
const CONFIG_PATH = join(HOOKS, 'telegram-approval.config.json');
const STATE_PATH = join(HOOKS, '.telegram-agent-state.json');
const BUSY_PATH = join(HOOKS, '.telegram-agent-busy.json');
const INBOX_PATH = join(HOOKS, '.telegram-inbox.json');
const ENV_PATH = join(ROOT, '.env');
const VOICE_SCRIPT = join(HOOKS, 'telegram-approval.mjs');

function loadEnvFile() {
  try {
    if (!existsSync(ENV_PATH)) return;
    for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const k = m[1];
      let v = m[2].replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch { /* noop */ }
}

function loadWindowsUserEnv(keys = ['CURSOR_API_KEY', 'OPENAI_API_KEY']) {
  if (process.platform !== 'win32') return;
  for (const key of keys) {
    if (process.env[key]) continue;
    try {
      const out = execSync(
        `powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('${key}','User')"`,
        { encoding: 'utf8', windowsHide: true },
      ).trim();
      if (out) process.env[key] = out;
    } catch { /* noop */ }
  }
}

function loadTgConfig() {
  const file = existsSync(CONFIG_PATH)
    ? JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
    : {};
  return {
    token: process.env.TELEGRAM_APPROVAL_BOT_TOKEN || file.botToken || '',
    chatId: process.env.TELEGRAM_APPROVAL_CHAT_ID || file.chatId || '',
  };
}

async function tg(token, method, params, timeoutMs = 30000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params || {}),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.description || method);
    return json.result;
  } finally {
    clearTimeout(t);
  }
}

function setBusy(busy, note = '') {
  if (!busy) {
    try { unlinkSync(BUSY_PATH); } catch { /* noop */ }
    return;
  }
  writeFileSync(BUSY_PATH, JSON.stringify({ pid: process.pid, note, ts: Date.now() }), 'utf8');
}

function readState() {
  try {
    if (existsSync(STATE_PATH)) return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch { /* noop */ }
  return {};
}

function writeState(s) {
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2), 'utf8');
}

function popInbox() {
  try {
    if (!existsSync(INBOX_PATH)) return null;
    const list = JSON.parse(readFileSync(INBOX_PATH, 'utf8'));
    if (!Array.isArray(list) || !list.length) return null;
    const next = list.shift();
    writeFileSync(INBOX_PATH, JSON.stringify(list, null, 2), 'utf8');
    return next;
  } catch {
    return null;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let text = '';
  let reset = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--text') text = args[++i] || '';
    else if (args[i] === '--file') {
      const p = args[++i];
      const j = JSON.parse(readFileSync(p, 'utf8'));
      text = j.text || j.message || '';
    } else if (args[i] === '--reset') reset = true;
    else if (!args[i].startsWith('-')) text = args[i];
  }
  return { text: String(text || '').trim(), reset };
}

function summarizeForVoice(full, max = 900) {
  const t = String(full || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + '…';
}

function sendVoice(text) {
  const r = spawnSync(process.execPath, [VOICE_SCRIPT, 'voice', text], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
  });
  return r.status === 0;
}

async function runAgent(userText) {
  const apiKey = process.env.CURSOR_API_KEY || '';
  if (!apiKey) {
    throw new Error(
      'Falta CURSOR_API_KEY. Créala en https://cursor.com/dashboard/api y guárdala como variable de usuario de Windows o en el .env local.',
    );
  }

  let Agent;
  try {
    ({ Agent } = await import('@cursor/sdk'));
  } catch {
    throw new Error('Falta @cursor/sdk. Corre: npm install @cursor/sdk');
  }

  const opts = {
    apiKey,
    model: { id: 'composer-2.5' },
    local: { cwd: ROOT },
  };

  const state = readState();
  let agent;
  let created = false;
  if (state.agentId) {
    try {
      agent = await Agent.resume(state.agentId, opts);
    } catch {
      agent = await Agent.create(opts);
      created = true;
    }
  } else {
    agent = await Agent.create(opts);
    created = true;
  }

  try {
    if (created || !state.agentId) {
      writeState({ agentId: agent.agentId || agent.id, updatedAt: new Date().toISOString() });
    }
    const id = agent.agentId || agent.id;
    if (id) writeState({ agentId: id, updatedAt: new Date().toISOString() });

    const projectName = process.env.TELEGRAM_AGENT_PROJECT
      || (existsSync(join(ROOT, 'package.json'))
        ? (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).name || 'proyecto')
        : 'proyecto');

    const prompt =
      `Eres el agente remoto de Cursor para el proyecto "${projectName}".\n` +
      'El usuario te escribe desde Telegram. Trabaja en el repo local (cwd).\n' +
      'Responde en español, concreto. Sin secretos en Telegram.\n' +
      'Al terminar, resume en pocas frases qué hiciste y qué sigue.\n\n' +
      'Pedido del usuario:\n' +
      userText;

    const run = await agent.send(prompt);
    const runId = run?.id || '';
    const result = await run.wait();
    if (result?.status === 'error') {
      throw new Error(`El agente inició pero falló${runId ? ` (run ${runId})` : ''}. Revisa la ejecución en Cursor.`);
    }
    const text =
      (typeof result?.result === 'string' && result.result) ||
      (typeof result?.text === 'string' && result.text) ||
      (await (typeof run.text === 'function' ? run.text() : Promise.resolve(''))) ||
      `Tarea terminada (status: ${result?.status || 'ok'}).`;

    return { status: result?.status || 'finished', runId, text: String(text).trim() };
  } finally {
    try {
      if (typeof agent[Symbol.asyncDispose] === 'function') await agent[Symbol.asyncDispose]();
      else if (typeof agent.dispose === 'function') await agent.dispose();
    } catch { /* noop */ }
  }
}

async function main() {
  loadEnvFile();
  loadWindowsUserEnv();
  const { text, reset } = parseArgs();
  const cfg = loadTgConfig();
  if (!cfg.token || !cfg.chatId) {
    console.error('Falta botToken/chatId de Telegram.');
    process.exit(1);
  }

  if (reset) {
    try { unlinkSync(STATE_PATH); } catch { /* noop */ }
    await tg(cfg.token, 'sendMessage', {
      chat_id: cfg.chatId,
      text: '🔄 Conversación del agente reiniciada. El próximo mensaje abre una sesión nueva.',
    });
    return;
  }

  if (!text) {
    console.error('Sin texto de pedido.');
    process.exit(1);
  }

  setBusy(true, text.slice(0, 80));
  try {
    await tg(cfg.token, 'sendMessage', {
      chat_id: cfg.chatId,
      text: `⏳ Recibido. Trabajando en:\n\n${text.slice(0, 500)}`,
    });

    const { text: answer } = await runAgent(text);
    const chunks = answer.match(/[\s\S]{1,3500}/g) || ['(sin respuesta)'];
    for (const c of chunks) {
      await tg(cfg.token, 'sendMessage', { chat_id: cfg.chatId, text: c });
    }
    sendVoice(summarizeForVoice(answer));
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    await tg(cfg.token, 'sendMessage', {
      chat_id: cfg.chatId,
      text: `⛔ Error al ejecutar el agente:\n${msg.slice(0, 500)}`,
    }).catch(() => {});
    console.error(msg);
    process.exitCode = 1;
  } finally {
    setBusy(false);
    const next = popInbox();
    if (next && next.text) {
      const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--text', next.text], {
        cwd: ROOT,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: process.env,
      });
      child.unref();
    }
  }
}

main();
