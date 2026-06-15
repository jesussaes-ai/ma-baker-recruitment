/**
 * auth.js — Router de Autenticación y RBAC
 * Ma Baker and Chef | Sistema de Reclutamiento
 */

const SUPABASE_URL = 'https://znskpdixdyxdbvpapqrg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2twZGl4ZHl4ZGJ2cGFwcXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTg4MDgsImV4cCI6MjA4ODQzNDgwOH0.MvOASVc-0XkqtfeKp_FBZ4hcE_jFSsGB53KQTTgFRCQ';

const ROLE_ROUTES = {
    admin: 'dashboard-admin.html',
    rrhh: 'dashboard-rrhh.html',
    medico: 'dashboard-medico.html',
    jefe: 'dashboard-jefe.html',
    sgi: 'dashboard-sgi.html',
    seguridad: 'dashboard-seguridad.html',
};

const ROLE_ACCESS = {
    admin: [
        'dashboard-admin.html', 'dashboard-rrhh.html',
        'dashboard-jefe.html', 'dashboard-sgi.html', 'dashboard-seguridad.html',
        'cargar-puestos.html', 'cargar-psicometricos.html', 'ayuda.html',
    ],
    rrhh: ['dashboard-rrhh.html', 'cargar-puestos.html', 'cargar-psicometricos.html', 'ayuda.html'],
    medico: ['dashboard-medico.html', 'ayuda.html'],
    jefe: ['dashboard-jefe.html', 'ayuda.html'],
    sgi: ['dashboard-sgi.html', 'ayuda.html'],
    seguridad: ['dashboard-seguridad.html', 'ayuda.html'],
};

function normalizeRol(rol) {
    return String(rol || '').toLowerCase().trim();
}

/** Normaliza rutas con o sin .html (serve redirige /foo.html → /foo). */
function normalizePageName(page) {
    if (!page || page === '' || page === '/') return 'index.html';
    let p = String(page).split('?')[0].split('#')[0].toLowerCase();
    if (!p.includes('.')) p += '.html';
    return p;
}

function currentPageName() {
    return normalizePageName(window.location.pathname.split('/').pop() || 'index.html');
}

function pageIsAllowed(rol, page) {
    const key = normalizeRol(rol);
    const allowed = ROLE_ACCESS[key] || [];
    const normalized = normalizePageName(page);
    return allowed.some((p) => normalizePageName(p) === normalized);
}

function roleIsAllowed(requiredRol, actualRol) {
    if (!requiredRol) return true;
    const actual = normalizeRol(actualRol);
    if (Array.isArray(requiredRol)) {
        return requiredRol.map(normalizeRol).includes(actual);
    }
    return actual === normalizeRol(requiredRol);
}

function dashboardRouteForRol(rol) {
    return ROLE_ROUTES[normalizeRol(rol)] || 'login.html';
}

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

    const rol = normalizeRol(data.rol);
    localStorage.setItem('mb_token', data.token);
    localStorage.setItem('mb_rol', rol);
    localStorage.setItem('mb_nombre', data.nombre);
    localStorage.setItem('mb_departamento', data.departamento || '');
    localStorage.setItem('mb_expira', data.expira);

    return { ...data, rol };
}

function logout() {
    localStorage.removeItem('mb_token');
    localStorage.removeItem('mb_rol');
    localStorage.removeItem('mb_nombre');
    localStorage.removeItem('mb_departamento');
    localStorage.removeItem('mb_expira');
    window.location.href = 'login.html';
}

async function requireAuth(requiredRol = null) {
    const token = localStorage.getItem('mb_token');
    const expira = localStorage.getItem('mb_expira');
    const rolLocal = normalizeRol(localStorage.getItem('mb_rol'));
    const paginaActual = currentPageName();

    if (!token) {
        window.location.href = 'login.html';
        return null;
    }

    if (expira && new Date() > new Date(expira)) {
        logout();
        return null;
    }

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
        if (!data.ok) {
            logout();
            return null;
        }

        const rol = normalizeRol(data.rol);
        if (!roleIsAllowed(requiredRol, rol)) {
            window.location.href = dashboardRouteForRol(rol);
            return null;
        }

        if (paginaActual !== 'login.html' && !pageIsAllowed(rol, paginaActual)) {
            window.location.href = dashboardRouteForRol(rol);
            return null;
        }

        return { ...data, rol };
    } catch (err) {
        console.warn('Error verificando sesión:', err);
        if (!roleIsAllowed(requiredRol, rolLocal)) {
            window.location.href = dashboardRouteForRol(rolLocal);
            return null;
        }
        if (paginaActual !== 'login.html' && !pageIsAllowed(rolLocal, paginaActual)) {
            window.location.href = dashboardRouteForRol(rolLocal);
            return null;
        }
        return {
            rol: rolLocal,
            nombre: localStorage.getItem('mb_nombre'),
            departamento: localStorage.getItem('mb_departamento'),
        };
    }
}

function getSession() {
    return {
        token: localStorage.getItem('mb_token'),
        rol: normalizeRol(localStorage.getItem('mb_rol')),
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
        sgi: '📋 Sistema de Gestión Integral (Calidad)',
        seguridad: '🦺 Seguridad e Higiene',
    };
    return labels[normalizeRol(rol)] || rol;
}

if (typeof module !== 'undefined') {
    module.exports = { login, logout, requireAuth, getSession, ROLE_ROUTES, normalizePageName, currentPageName };
}
