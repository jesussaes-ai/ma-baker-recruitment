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
    if (userInfoEl) {
        userInfoEl.innerHTML = `
            <div style="font-size:12px;color:#94A3B8;font-weight:500;">
                ${getRolLabel(sesion.rol)}<br>
                <strong style="color:white;font-size:13px;">${sesion.nombre || 'Usuario'}</strong>
            </div>`;
    }

    /* 3. Activar navegación por pestañas del sidebar */
    document.querySelectorAll('.nav-item[data-panel]').forEach(enlace => {
        enlace.addEventListener('click', e => {
            e.preventDefault();
            const panel = enlace.dataset.panel;
            activarPanel(panel, enlace);
        });
    });

    /* 4. Cargar estadísticas rápidas según el rol */
    await cargarEstadisticas(rol);

    /* 5. Cargar cada tabla de datos configurada en el dashboard */
    for (const ep of endpoints) {
        await cargarTabla(ep.id, ep.endpoint);
    }

    /* 6. También cargar el resumen reciente (últimos 5 registros) para el panel de inicio */
    await cargarResumenReciente();
}

/* ============================================================
   ACTIVAR PANEL — Muestra el panel seleccionado y oculta los demás
   ============================================================ */
function activarPanel(nombrePanel, enlaceActivo) {
    /* Ocultar todos los paneles */
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    /* Quitar clase activa de todos los enlaces del sidebar */
    document.querySelectorAll('.nav-item[data-panel]').forEach(a => a.classList.remove('active'));

    /* Mostrar el panel seleccionado */
    const panelEl = document.getElementById('panel-' + nombrePanel);
    if (panelEl) panelEl.classList.add('active');

    /* Marcar el enlace como activo */
    if (enlaceActivo) enlaceActivo.classList.add('active');

    /* Actualizar el título del encabezado del dashboard */
    const titulo = document.getElementById('panelTitle');
    if (titulo && enlaceActivo) titulo.textContent = enlaceActivo.textContent.trim();
}

/* ============================================================
   ESTADÍSTICAS — Carga los contadores para el resumen
   ============================================================ */
async function cargarEstadisticas(rol) {
    try {
        /* Contar candidatos activos */
        const candidatos = await fetch(`${SUPA_URL}/rest/v1/candidatos_activos?select=id,fase_actual`, { headers: HEADERS }).then(r => r.json());

        /* Contar prospectos rechazados */
        const rechazados = await fetch(`${SUPA_URL}/rest/v1/prospectos_rechazados?select=id`, { headers: HEADERS }).then(r => r.json());

        /* Mostrar contador de candidatos */
        const elCand = document.getElementById('statCandidatos');
        if (elCand) elCand.textContent = (candidatos || []).length;

        /* Mostrar contador de rechazados */
        const elRech = document.getElementById('statRechazados');
        if (elRech) elRech.textContent = (rechazados || []).length;

        /* Contar pendientes de psicométricos */
        const enPsico = (candidatos || []).filter(c => c.fase_actual === 'espera_psicometricos').length;
        const elPsico = document.getElementById('statPsico');
        if (elPsico) elPsico.textContent = enPsico;

        /* Contar pendientes de médico */
        const enMedico = (candidatos || []).filter(c => c.fase_actual === 'espera_medico').length;
        const elMed = document.getElementById('statMedico');
        if (elMed) elMed.textContent = enMedico;

        /* Contar pendientes de jefe de área */
        const enJefe = (candidatos || []).filter(c => c.fase_actual === 'espera_jefe').length;
        const elJefe = document.getElementById('statJefe');
        if (elJefe) elJefe.textContent = enJefe;

        /* Contar listos para contrato */
        const listos = (candidatos || []).filter(c => c.fase_actual === 'listo_para_contrato').length;
        const elContr = document.getElementById('statContratos');
        if (elContr) elContr.textContent = listos;

    } catch (err) {
        console.warn('[dashboard] Error cargando estadísticas:', err);
    }
}

/* ============================================================
   CARGAR TABLA GENÉRICA — Consulta Supabase y pinta la tabla
   - idContenedor: ID del div donde se renderiza la tabla
   - endpoint: ruta de la API de Supabase a consultar
   ============================================================ */
