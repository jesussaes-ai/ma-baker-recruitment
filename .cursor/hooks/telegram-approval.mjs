#!/usr/bin/env node
// Aprobación remota por Telegram para Cursor Hooks (Ma Baker CRM).
//
// Uso desde hooks.json:
//   node .cursor/hooks/telegram-approval.mjs shell   -> beforeShellExecution
//   node .cursor/hooks/telegram-approval.mjs mcp      -> beforeMCPExecution
//
// Utilidades de configuración (ejecutar a mano):
//   node .cursor/hooks/telegram-approval.mjs chatid   -> imprime el chat_id de los mensajes recientes al bot
//   node .cursor/hooks/telegram-approval.mjs test     -> envía una aprobación de prueba a tu Telegram
//   node .cursor/hooks/telegram-approval.mjs voice "texto"  -> genera TTS (OpenAI) y lo manda como audio al chat
//   echo "texto" | node .cursor/hooks/telegram-approval.mjs voice
//   node .cursor/hooks/telegram-approval.mjs send     -> manda texto plano (stdin)
//
// Configuración por variables de entorno o por archivo local
// .cursor/hooks/telegram-approval.config.json (NO se sube a git):
//   TELEGRAM_APPROVAL_BOT_TOKEN  / botToken
//   TELEGRAM_APPROVAL_CHAT_ID    / chatId
//   TELEGRAM_APPROVAL_MODE       / mode          -> "sensitive" (def.) | "all"
//   TELEGRAM_APPROVAL_TIMEOUT    / timeoutSeconds -> segundos de espera (def. 180)
//   TELEGRAM_APPROVAL_ON_TIMEOUT / onTimeout      -> "ask" (def.) | "deny" | "allow"
//   OPENAI_API_KEY (env o .env del repo) para el comando voice

