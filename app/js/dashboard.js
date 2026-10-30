/* ============================================================
   dashboard.js — Lógica de los Paneles del Sistema Interno
   Ma Baker and Chef | Sistema de Reclutamiento
   ============================================================
   Este archivo maneja:
   - Renderizado de tablas de candidatos, rechazados, vacantes
   - Contadores y estadísticas de cada dashboard
   - Navegación entre paneles por rol
   - Acciones: ver detalle de candidato, cambiar fase, etc.
   ============================================================ */


/* ── Configuración de Supabase ── */
const SUPA_URL = 'https://znskpdixdyxdbvpapqrg.supabase.co';
const SUPA_SRV = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2twZGl4ZHl4ZGJ2cGFwcXJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg1ODgwOCwiZXhwIjoyMDg4NDM0ODA4fQ.s7yC5ODssUgqHjH0PsAhTZuNQ1R-lMuJAt62OKDwryg';


/* Encabezados HTTP que se usan en todas las peticiones a Supabase */
const HEADERS = {
    'apikey': SUPA_SRV,
    'Authorization': 'Bearer ' + SUPA_SRV,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};


/* ── Etiquetas de fases del proceso de selección ── */
const FASES = {
    espera_psicometricos: { label: 'Espera Psicometría', color: '#F59E0B' },
    psicometricos_realizados: { label: 'Psicometría OK', color: '#3B82F6' },
    espera_medico: { label: 'Espera Médico', color: '#8B5CF6' },
    espera_jefe: { label: 'Espera Jefe', color: '#EC4899' },
    induccion_sgi: { label: 'Inducción SGI', color: '#0EA5E9' },
    listo_para_contrato: { label: 'Listo Para Contrato', color: '#10B981' },
    contratado: { label: 'Contratado ✓', color: '#059669' },
    archivado: { label: 'Archivado', color: '#6B7280' },
};


/* ── Etiquetas para el motivo de rechazo ── */
const FILTROS = {
    edad: 'Edad fuera de rango',
    escolaridad: 'Escolaridad insuficiente',
    experiencia: 'Sin experiencia requerida',
    score: 'Score IA bajo',
    privacidad: 'No aceptó privacidad',
    datos_invalidos: 'Datos incompletos',
};


/* ============================================================
   FUNCIÓN PRINCIPAL: initDashboard(rol, endpoints)
   Se llama desde cada página de dashboard al cargarse.
   - rol: 'admin' | 'rrhh' | 'medico' | 'jefe' | 'sgi'
   - endpoints: arreglo de { id, endpoint } con las rutas a consultar
   ============================================================ */
async function initDashboard(rol, endpoints = []) {


    /* 1. Verificar que el usuario tenga sesión activa y el rol correcto */
    const sesion = getSession();
    if (!sesion.token) { window.location.href = 'login.html'; return; }
    if (sesion.rol !== 'admin' && sesion.rol !== rol) {
        window.location.href = 'login.html'; return;
    }


    /* 2. Mostrar el nombre del usuario en el sidebar */
    const userInfoEl = document.getElementById('userInfo');
