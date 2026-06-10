/**
 * theme.js — Tema dinámico Claro/Oscuro para Ma Baker & Chef
 * Se aplica automáticamente en todas las páginas al incluir este script.
 * La preferencia se guarda en localStorage bajo la clave 'mb_theme'.
 */

(function () {
    // ── 1. Leer la preferencia guardada (por default: oscuro = diseño original) ──
    const savedTheme = localStorage.getItem('mb_theme') || 'dark';
    applyTheme(savedTheme);

    // ── 2. Inyectar el botón flotante de cambio de tema al cargar el DOM ──
    document.addEventListener('DOMContentLoaded', function () {
        injectThemeToggle();
        injectHelpButton();
        injectBrandLogo();
    });

    /**
     * Aplica el tema en el elemento <html> y guarda la preferencia.
     * @param {'light'|'dark'} theme
     */
    function applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
            root.classList.add('light-mode');
            root.classList.remove('dark-mode');
        } else {
            root.setAttribute('data-theme', 'dark');
            root.classList.add('dark-mode');
            root.classList.remove('light-mode');
        }
        localStorage.setItem('mb_theme', theme);

        // Actualizar ícono si el botón ya existe
        const btn = document.getElementById('mb-theme-toggle');
        if (btn) {
            const icon = btn.querySelector('.theme-icon');
            const label = btn.querySelector('.theme-label');
            if (icon) icon.textContent = theme === 'light' ? '🌙' : '☀️';
            if (label) label.textContent = theme === 'light' ? 'Modo Oscuro' : 'Modo Claro';
        }
    }

    /**
     * Alterna entre tema claro y oscuro.
     */
    function toggleTheme() {
        const current = localStorage.getItem('mb_theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    }

    /**
     * Crea e inyecta el botón flotante de cambio de tema en el DOM.
     */
    function injectThemeToggle() {
        if (document.getElementById('mb-theme-toggle')) return;

        const current = localStorage.getItem('mb_theme') || 'dark';

        const btn = document.createElement('button');
        btn.id = 'mb-theme-toggle';
        btn.setAttribute('title', 'Cambiar tema');
        btn.innerHTML = `
            <span class="theme-icon">${current === 'light' ? '🌙' : '☀️'}</span>
            <span class="theme-label">${current === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
        `;
        btn.onclick = toggleTheme;

        // Estilos del botón flotante (independiente de Tailwind/glassmorphism)
        const style = document.createElement('style');
        style.textContent = `
            #mb-theme-toggle {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 18px;
                border: none;
                border-radius: 999px;
                cursor: pointer;
                font-family: 'Montserrat', sans-serif;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.02em;
                box-shadow: 0 4px 20px rgba(0,0,0,0.25);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                user-select: none;
            }
            #mb-theme-toggle:hover {
                transform: translateY(-2px) scale(1.04);
                box-shadow: 0 8px 28px rgba(0,0,0,0.3);
            }
            #mb-theme-toggle:active {
                transform: scale(0.97);
            }
            .theme-icon { font-size: 16px; }

            /* Colores según el tema activo */
            html[data-theme="dark"] #mb-theme-toggle {
                background: #FFFFFF;
                color: #1E293B;
            }
            html[data-theme="light"] #mb-theme-toggle {
                background: #1E293B;
                color: #FFFFFF;
            }

            /* ───────────────────────────────────────────────
               VARIABLES DE TEMA CLARO
            ─────────────────────────────────────────────── */
            html[data-theme="light"] {
                --mb-red: #D7282F;
                --mb-blue: #0071BC;
                --bg-main: #F1F5F9;
                --bg-surface: #FFFFFF;
                --bg-surface2: #F8FAFC;
                --bg-card: #FFFFFF;
                --text-primary: #1E293B;
                --text-secondary: #475569;
                --text-muted: #64748B;
                --border-color: #E2E8F0;
                --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
            }

            /* ───────────────────────────────────────────────
               VARIABLES DE TEMA OSCURO
            ─────────────────────────────────────────────── */
            html[data-theme="dark"] {
                --mb-red: #D7282F;
                --mb-blue: #0071BC;
                --bg-main: #0F172A;
                --bg-surface: #1E293B;
                --bg-surface2: #334155;
                --bg-card: rgba(255,255,255,0.05);
                --text-primary: #F8FAFC;
                --text-secondary: #CBD5E1;
                --text-muted: #64748B;
                --border-color: rgba(255,255,255,0.1);
                --shadow: 0 4px 24px rgba(0,0,0,0.4);
            }

            /* ───────────────────────────────────────────────
               OVERRIDES PARA TEMA CLARO
            ─────────────────────────────────────────────── */
            html[data-theme="light"] body {
                background: var(--bg-main) !important;
                color: var(--text-primary) !important;
            }
            html[data-theme="light"] .glass-panel,
            html[data-theme="light"] .glass-card {
                background: var(--bg-surface) !important;
                backdrop-filter: none !important;
                border: 1px solid var(--border-color) !important;
                box-shadow: var(--shadow) !important;
            }
            html[data-theme="light"] .bg-slate-950,
            html[data-theme="light"] .bg-slate-900,
            html[data-theme="light"] .bg-slate-800 {
                background-color: var(--bg-main) !important;
            }
            html[data-theme="light"] .text-white {
                color: var(--text-primary) !important;
            }
            html[data-theme="light"] .text-slate-300,
            html[data-theme="light"] .text-slate-400 {
                color: var(--text-secondary) !important;
            }
            html[data-theme="light"] .text-slate-500,
            html[data-theme="light"] .text-slate-600 {
                color: var(--text-muted) !important;
            }
            html[data-theme="light"] .bg-white\/5,
            html[data-theme="light"] .bg-white\/10,
            html[data-theme="light"] .bg-white\/20,
            html[data-theme="light"] .bg-black\/20,
            html[data-theme="light"] .bg-black\/40 {
                background-color: var(--bg-surface2) !important;
            }
            html[data-theme="light"] .border-white\/5,
            html[data-theme="light"] .border-white\/10,
            html[data-theme="light"] .border-white\/20 {
                border-color: var(--border-color) !important;
            }
            html[data-theme="light"] input,
            html[data-theme="light"] select,
            html[data-theme="light"] textarea {
                background: var(--bg-surface2) !important;
                border-color: var(--border-color) !important;
                color: var(--text-primary) !important;
            }
            html[data-theme="light"] input:focus,
            html[data-theme="light"] select:focus {
                border-color: var(--mb-red) !important;
                background: #fff !important;
                box-shadow: 0 0 0 3px rgba(215,40,47,0.12) !important;
            }
            html[data-theme="light"] header,
            html[data-theme="light"] nav {
                background: var(--bg-surface) !important;
                border-bottom: 1px solid var(--border-color) !important;
                box-shadow: 0 1px 6px rgba(0,0,0,0.07) !important;
            }
            html[data-theme="light"] table { background: var(--bg-surface) !important; }
            html[data-theme="light"] thead { background: var(--bg-surface2) !important; }
            html[data-theme="light"] th,
            html[data-theme="light"] td { 
                color: var(--text-primary) !important; 
                border-color: var(--border-color) !important;
            }
            html[data-theme="light"] tbody tr:hover {
                background: rgba(215,40,47,0.04) !important;
            }
            html[data-theme="light"] footer {
                background: var(--bg-surface) !important;
                border-top: 1px solid var(--border-color) !important;
                color: var(--text-muted) !important;
            }
            html[data-theme="light"] .role-btn {
                background: var(--bg-surface2) !important;
                border-color: var(--border-color) !important;
                color: var(--text-primary) !important;
            }
            html[data-theme="light"] .role-btn:hover {
                background: rgba(215,40,47,0.08) !important;
                border-color: var(--mb-red) !important;
            }
            /* Fondo de login en modo claro */
            html[data-theme="light"] body.login-page,
            html[data-theme="light"] body:has(#loginForm) {
                background: linear-gradient(145deg, #f1f5f9 0%, #e8f0f8 100%) !important;
            }
            html[data-theme="light"] .glass-card {
                color: var(--text-primary) !important;
            }
            html[data-theme="light"] .glass-card h1,
            html[data-theme="light"] .glass-card header h1 {
                color: var(--mb-red) !important;
            }
            html[data-theme="light"] .glass-card p,
            html[data-theme="light"] .glass-card label {
                color: var(--text-secondary) !important;
            }
            /* Barra de scroll en modo claro */
            html[data-theme="light"] ::-webkit-scrollbar-track { background: var(--bg-surface2); }
            html[data-theme="light"] ::-webkit-scrollbar-thumb { background: #CBD5E1; }
            html[data-theme="light"] ::-webkit-scrollbar-thumb:hover { background: var(--mb-red); }

            /* Sidebar en modo claro */
            html[data-theme="light"] aside,
            html[data-theme="light"] .sidebar {
                background: var(--bg-surface) !important;
                border-right: 1px solid var(--border-color) !important;
                color: var(--text-primary) !important;
            }

            /* Spinner en modo claro */
            html[data-theme="light"] .animate-spin {
                border-color: var(--border-color) !important;
                border-top-color: var(--mb-red) !important;
            }

            /* Fondo del portal candidato en modo claro */
            html[data-theme="light"] body.flex {
                background: linear-gradient(145deg, #eef2ff 0%, #f8fafc 100%) !important;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(btn);
    }

    function injectHelpButton() {
        if (document.getElementById('mb-help-btn')) return;

        const btn = document.createElement('a');
        btn.id = 'mb-help-btn';
        btn.setAttribute('title', 'Centro de ayuda');
        const roleFromSession = (localStorage.getItem('mb_rol') || '').toLowerCase();
        const page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        const isCandidatePortal = page === 'index.html' || page === '' || page === 'postulacion-module.html';
        const role = isCandidatePortal ? 'candidato' : (roleFromSession || 'candidato');
        const scope = isCandidatePortal ? '&scope=externo' : '';
        btn.href = `ayuda.html?dep=${encodeURIComponent(role)}${scope}`;
        btn.innerHTML = `
            <span class="help-icon">?</span>
            <span class="help-label">Ayuda</span>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #mb-help-btn {
                position: fixed;
                bottom: 84px;
                right: 24px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                border-radius: 999px;
                text-decoration: none;
                font-family: 'Montserrat', sans-serif;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: 0.02em;
                box-shadow: 0 4px 20px rgba(0,0,0,0.25);
                transition: all 0.25s ease;
            }
            #mb-help-btn:hover {
                transform: translateY(-2px) scale(1.03);
                box-shadow: 0 8px 26px rgba(0,0,0,0.3);
            }
            #mb-help-btn .help-icon {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 900;
            }
            html[data-theme="dark"] #mb-help-btn {
                background: #0071BC;
                color: #FFFFFF;
            }
            html[data-theme="dark"] #mb-help-btn .help-icon {
                background: rgba(255,255,255,0.2);
                color: #FFFFFF;
            }
            html[data-theme="light"] #mb-help-btn {
                background: #1E293B;
                color: #FFFFFF;
            }
            html[data-theme="light"] #mb-help-btn .help-icon {
                background: rgba(255,255,255,0.2);
                color: #FFFFFF;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(btn);
    }

    function injectBrandLogo() {
        if (document.getElementById('mb-brand-logo-fixed')) return;

        const wrap = document.createElement('a');
        wrap.id = 'mb-brand-logo-fixed';
        wrap.href = 'index.html';
        wrap.setAttribute('title', 'Ma Baker and Chef');
        wrap.innerHTML = '<img src="assets/logo-mabaker-chef.png" alt="Logo Ma Baker and Chef">';

        const style = document.createElement('style');
        style.textContent = `
            #mb-brand-logo-fixed {
                position: fixed;
                top: 14px;
                left: 14px;
                z-index: 1200;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 68px;
                height: 68px;
                border-radius: 16px;
                overflow: hidden;
                background: rgba(255,255,255,0.92);
                border: 1px solid rgba(15,23,42,0.12);
                box-shadow: 0 6px 16px rgba(2,6,23,0.2);
                transition: transform .2s ease;
            }
            #mb-brand-logo-fixed:hover { transform: scale(1.04); }
            #mb-brand-logo-fixed img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            @media (max-width: 900px) {
                #mb-brand-logo-fixed {
                    width: 54px;
                    height: 54px;
                    border-radius: 12px;
                    top: 10px;
                    left: 10px;
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(wrap);
    }

    // Exponer funciones al scope global por si alguna página las necesita
    window.MB_THEME = {
        toggle: toggleTheme,
        apply: applyTheme,
        getCurrent: () => localStorage.getItem('mb_theme') || 'dark'
    };

})();