import { readFileSync, existsSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_PATH = join(__dirname, 'telegram-approval.config.json');
const OFFSET_PATH = join(__dirname, '.telegram-approval.offset');
const LOG_PATH = join(__dirname, '.telegram-approval.log');
const DECISIONS_PATH = join(__dirname, '.telegram-approval.decisions.json');
const LOCK_PATH = join(__dirname, '.telegram-approval.listener.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(...parts) {
  try {
    appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${parts.join(' ')}\n`, 'utf8');
  } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
function loadConfig() {
  let file = {};
  try {
    if (existsSync(CONFIG_PATH)) file = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch { /* archivo inválido -> se ignora */ }

  return {
    token: process.env.TELEGRAM_APPROVAL_BOT_TOKEN || file.botToken || '',
    chatId: process.env.TELEGRAM_APPROVAL_CHAT_ID || file.chatId || '',
    mode: (process.env.TELEGRAM_APPROVAL_MODE || file.mode || 'sensitive').toLowerCase(),
    timeoutSeconds: Number(process.env.TELEGRAM_APPROVAL_TIMEOUT || file.timeoutSeconds || 600),
    onTimeout: (process.env.TELEGRAM_APPROVAL_ON_TIMEOUT || file.onTimeout || 'ask').toLowerCase(),
  };
}

// ---------------------------------------------------------------------------
// Detección de acciones sensibles
// ---------------------------------------------------------------------------
const SHELL_PATTERNS = [
  /\bgit\s+commit\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-\w*f/i,
  /--force\b/i,
  /\bpush\s+-f\b/i,
  /\brm\s+-\w*[rf]/i,
  /remove-item\b[\s\S]*-recurse/i,
  /\bssh\b/i,
  /\bscp\b/i,
  /217\.77\.6\.49/,
  /\bdrop\s+(table|database)\b/i,
  /\bdocker\s+compose\b[\s\S]*\b(down|rm)\b/i,
];

// Autorización persistente del usuario para operar Ma Baker cuando está fuera:
// SSH/SCP al VPS conocido pasa sin Telegram si no contiene acciones destructivas.
const REMOTE_ROUTINE_PATTERN = /(?:\bssh\b|\bscp\b)[\s\S]*(?:root@217\.77\.6\.49|217\.77\.6\.49|\/opt\/ma-baker-crm)/i;
const REMOTE_DESTRUCTIVE_PATTERNS = [
  /\brm\b/i,
  /remove-item\b/i,
  /\bdocker\s+(?:compose\s+)?(?:volume\s+rm|system\s+prune)\b/i,
  /\bdocker\s+compose\b[\s\S]*\b(down|rm)\b/i,
  /\bdrop\s+(?:table|database)\b/i,
  /\b(?:truncate|delete)\s+from\b/i,
  /\b(?:psql|prisma|rails)\b[\s\S]*\b(?:migrate|restore|reset)\b/i,
  /\bCaddyfile\b/i,
  /\bsystemctl\s+(?:reload|restart)\s+caddy\b/i,
  /\bdocker\s+compose\s+pull\b/i,
];

function isAutonomousRoutineRemote(haystack) {
  return REMOTE_ROUTINE_PATTERN.test(haystack)
    && !REMOTE_DESTRUCTIVE_PATTERNS.some((re) => re.test(haystack));
}

const MCP_PATTERNS = [
  /execute_sql/i,
  /apply_migration/i,
  /deploy/i,
  /delete_/i,
  /\bdrop\b/i,
  /remove_/i,
  /reset_/i,
  /merge_pull_request/i,
  /push_files/i,
  /create_or_update_file/i,
];

function isSensitive(kind, haystack) {
  const patterns = kind === 'shell' ? SHELL_PATTERNS : MCP_PATTERNS;
  return patterns.some((re) => re.test(haystack));
}

// ---------------------------------------------------------------------------
// Telegram API
// ---------------------------------------------------------------------------
function makeTg(token) {
  return async function tg(method, params, extraTimeoutMs = 15000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), extraTimeoutMs);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params || {}),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(`${method}: ${json.description || 'error'}`);
      return json.result;
    } finally {
      clearTimeout(t);
    }
  };
}

function readOffset() {
  try {
    if (existsSync(OFFSET_PATH)) {
      const n = Number(readFileSync(OFFSET_PATH, 'utf8').trim());
      return Number.isFinite(n) ? n : null;
    }
  } catch { /* noop */ }
  return null;
}

function writeOffset(n) {
  try { writeFileSync(OFFSET_PATH, String(n), 'utf8'); } catch { /* noop */ }
}

// ---- Registro de decisiones (comandos en paralelo y clics tardíos) ----
// Cualquier proceso que lea un clic guarda la decisión por reqId; el proceso
// que espera esa solicitud la recoge de aquí aunque el clic lo leyera OTRO
// proceso (esto evita que se "roben" las aprobaciones entre comandos paralelos).
function readDecisions() {
  try {
    if (existsSync(DECISIONS_PATH)) {
      const j = JSON.parse(readFileSync(DECISIONS_PATH, 'utf8'));
      if (j && typeof j === 'object') return j;
    }
  } catch { /* noop */ }
  return {};
}
function recordDecision(reqId, decision) {
  try {
    const all = readDecisions();
    all[reqId] = { decision, ts: Date.now() };
    const cutoff = Date.now() - 30 * 60 * 1000; // limpia entradas > 30 min
    for (const k of Object.keys(all)) if (!all[k] || all[k].ts < cutoff) delete all[k];
    writeFileSync(DECISIONS_PATH, JSON.stringify(all), 'utf8');
  } catch { /* noop */ }
}
function takeDecision(reqId) {
  const all = readDecisions();
  const hit = all[reqId];
  if (!hit) return null;
  try { delete all[reqId]; writeFileSync(DECISIONS_PATH, JSON.stringify(all), 'utf8'); } catch { /* noop */ }
  return hit.decision;
}

// Registro del escucha único (un solo proceso lee Telegram por todos).
function readLock() {
  try {
    if (existsSync(LOCK_PATH)) {
      const j = JSON.parse(readFileSync(LOCK_PATH, 'utf8'));
      if (j && typeof j === 'object') return j;
    }
  } catch { /* noop */ }
  return null;
}
function writeLock() {
  try { writeFileSync(LOCK_PATH, JSON.stringify({ pid: process.pid, heartbeat: Date.now() }), 'utf8'); } catch { /* noop */ }
}
function pidAlive(pid) {
  if (!pid || !Number.isFinite(Number(pid))) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}
function listenerFresh() {
  const l = readLock();
  return !!(l && pidAlive(l.pid) && Date.now() - l.heartbeat < 45000);
}
// Arranca el escucha en segundo plano si no hay uno vivo (detached, no bloquea).
function ensureListener() {
  try {
    if (listenerFresh()) return;
    // Lock huérfano (proceso muerto): bórralo para no engañar a waitForDecision.
    const stale = readLock();
    if (stale && !pidAlive(stale.pid)) {
      try { writeFileSync(LOCK_PATH, JSON.stringify({ pid: 0, heartbeat: 0 }), 'utf8'); } catch { /* noop */ }
      log('LISTEN stale lock cleared pid=' + stale.pid);
    }
    const child = spawn(process.execPath, [__filename, 'listen'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      cwd: dirname(__filename),
    });
    child.unref();
    log('LISTEN spawn attempted');
  } catch (e) {
    log('LISTEN spawn failed ' + (e && e.message ? e.message : e));
  }
}
async function waitForListener(maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (listenerFresh()) return true;
    await sleep(250);
  }
  return listenerFresh();
}

// Responde el botón (para que deje de "parpadear"), guarda la decisión y edita el mensaje.
async function handleCallback(tg, cq) {
  if (!cq || typeof cq.data !== 'string') return;
  const m = cq.data.match(/^(ok|no):(.+)$/);
  if (!m) return;
  const decision = m[1] === 'ok' ? 'allow' : 'deny';
  // 1) Responder el callback CUANTO ANTES para detener el spinner del botón.
  try {
    await tg('answerCallbackQuery', {
      callback_query_id: cq.id,
      text: decision === 'allow' ? 'Aprobado ✅' : 'Denegado ⛔',
    });
  } catch { /* el callback pudo expirar; igual registramos la decisión */ }
  // 2) Registrar la decisión para el proceso que espera este reqId.
  recordDecision(m[2], decision);
  log(`CALLBACK reqId=${m[2]} decision=${decision} from=${cq.from?.id || '?'}`);
  // 3) Editar el mensaje (cosmético).
  try {
    await tg('editMessageText', {
      chat_id: cq.message.chat.id,
      message_id: cq.message.message_id,
      text: `${cq.message.text}\n\n${decision === 'allow' ? '✅ APROBADO' : '⛔ DENEGADO'}`,
    });
  } catch { /* cosmético */ }
}

// Bucle del ESCUCHA único: es el ÚNICO que llama getUpdates. Responde botones
// al instante y guarda las decisiones. Sale solo tras 15 min sin actividad.
async function cliListen(cfg) {
  if (!cfg.token) process.exit(1);
  // Instancia única: si ya hay un escucha fresco (y no soy yo), me retiro.
  const existing = readLock();
  if (existing && existing.pid !== process.pid && Date.now() - existing.heartbeat < 45000) process.exit(0);
  writeLock();
  const tg = makeTg(cfg.token);

  let offset = readOffset();
  if (offset == null) {
    try {
      const pending = await tg('getUpdates', { timeout: 0 }, 15000);
      for (const u of pending) if (u.callback_query) await handleCallback(tg, u.callback_query);
      offset = pending.length ? pending[pending.length - 1].update_id + 1 : 0;
      writeOffset(offset);
    } catch { offset = 0; }
  }

  let lastActivity = Date.now();
  log('LISTEN start pid=' + process.pid);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const l = readLock();
    // Solo cede si el otro escucha está VIVO (pidAlive), no por un heartbeat viejo.
    if (l && l.pid !== process.pid && pidAlive(l.pid) && Date.now() - l.heartbeat < 45000) {
      log('LISTEN exit (otro escucha vivo pid=' + l.pid + ')');
      process.exit(0);
    }
    writeLock();
    // Antes salía a los 15 min sin clics y el siguiente approve fallaba.
    // Ahora permanece vivo; solo registra inactividad larga.
    if (Date.now() - lastActivity > 60 * 60 * 1000) {
      log('LISTEN idle>60m (sigo vivo) pid=' + process.pid);
      lastActivity = Date.now();
    }

    let updates;
    try {
      updates = await tg('getUpdates', { offset, timeout: 25 }, 35000);
    } catch (e) {
      const msg = String(e && e.message ? e.message : e);
      log('LISTEN getUpdates error: ' + msg);
      await sleep(/conflict|409/i.test(msg) ? 3000 : 1500);
      continue;
    }
    for (const u of updates) {
      offset = u.update_id + 1;
      writeOffset(offset);
      if (u.callback_query) {
        await handleCallback(tg, u.callback_query);
        lastActivity = Date.now();
        continue;
      }
      // Mensajes de texto del chat autorizado → ciclo remoto (agente).
      const msg = u.message;
      if (!msg || !msg.text) continue;
      if (String(msg.chat?.id) !== String(cfg.chatId)) continue;
      const text = String(msg.text).trim();
      if (!text) continue;
      lastActivity = Date.now();
      log(`INBOX text from=${msg.from?.id || '?'} len=${text.length}`);
      await handleRemoteCommand(tg, cfg, text);
    }
  }
}

const AGENT_SCRIPT = join(__dirname, '..', '..', 'scripts', 'telegram-agente.mjs');
const BUSY_PATH = join(__dirname, '.telegram-agent-busy.json');
const INBOX_PATH = join(__dirname, '.telegram-inbox.json');

function agentIsBusy() {
  try {
    if (!existsSync(BUSY_PATH)) return false;
    const j = JSON.parse(readFileSync(BUSY_PATH, 'utf8'));
    if (j?.pid && pidAlive(j.pid)) return true;
    // busy huérfano
    try { writeFileSync(BUSY_PATH, JSON.stringify({ pid: 0 }), 'utf8'); } catch { /* noop */ }
    return false;
  } catch {
    return false;
  }
}

function enqueueRemote(text) {
  let list = [];
  try {
    if (existsSync(INBOX_PATH)) list = JSON.parse(readFileSync(INBOX_PATH, 'utf8')) || [];
  } catch { list = []; }
  if (!Array.isArray(list)) list = [];
  list.push({ text, ts: Date.now() });
  writeFileSync(INBOX_PATH, JSON.stringify(list, null, 2), 'utf8');
}

function spawnAgent(text, extraArgs = []) {
  if (!existsSync(AGENT_SCRIPT)) {
    log('AGENT missing script: ' + AGENT_SCRIPT);
    return;
  }
  const args = [AGENT_SCRIPT, ...extraArgs];
  if (text) args.push('--text', text);
  const env = { ...process.env };
  // Completa keys de usuario de Windows si el proceso del escucha no las heredó.
  if (process.platform === 'win32') {
    for (const key of ['CURSOR_API_KEY', 'OPENAI_API_KEY']) {
      if (env[key]) continue;
      try {
        const out = execSync(
          `powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('${key}','User')"`,
          { encoding: 'utf8', windowsHide: true },
        ).trim();
        if (out) env[key] = out;
      } catch { /* noop */ }
    }
  }
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: join(__dirname, '..', '..'),
    env,
  });
  child.on('error', (err) => log('AGENT spawn error: ' + (err?.message || err)));
  child.unref();
  log('AGENT spawn attempted script=' + AGENT_SCRIPT);
}