async function cargarTabla(idContenedor, endpoint) {
    const contenedor = document.getElementById('tabla' + capitalizar(idContenedor));
    if (!contenedor) return;

    /* Mostrar indicador de carga */
    contenedor.innerHTML = '<div class="loading-row">⏳ Cargando datos…</div>';

    try {
        const resp = await fetch(SUPA_URL + endpoint, { headers: HEADERS });
        const datos = await resp.json();

        if (!datos || datos.length === 0) {
            contenedor.innerHTML = '<div class="loading-row">📭 Sin registros por el momento</div>';
            return;
        }

        /* Renderizar según el tipo de tabla */
        if (idContenedor === 'candidatos') {
            contenedor.innerHTML = renderTablaCandidatos(datos);
        } else if (idContenedor === 'rechazados') {
            contenedor.innerHTML = renderTablaRechazados(datos);
        } else if (idContenedor === 'vacantes') {
            contenedor.innerHTML = renderTablaVacantes(datos);
        } else if (idContenedor === 'logs') {
            contenedor.innerHTML = renderTablaLogs(datos);
        } else {
            /* Tabla genérica: mostrar todos los campos */
            contenedor.innerHTML = renderTablaGenerica(datos);
        }

    } catch (err) {
        console.error('[dashboard] Error cargando tabla ' + idContenedor, err);
        contenedor.innerHTML = '<div class="loading-row">❌ Error al cargar. Revisa la conexión a Supabase.</div>';
    }
}

/* ============================================================
   RENDERIZADORES DE TABLAS
   ============================================================ */

/* ── Tabla de Candidatos Activos ── */
function renderTablaCandidatos(datos) {
    return `
    <table class="data-table">
        <thead>
            <tr>
                <th>Candidato</th>
                <th>Puesto</th>
                <th>Score IA</th>
                <th>Fase Actual</th>
                <th>Fecha</th>
                <th>Acción</th>
            </tr>
        </thead>
        <tbody>
            ${datos.map(c => {
        const fase = FASES[c.fase_actual] || { label: c.fase_actual, color: '#6B7280' };
        const pct = c.match_score || 0;
        const colorScore = pct >= 90 ? '#10B981' : pct >= 75 ? '#F59E0B' : '#EF4444';
        return `
                <tr>
                    <td>
                        <strong>${c.nombre_completo}</strong><br>
                        <small style="color:#94A3B8;">${c.email || ''}</small>
                    </td>
                    <td>${c.nombre_puesto || c.codigo_puesto || '—'}</td>
                    <td>
                        <span style="font-weight:800;color:${colorScore};font-size:16px;">${pct}%</span>
                    </td>
                    <td>
                        <span class="badge-fase" style="background:${fase.color}20;color:${fase.color};font-size:11px;padding:4px 10px;border-radius:30px;font-weight:700;">
                            ${fase.label}
                        </span>
                    </td>
                    <td style="font-size:12px;color:#94A3B8;">${formatFecha(c.created_at)}</td>
                    <td>
                        <button class="btn-table" onclick="verDetalle('${c.id}','candidatos')">Ver</button>
                    </td>
                </tr>`;
    }).join('')}
        </tbody>
    </table>`;
}

/* ── Tabla de Prospectos Rechazados ── */
function renderTablaRechazados(datos) {
    return `
    <table class="data-table">
        <thead>
            <tr>
                <th>Prospecto</th>
                <th>Puesto Solicitado</th>
                <th>Score</th>
                <th>Motivo de Rechazo</th>
                <th>Fecha</th>
            </tr>
        </thead>
        <tbody>
            ${datos.map(r => {
        const pct = r.match_score || 0;
        const motivo = FILTROS[r.filtro_fallido] || r.filtro_fallido || '—';
        return `
                <tr>
                    <td>
                        <strong>${r.nombre_completo}</strong><br>
                        <small style="color:#94A3B8;">${r.email || ''}</small>
                    </td>
                    <td>${r.nombre_puesto || r.codigo_puesto || '—'}</td>
                    <td>
                        <span style="font-weight:800;color:#EF4444;font-size:15px;">${pct}%</span>
                    </td>
                    <td>
                        <span style="background:#FEE2E2;color:#991B1B;font-size:11px;padding:3px 9px;border-radius:30px;font-weight:700;">
                            ${motivo}
                        </span>
                    </td>
                    <td style="font-size:12px;color:#94A3B8;">${formatFecha(r.created_at)}</td>
                </tr>`;
    }).join('')}
        </tbody>
    </table>`;
}

