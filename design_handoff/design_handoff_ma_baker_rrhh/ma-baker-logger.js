/**
 * Ma Baker — Logger Centralizado
 * ===============================
 * Captura logs/errores en localStorage y opcionalmente los persiste en Supabase.
 * Captura errores no manejados automáticamente.
 *
 * Uso:
 *   <script src="ma-baker-logger.js"></script>
 *   MaBakerLogger.init({ supabase: sb }); // opcional
 *   MaBakerLogger.info('App iniciada');
 *   MaBakerLogger.error('Falló subida', { detail: '...' });
 *   const logs = MaBakerLogger.getAll();
 *   MaBakerLogger.export(); // descarga JSON
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'mabaker_logs_v1';
  const MAX_LOGS = 500; // Buffer circular

  let supabaseClient = null;
  let persistRemote = false;

  function getLogs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveLogs(logs) {
    // Mantener solo los últimos MAX_LOGS
    const trimmed = logs.slice(-MAX_LOGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      // localStorage lleno → vaciar y reintentar
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed.slice(-100)));
      } catch {}
    }
  }

  function log(level, message, context) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      message: String(message),
      context: context || null,
      page: location.pathname.split('/').pop() || 'unknown',
      ua: navigator.userAgent.substring(0, 100)
    };
    const logs = getLogs();
    logs.push(entry);
    saveLogs(logs);

    // Echo a consola con color según nivel
    const styles = {
      debug: 'color:#94a3b8',
      info:  'color:#3b82f6',
      warn:  'color:#f59e0b;font-weight:bold',
      error: 'color:#dc2626;font-weight:bold'
    };
    console.log(`%c[MaBaker:${level}] ${message}`, styles[level] || '', context || '');

    // Persistir remoto si está habilitado y es error
    if (persistRemote && supabaseClient && (level === 'error' || level === 'warn')) {
      try {
        supabaseClient.from('mabaker_logs').insert([entry]).then(() => {});
      } catch {}
    }
    return entry;
  }

  function init(opts) {
    opts = opts || {};
    supabaseClient = opts.supabase || null;
    persistRemote = opts.persistRemote === true;

    // Capturar errores globales
    window.addEventListener('error', (e) => {
      log('error', 'Uncaught error: ' + (e.message || 'unknown'), {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error && e.error.stack ? e.error.stack.substring(0, 500) : null
      });
    });

    // Capturar promesas rechazadas
    window.addEventListener('unhandledrejection', (e) => {
      log('error', 'Unhandled promise rejection', {
        reason: e.reason ? String(e.reason).substring(0, 500) : 'unknown'
      });
    });

    log('info', 'Logger inicializado', { persistRemote });
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    log('info', 'Logs locales borrados');
  }

  function exportJSON() {
    const logs = getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mabaker-logs-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    return logs.length;
  }

  function getStats() {
    const logs = getLogs();
    const stats = { total: logs.length, debug: 0, info: 0, warn: 0, error: 0 };
    logs.forEach(l => stats[l.level] !== undefined && stats[l.level]++);
    return stats;
  }

  global.MaBakerLogger = {
    init,
    debug: (m, c) => log('debug', m, c),
    info:  (m, c) => log('info', m, c),
    warn:  (m, c) => log('warn', m, c),
    error: (m, c) => log('error', m, c),
    getAll: getLogs,
    getStats,
    clear,
    export: exportJSON
  };
})(window);