async function handleRemoteCommand(tg, cfg, text) {
  const lower = text.toLowerCase();
  if (lower === '/ayuda' || lower === '/help' || lower === 'ayuda') {
    await tg('sendMessage', {
      chat_id: cfg.chatId,
      text:
        '🤖 Control remoto Ma Baker (Telegram)\n\n' +
        '• Escribe un pedido en lenguaje natural y el agente trabaja en el repo.\n' +
        '• /nueva — reinicia la conversación del agente\n' +
        '• /estado — ¿está ocupado?\n' +
        '• /ayuda — este mensaje\n\n' +
        'También recibes aquí: aprobaciones ✅/⛔ y resúmenes de voz 🔊',
    });
    return;
  }
  if (lower === '/estado' || lower === '/status') {
    await tg('sendMessage', {
      chat_id: cfg.chatId,
      text: agentIsBusy()
        ? '⏳ Estoy ocupado en una tarea. Puedes encolar otro mensaje.'
        : '✅ Libre. Mándame un pedido cuando quieras.',
    });
    return;
  }
  if (lower === '/nueva' || lower === '/reset' || lower === '/new') {
    spawnAgent('', ['--reset']);
    return;
  }

  if (agentIsBusy()) {
    enqueueRemote(text);
    await tg('sendMessage', {
      chat_id: cfg.chatId,
      text: '📥 Encolado. Lo tomo en cuanto termine la tarea actual.',
    });
    return;
  }
  spawnAgent(text);
}