/* ── Tabla del Catálogo de Puestos ── */
function renderTablaVacantes(datos) {
    return `
    <table class="data-table">
        <thead>
            <tr>
                <th>Código</th>
                <th>Puesto</th>
                <th>Departamento</th>
                <th>Escolaridad Mín.</th>
                <th>Experiencia</th>
                <th>Sueldo</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            ${datos.map(v => `
            <tr>
                <td><span style="font-family:monospace;font-weight:700;color:#0071BC;">${v.codigo_puesto}</span></td>
                <td><strong>${v.nombre_puesto}</strong></td>
                <td>${v.departamento}</td>
                <td>${capitalizar(v.escolaridad_minima)}</td>
                <td>${v.experiencia_minima_anios > 0 ? v.experiencia_minima_anios + ' año(s)' : 'Sin exp.'}</td>
                <td style="font-size:12px;">
                    ${v.sueldo_minimo ? '$' + Number(v.sueldo_minimo).toLocaleString('es-MX') + ' - $' + Number(v.sueldo_maximo).toLocaleString('es-MX') : '—'}
                </td>
                <td>
                    <span style="background:${v.activo ? '#D1FAE5' : '#FEE2E2'};color:${v.activo ? '#065F46' : '#991B1B'};font-size:11px;padding:3px 9px;border-radius:30px;font-weight:700;">
                        ${v.activo ? 'Activa' : 'Inactiva'}
                    </span>
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

/* ── Tabla del Log del Agente IA ── */
function renderTablaLogs(datos) {
    const decisionIconos = { PROMOTE: '✅', ARCHIVE: '📂', UPDATE_PHASE: '🔄', AUDIT_PASS: '✔', AUDIT_FAIL: '❌' };
    return `
    <table class="data-table">
        <thead>
            <tr>
                <th>Candidato</th>
                <th>Puesto</th>
                <th>Decisión</th>
                <th>Score</th>
                <th>Skill Usada</th>
                <th>Fecha</th>
            </tr>
        </thead>
        <tbody>
            ${datos.map(l => `
            <tr>
                <td>${l.nombre_candidato || '—'}</td>
                <td style="font-family:monospace;font-size:12px;">${l.codigo_puesto || '—'}</td>
                <td>
                    <span style="font-weight:700;">${decisionIconos[l.decision] || '❓'} ${l.decision}</span>
                </td>
                <td><strong>${l.score || '—'}%</strong></td>
                <td style="font-size:11px;color:#94A3B8;">${l.skill_usada || '—'}</td>
                <td style="font-size:12px;color:#94A3B8;">${formatFecha(l.created_at)}</td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

/* ── Tabla Genérica (para tablas sin renderizador específico) ── */
function renderTablaGenerica(datos) {
    if (!datos.length) return '<div class="loading-row">Sin datos</div>';
    const columnas = Object.keys(datos[0]).filter(k => !['id', 'decision_agente', 'respuestas', 'input_payload', 'output_payload'].includes(k));
    return `
    <table class="data-table">
        <thead><tr>${columnas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>
            ${datos.map(d => `<tr>${columnas.map(c => `<td>${d[c] ?? '—'}</td>`).join('')}</tr>`).join('')}
        </tbody>
    </table>`;
}

/* ============================================================
   CARGAR RESUMEN RECIENTE — Últimos 5 candidatos y logs
   ============================================================ */
async function cargarResumenReciente() {
    /* Últimos 5 candidatos para la pantalla de inicio */
    const elRecCand = document.getElementById('recentCandidatos');
    if (elRecCand) {
        const ultimos = await fetch(
            `${SUPA_URL}/rest/v1/candidatos_activos?select=id,nombre_completo,nombre_puesto,match_score,fase_actual,created_at&order=created_at.desc&limit=5`,
            { headers: HEADERS }
        ).then(r => r.json()).catch(() => []);
        elRecCand.innerHTML = ultimos.length ? renderTablaCandidatos(ultimos) : '<div class="loading-row">Sin candidatos aún</div>';
    }

    /* Últimos 5 registros del log del agente IA */
    const elRecLogs = document.getElementById('recentLogs');
    if (elRecLogs) {
        const ultimosLogs = await fetch(
            `${SUPA_URL}/rest/v1/log_agente?select=*&order=created_at.desc&limit=5`,
            { headers: HEADERS }
        ).then(r => r.json()).catch(() => []);
        elRecLogs.innerHTML = ultimosLogs.length ? renderTablaLogs(ultimosLogs) : '<div class="loading-row">Sin registros de IA aún</div>';
    }
}

/* ============================================================
   VER DETALLE DE UN CANDIDATO
   Abre un modal con todos los datos del candidato seleccionado
   ============================================================ */
async function verDetalle(id, tabla = 'candidatos_activos') {
    const ruta = tabla === 'candidatos' ? 'candidatos_activos' : tabla;
    const datos = await fetch(
        `${SUPA_URL}/rest/v1/${ruta}?id=eq.${id}&select=*`,
        { headers: HEADERS }
    ).then(r => r.json()).catch(() => null);

    if (!datos || !datos.length) { alert('No se pudo cargar el detalle.'); return; }
    const c = datos[0];

    /* Crear modal de detalle dinámicamente */
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;width:100%;max-width:640px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="padding:20px 24px;border-bottom:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
                <strong style="font-size:16px;font-family:'Montserrat',sans-serif;">👤 ${c.nombre_completo}</strong>
                <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
            </div>
            <div style="padding:20px 24px;font-family:'Montserrat',sans-serif;font-size:13px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    ${renderCampo('Puesto', c.nombre_puesto || c.codigo_puesto)}
                    ${renderCampo('Score IA', (c.match_score || 0) + '%')}
                    ${renderCampo('Email', c.email)}
                    ${renderCampo('Teléfono', c.telefono)}
                    ${renderCampo('Escolaridad', c.escolaridad)}
                    ${renderCampo('Carrera', c.carrera)}
                    ${renderCampo('CURP', c.curp)}
                    ${renderCampo('RFC', c.rfc)}
                    ${c.fase_actual ? renderCampo('Fase', (FASES[c.fase_actual] || {}).label || c.fase_actual) : ''}
                    ${c.filtro_fallido ? renderCampo('Motivo Rechazo', FILTROS[c.filtro_fallido] || c.filtro_fallido) : ''}
                </div>
                <div style="margin-top:16px;padding-top:16px;border-top:1px solid #F1F5F9;">
                    <strong>Historial Laboral</strong>
                    ${[1, 2, 3].map(n => c['empresa_' + n] ? `
                        <div style="margin-top:8px;padding:10px;background:#F8FAFC;border-radius:8px;">
                            <strong>${c['empresa_' + n]}</strong> — ${c['puesto_' + n] || ''}<br>
                            <small style="color:#94A3B8;">Antigüedad: ${c['antiguedad_' + n] || '—'} | Motivo salida: ${c['motivo_salida_' + n] || '—'}</small>
                        </div>` : '').join('')}
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    /* Cerrar al hacer clic fuera del modal */
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function renderCampo(etiqueta, valor) {
    if (!valor) return '';
    return `<div style="margin-bottom:4px;"><div style="font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;">${etiqueta}</div><div style="font-weight:600;">${valor}</div></div>`;
}

/* ============================================================
   HELPERS GENERALES
   ============================================================ */

/* Activar/desactivar sidebar en móvil */
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('open');
}

/* Capitalizar la primera letra de un texto */
function capitalizar(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* Formatear una fecha ISO a formato legible en México */
function formatFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* Obtener la sesión del localStorage (delegado a auth.js) */
function getSession() {
    return {
        token: localStorage.getItem('mb_token'),
        rol: localStorage.getItem('mb_rol'),
        nombre: localStorage.getItem('mb_nombre'),
        departamento: localStorage.getItem('mb_departamento'),
    };
}

/* Obtener etiqueta de rol (delegado a auth.js) */
function getRolLabel(rol) {
    const etiquetas = {
        admin: '⚙️ Admin General',
        rrhh: '👥 RRHH',
        medico: '🏥 Médico',
        jefe: '🏢 Jefe de Área',
        sgi: '✅ SGI / Seguridad'
    };
    return etiquetas[rol] || rol;
}

/* Cerrar sesión (delegado a auth.js) */
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
