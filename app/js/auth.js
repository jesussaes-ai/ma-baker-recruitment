/**
 * auth.js — Router de Autenticación y RBAC
 * Ma Baker and Chef | Sistema de Reclutamiento
 */

const SUPABASE_URL = 'https://znskpdixdyxdbvpapqrg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2twZGl4ZHl4ZGJ2cGFwcXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTg4MDgsImV4cCI6MjA4ODQzNDgwOH0.MvOASVc-0XkqtfeKp_FBZ4hcE_jFSsGB53KQTTgFRCQ';

/* ── Mapa de Rutas por Rol ── */
/* ─────────────────────────────────────────────────────
   RUTAS POR ROL — Cada rol llega a su propio dashboard.
   'sgi'       → Sistema de Gestión Integral de Calidad (BPM, calidad, normas)
   'seguridad' → Seguridad e Higiene (EPP, protocolos, accidentes, IMSS)
───────────────────────────────────────────────────── */
const ROLE_ROUTES = {
    admin: 'dashboard-admin.html',
    rrhh: 'dashboard-rrhh.html',
    medico: 'dashboard-medico.html',
    jefe: 'dashboard-jefe.html',
    sgi: 'dashboard-sgi.html',       // Calidad e inocuidad
    seguridad: 'dashboard-seguridad.html', // Seguridad e Higiene
};

/* ─────────────────────────────────────────────────────
   PÁGINAS ACCESIBLES POR ROL
   El admin puede entrar a todos los dashboards.
   Cada otro rol solo entra a su propia pantalla.
───────────────────────────────────────────────────── */
const ROLE_ACCESS = {
    admin: ['dashboard-admin.html', 'dashboard-rrhh.html', 'dashboard-medico.html',
        'dashboard-jefe.html', 'dashboard-sgi.html', 'dashboard-seguridad.html',
        'cargar-puestos.html', 'cargar-psicometricos.html'],
    rrhh: ['dashboard-rrhh.html', 'cargar-puestos.html', 'cargar-psicometricos.html'],
    medico: ['dashboard-medico.html'],
    jefe: ['dashboard-jefe.html'],
    sgi: ['dashboard-sgi.html'],       // Solo Calidad / SGI
    seguridad: ['dashboard-seguridad.html'], // Solo Seguridad e Higiene
};

/* ─────────────────────────────
   LOGIN
───────────────────────────── */
async function login(email, password) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_login`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_email: email.toLowerCase().trim(), p_password: password }),
    });

    const data = await resp.json();

    if (!data.ok) throw new Error(data.error || 'Error de autenticación');

    // Guardar sesión en localStorage
    localStorage.setItem('mb_token', data.token);
    localStorage.setItem('mb_rol', data.rol);
    localStorage.setItem('mb_nombre', data.nombre);
    localStorage.setItem('mb_departamento', data.departamento || '');
    localStorage.setItem('mb_expira', data.expira);

    return data;
}

/* ─────────────────────────────
   LOGOUT
───────────────────────────── */
function logout() {
    localStorage.removeItem('mb_token');
    localStorage.removeItem('mb_rol');
    localStorage.removeItem('mb_nombre');
    localStorage.removeItem('mb_departamento');
    localStorage.removeItem('mb_expira');
    window.location.href = 'login.html';
}

/* ─────────────────────────────
   VERIFICAR SESIÓN
   Llamar al inicio de cada dashboard
───────────────────────────── */
async function requireAuth(requiredRol = null) {
    const token = localStorage.getItem('mb_token');
    const expira = localStorage.getItem('mb_expira');
    const rol = localStorage.getItem('mb_rol');

    // Sin token → redirigir a login
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }

    // Sesión expirada localmente
    if (expira && new Date() > new Date(expira)) {
        logout();
        return null;
    }

    // Verificar con servidor
    try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_verificar_sesion`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_token: token }),
        });

        const data = await resp.json();
        if (!data.ok) { logout(); return null; }

        // Verificar acceso a la página actual
        const paginaActual = window.location.pathname.split('/').pop();
        const accesosPermitidos = ROLE_ACCESS[data.rol] || [];

        if (paginaActual !== 'login.html' && !accesosPermitidos.includes(paginaActual)) {
            // No tiene acceso → redirigir a su dashboard
            window.location.href = ROLE_ROUTES[data.rol] || 'login.html';
            return null;
        }

        return data;
    } catch (err) {
        console.warn('Error verificando sesión:', err);
        // Usar datos locales si hay fallo de red
        return { rol, nombre: localStorage.getItem('mb_nombre'), departamento: localStorage.getItem('mb_departamento') };
    }
}

/* ─────────────────────────────
   HELPERS
───────────────────────────── */
function getSession() {
    return {
        token: localStorage.getItem('mb_token'),
        rol: localStorage.getItem('mb_rol'),
        nombre: localStorage.getItem('mb_nombre'),
        departamento: localStorage.getItem('mb_departamento'),
    };
}

function getRolLabel(rol) {
    const labels = {
        admin: '⚙️ Admin General',
        rrhh: '👥 Reclutamiento y Selección',
        medico: '🏥 Médico Empresarial',
        jefe: '🏢 Jefe de Área',
        sgi: '📋 Sistema de Gestión Integral (Calidad)',  // SGI — BPM, calidad, normas
        seguridad: '🦺 Seguridad e Higiene',                   // S&H — EPP, protocolos
    };
    return labels[rol] || rol;
}

// Exportar para uso en dashboards
if (typeof module !== 'undefined') {
    module.exports = { login, logout, requireAuth, getSession, ROLE_ROUTES };
}