// Espera la decisión (allow / deny / timeout). Normalmente el ESCUCHA responde los
// botones y aquí solo leemos el archivo de decisiones. Si el escucha no está vivo,
// hacemos un getUpdates de respaldo por nuestra cuenta.
async function waitForDecision(tg, reqId, deadline) {
  const early = takeDecision(reqId);
  if (early) return early;

  while (Date.now() < deadline) {
    const hit = takeDecision(reqId);
    if (hit) return hit;

    if (!listenerFresh()) {
      // Respaldo: no hay escucha; poleamos nosotros mismos brevemente.
      try {
        let offset = readOffset();
        const params = offset == null ? { timeout: 1 } : { offset, timeout: 1 };
        const updates = await tg('getUpdates', params, 8000);
        for (const u of updates) {
          offset = u.update_id + 1;
          writeOffset(offset);
          if (u.callback_query) await handleCallback(tg, u.callback_query);
        }
      } catch { /* 409 u otro: reintentamos en el siguiente ciclo */ }
      const hit2 = takeDecision(reqId);
      if (hit2) return hit2;
    }
    await sleep(900);
  }
  return 'timeout';
}

// ---------------------------------------------------------------------------
// Salidas del hook
// ---------------------------------------------------------------------------
function emit(obj) {
  log(`DECISION ${JSON.stringify(obj)}`);
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 3000); // salvaguarda
  });
}

// ---------------------------------------------------------------------------
// Utilidades CLI (setup / prueba)
// ---------------------------------------------------------------------------
async function cliDebug(cfg) {
  if (!cfg.token) { console.error('Falta el token del bot.'); process.exit(1); }
  const tg = makeTg(cfg.token);
  const wh = await tg('getWebhookInfo', {}, 15000);
  console.log('WebhookInfo:', JSON.stringify(wh));
  const updates = await tg('getUpdates', { timeout: 0 }, 15000);
  console.log('Updates recibidos:', updates.length);
  console.log(JSON.stringify(updates).slice(0, 800));
}

function loadOpenAiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  // Busca .env del repo (dos niveles arriba de .cursor/hooks/).
  const candidates = [
    join(__dirname, '..', '..', '.env'),
    join(process.cwd(), '.env'),
  ];
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      const m = readFileSync(p, 'utf8').match(/^\s*OPENAI_API_KEY\s*=\s*(.+)\s*$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* noop */ }
  }
  return '';
}

async function cliSend(cfg) {
  if (!cfg.token || !cfg.chatId) { console.error('Falta token o chatId en la configuración.'); process.exit(1); }
  const text = (await readStdin()).replace(/^\uFEFF/, '');
  if (!text.trim()) { console.error('Sin texto en stdin para enviar.'); process.exit(1); }
  const tg = makeTg(cfg.token);
  const chunks = text.match(/[\s\S]{1,3900}/g) || [];
  for (const c of chunks) await tg('sendMessage', { chat_id: cfg.chatId, text: c });
  console.log(`Enviado a Telegram (${chunks.length} mensaje(s)).`);
}

/** Genera audio con OpenAI TTS y lo manda al chat (sendAudio + caption). */
async function cliVoice(cfg) {
  if (!cfg.token || !cfg.chatId) { console.error('Falta token o chatId en la configuración.'); process.exit(1); }
  const argText = process.argv.slice(3).join(' ').trim();
  const text = (argText || (await readStdin())).replace(/^\uFEFF/, '').trim();
  if (!text) { console.error('Sin texto para el resumen de voz.'); process.exit(1); }
  const key = loadOpenAiKey();
  if (!key) { console.error('Falta OPENAI_API_KEY (env o .env del repo) para generar el audio.'); process.exit(1); }

  // Telegram caption máx. ~1024; el audio puede narrar más.
  const spoken = text.slice(0, 4000);
  const caption = ('🔊 Resumen CxC / Ma Baker\n\n' + text).slice(0, 1000);

  const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'nova',
      input: spoken,
      response_format: 'mp3',
    }),
  });
  if (!ttsRes.ok) {
    const errBody = await ttsRes.text().catch(() => '');
    console.error('OpenAI TTS falló:', ttsRes.status, errBody.slice(0, 300));
    process.exit(1);
  }
  const buf = Buffer.from(await ttsRes.arrayBuffer());
  const fd = new FormData();
  fd.append('chat_id', String(cfg.chatId));
  fd.append('title', 'Resumen CxC Ma Baker');
  fd.append('caption', caption);
  fd.append('audio', new Blob([buf], { type: 'audio/mpeg' }), 'resumen-mabaker.mp3');
  const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendAudio`, { method: 'POST', body: fd });
  const j = await res.json();
  if (!j.ok) { console.error('Error al enviar audio:', j.description || 'desconocido'); process.exit(1); }
  console.log('Resumen de voz enviado a Telegram.');
}

async function cliSound(cfg) {
  if (!cfg.token || !cfg.chatId) { console.error('Falta token o chatId en la configuración.'); process.exit(1); }
  const file = process.argv[3] || join(__dirname, 'alerta-mabaker.mp3');
  if (!existsSync(file)) { console.error('No existe el archivo de audio: ' + file); process.exit(1); }
  const buf = readFileSync(file);
  const fd = new FormData();
  fd.append('chat_id', String(cfg.chatId));
  fd.append('title', 'Alerta Ma Baker CRM');
  fd.append('caption', '🔔 Tono de alerta. Mantén presionado este audio → “Guardar en notificaciones”, luego ponlo como sonido de este chat.');
  fd.append('audio', new Blob([buf], { type: 'audio/mpeg' }), 'alerta-mabaker.mp3');
  const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendAudio`, { method: 'POST', body: fd });
  const j = await res.json();
  if (!j.ok) { console.error('Error al enviar:', j.description || 'desconocido'); process.exit(1); }
  console.log('Tono enviado a Telegram.');
}

async function cliMe(cfg) {
  if (!cfg.token) { console.error('Falta el token del bot.'); process.exit(1); }
  const tg = makeTg(cfg.token);
  const me = await tg('getMe', {}, 15000);
  console.log(`El token pertenece a: @${me.username}  (nombre: ${me.first_name}, id: ${me.id})`);
  console.log('Asegúrate de escribirle a ESTE bot (@' + me.username + ') en Telegram.');
}

async function cliChatId(cfg) {
  if (!cfg.token) { console.error('Falta el token del bot. Ponlo en telegram-approval.config.json o TELEGRAM_APPROVAL_BOT_TOKEN.'); process.exit(1); }
  const tg = makeTg(cfg.token);
  const updates = await tg('getUpdates', { timeout: 0 }, 15000);
  if (!updates.length) {
    console.log('No hay mensajes recientes. Abre Telegram, envía cualquier texto a tu bot y vuelve a ejecutar este comando.');
    return;
  }
  const seen = new Map();
  for (const u of updates) {
    const chat = u.message?.chat || u.callback_query?.message?.chat;
    if (chat) seen.set(chat.id, `${chat.type} ${chat.title || chat.username || chat.first_name || ''}`.trim());
  }
  console.log('Chats detectados (usa el id en chatId):');
  for (const [id, label] of seen) console.log(`  chatId: ${id}   (${label})`);
}

async function cliTest(cfg) {
  if (!cfg.token || !cfg.chatId) { console.error('Falta token o chatId en la configuración.'); process.exit(1); }
  const tg = makeTg(cfg.token);
  const reqId = Math.random().toString(36).slice(2, 8);
  ensureListener();
  const ready = await waitForListener(8000);
  console.log(ready ? 'Escucha listo.' : 'Aviso: el escucha no confirmó a tiempo; intento de todos modos.');
  await tg('sendMessage', {
    chat_id: cfg.chatId,
    text: '🧪 Prueba de aprobación (Ma Baker CRM)\n\nSi ves esto y los botones, la configuración es correcta.',
    reply_markup: { inline_keyboard: [[
      { text: '✅ Aprobar', callback_data: `ok:${reqId}` },
      { text: '⛔ Denegar', callback_data: `no:${reqId}` },
    ]] },
  });
  console.log('Mensaje de prueba enviado. Pulsa ✅ Aprobar en Telegram (hasta 90s)...');
  const decision = await waitForDecision(tg, reqId, Date.now() + 90000);
  console.log(`Resultado: ${decision}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const arg = (process.argv[2] || 'shell').toLowerCase();
  const cfg = loadConfig();

  if (arg === 'send') return cliSend(cfg);
  if (arg === 'voice' || arg === 'resumen') return cliVoice(cfg);
  if (arg === 'sound') return cliSound(cfg);
  if (arg === 'listen') return cliListen(cfg);
  if (arg === 'debug') return cliDebug(cfg);
  if (arg === 'me') return cliMe(cfg);
  if (arg === 'chatid') return cliChatId(cfg);
  if (arg === 'test') return cliTest(cfg);

  // Modo hook: leer la acción de stdin.
  // Cursor puede anteponer un BOM (\uFEFF) al JSON; hay que quitarlo o JSON.parse falla.
  const raw = await readStdin();
  const rawClean = (raw || '').replace(/^\uFEFF/, '').trim();
  let input = {};
  let parseOk = true;
  try { input = rawClean ? JSON.parse(rawClean) : {}; } catch { input = {}; parseOk = false; }
  log(`HOOK arg=${arg} parseOk=${parseOk} raw=${rawClean.slice(0, 300)}`);

  const kind = arg === 'mcp' ? 'mcp' : 'shell';

  let label;
  let haystack;
  if (kind === 'shell') {
    label = input.command || (parseOk ? '(comando vacío)' : 'comando no legible');
    // Si el parseo falló, escaneamos el texto crudo (fail-safe hacia gatear).
    haystack = parseOk ? String(input.command || '') : rawClean;
  } else {
    const name = input.tool_name || input.name || input.tool || input.method || 'MCP';
    const server = input.server || input.server_name || '';
    label = `${server ? server + ' · ' : ''}${name}`;
    haystack = parseOk
      ? `${label} ${JSON.stringify(input.tool_input || input.arguments || input.args || {})}`
      : rawClean;
  }

  // Deploys rutinarios al VPS conocido tienen autorización persistente.
  if (kind === 'shell' && isAutonomousRoutineRemote(haystack)) {
    emit({ permission: 'allow' });
  }

  // Si no aplica el modo o no es sensible -> dejar pasar
  const gateAll = cfg.mode === 'all';
  if (!gateAll && !isSensitive(kind, haystack)) emit({ permission: 'allow' });

  // Es sensible: necesitamos configuración. Si falta -> delegar al aviso normal del escritorio.
  if (!cfg.token || !cfg.chatId) {
    emit({
      permission: 'ask',
      user_message: 'Acción sensible detectada, pero el bot de Telegram no está configurado. Revísala aquí.',
    });
  }

  const tg = makeTg(cfg.token);
  const reqId = Math.random().toString(36).slice(2, 8);
  const shown = label.length > 600 ? label.slice(0, 600) + ' …' : label;
  const header = kind === 'shell' ? '🖥️ Comando' : '🔌 Acción MCP';
  const expiraMin = Math.max(1, Math.round(cfg.timeoutSeconds / 60));

  // Arranca el escucha único y ESPERA a que esté vivo antes de mandar el mensaje.
  // Si no, el clic puede llegar mientras nadie lee getUpdates y se pierde el ciclo.
  ensureListener();
  const listenerReady = await waitForListener(8000);
  log(`HOOK listenerReady=${listenerReady}`);

  try {
    await tg('sendMessage', {
      chat_id: cfg.chatId,
      text: `⚠️ Aprobación requerida — Ma Baker CRM\n\n${header}:\n${shown}\n\n¿Autorizas ejecutar esto?\n\n⏳ Tienes ~${expiraMin} min para responder.`,
      reply_markup: { inline_keyboard: [[
        { text: '✅ Aprobar', callback_data: `ok:${reqId}` },
        { text: '⛔ Denegar', callback_data: `no:${reqId}` },
      ]] },
    });
  } catch {
    // No se pudo avisar por Telegram -> delegar al escritorio
    emit({ permission: 'ask', user_message: 'No se pudo contactar Telegram. Revisa esta acción aquí.' });
  }

  const decision = await waitForDecision(tg, reqId, Date.now() + cfg.timeoutSeconds * 1000);

  if (decision === 'allow') emit({ permission: 'allow' });
  if (decision === 'deny') {
    emit({
      permission: 'deny',
      user_message: 'Denegado desde Telegram.',
      agent_message: 'El usuario denegó esta acción desde Telegram. No la ejecutes; propón una alternativa o espera nuevas instrucciones.',
    });
  }

  // timeout
  const fallback = cfg.onTimeout === 'allow' ? 'allow' : cfg.onTimeout === 'deny' ? 'deny' : 'ask';
  emit({
    permission: fallback,
    user_message: 'Sin respuesta en Telegram a tiempo.',
    agent_message: 'No hubo respuesta de aprobación en Telegram dentro del tiempo límite.',
  });
}

main().catch(() => {
  // Ante cualquier fallo, no bloquear el trabajo: delegar al aviso del escritorio.
  emit({ permission: 'ask', user_message: 'El hook de aprobación falló; revisa esta acción aquí.' });
});
