/**
 * theme.js — Tema dinámico Claro/Oscuro para Ma Baker and Chef
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
        injectFieldLabelStyles();
        injectModalDetailStyles();
        loadGlobalNavigation();
    });

    function injectFieldLabelStyles() {
        if (document.getElementById('mb-field-label-styles')) return;
        const style = document.createElement('style');
        style.id = 'mb-field-label-styles';
        style.textContent = `
            .mb-field-label {
                display: block;
                margin-bottom: 0.5rem;
                font-family: 'Montserrat', sans-serif;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                line-height: 1.3;
                opacity: 1 !important;
            }
            html[data-theme="dark"] .mb-field-label {
                color: #F8FAFC !important;
            }
            html[data-theme="light"] .mb-field-label {
                color: #0F172A !important;
            }
            /* Modales de edición (fondo oscuro fijo): etiquetas claras en tema claro */
            html[data-theme="light"] #modalVacante .mb-field-label,
            html[data-theme="light"] #modalCandidato .mb-field-label,
            html[data-theme="light"] [id*="modal"] .bg-dark-surface .mb-field-label,
            html[data-theme="light"] .bg-dark-surface .mb-field-label {
                color: #F8FAFC !important;
            }
            .mb-field-caption {
                font-family: 'Montserrat', sans-serif;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.07em;
                text-transform: uppercase;
                opacity: 1 !important;
            }
            html[data-theme="dark"] .mb-field-caption {
                color: #E2E8F0 !important;
            }
            html[data-theme="light"] .mb-field-caption {
                color: #334155 !important;
            }
            html[data-theme="light"] .bg-dark-surface .mb-field-caption {
                color: #E2E8F0 !important;
            }
            html[data-theme="dark"] label.mb-field-label,
            html[data-theme="dark"] form label[class*="uppercase"]:not(.sr-only):not([class*="cursor-pointer"]) {
                color: #F8FAFC !important;
                opacity: 1 !important;
                font-size: 12px !important;
                font-weight: 800 !important;
            }
            html[data-theme="light"] form label.mb-field-label {
                color: #0F172A !important;
            }
        `;
        document.head.appendChild(style);
    }

    /** Modal «Ver descripción» / detalle de puesto — contraste correcto en claro y oscuro */
    function injectModalDetailStyles() {
        if (document.getElementById('mb-modal-detail-styles-v4')) return;
        const style = document.createElement('style');
        style.id = 'mb-modal-detail-styles-v4';
        style.textContent = `
            #modalVerVacante:not(.hidden),
            #modalConfigurarVacante:not(.hidden),
            #modalVacante:not(.hidden),
            #modalDetalle:not(.hidden) {
                display: flex !important;
                z-index: 200 !important;
            }
            #modalVerVacante .mb-modal-overlay,
            #modalConfigurarVacante .mb-modal-overlay,
            #modalVacante .mb-modal-overlay {
                z-index: 0;
            }
            #modalVerVacante .mb-modal-detail,
            #modalConfigurarVacante .mb-modal-detail,
            #modalVacante .mb-modal-detail,
            #modalDetalle .mb-modal-detail {
                position: relative;
                z-index: 1;
            }
            body.mb-modal-open {
                overflow: hidden;
            }
            #modalVerVacante .mb-modal-detail,
            #modalDetalle .mb-modal-detail,
            #modalConfigurarVacante .mb-modal-detail,
            #modalVacante .mb-modal-detail {
                transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
            }

            .mb-modal-overlay {
                backdrop-filter: blur(12px);
                transition: background 0.2s ease;
            }
            html[data-theme="dark"] .mb-modal-overlay {
                background: rgba(15, 23, 42, 0.88) !important;
            }
            html[data-theme="light"] .mb-modal-overlay {
                background: rgba(15, 23, 42, 0.35) !important;
            }

            /* ── Modo oscuro ── */
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail,
            html[data-theme="dark"] #modalDetalle .mb-modal-detail,
            html[data-theme="dark"] #modalConfigurarVacante .mb-modal-detail,
            html[data-theme="dark"] #modalVacante .mb-modal-detail {
                background: #0f172a !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
                color: #f8fafc !important;
            }
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail #verV_titulo,
            html[data-theme="dark"] #modalDetalle .mb-modal-detail #modTitulo,
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail .mb-stat-grid .mb-stat-value {
                color: #f8fafc !important;
            }
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail .mb-stat-grid > div {
                background: rgba(255, 255, 255, 0.05) !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
            }
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail .mb-stat-grid .mb-field-caption,
            html[data-theme="dark"] #modalDetalle .mb-modal-detail .mb-stat-grid .mb-field-caption,
            html[data-theme="dark"] #modalDetalle .mb-modal-detail .mb-stat-grid p.text-xs {
                color: #cbd5e1 !important;
            }
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail #verV_desc,
            html[data-theme="dark"] #modalDetalle .mb-modal-detail #modDesc {
                color: #cbd5e1 !important;
            }
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail #verV_codigo,
            html[data-theme="dark"] #modalDetalle .mb-modal-detail #modCodigo {
                background: rgba(255, 255, 255, 0.1) !important;
                color: #e2e8f0 !important;
            }
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail .mb-modal-muted,
            html[data-theme="dark"] #modalDetalle .mb-modal-detail .mb-modal-muted {
                color: #94a3b8 !important;
            }
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail .mb-tag-chip {
                background: rgba(255, 255, 255, 0.1) !important;
                color: #e2e8f0 !important;
            }
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail .mb-modal-footer-btn-secondary,
            html[data-theme="dark"] #modalDetalle .mb-modal-detail .mb-modal-footer-btn-secondary {
                border-color: rgba(255, 255, 255, 0.15) !important;
                color: #cbd5e1 !important;
            }

            /* ── Modo claro ── */
            html[data-theme="light"] #modalVerVacante .mb-modal-detail,
            html[data-theme="light"] #modalDetalle .mb-modal-detail,
            html[data-theme="light"] #modalConfigurarVacante .mb-modal-detail,
            html[data-theme="light"] #modalVacante .mb-modal-detail {
                background: #ffffff !important;
                border-color: #e2e8f0 !important;
                color: #1e293b !important;
                backdrop-filter: none !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail #verV_titulo,
            html[data-theme="light"] #modalDetalle .mb-modal-detail #modTitulo,
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .mb-stat-grid .mb-stat-value,
            html[data-theme="light"] #modalDetalle .mb-modal-detail .mb-stat-grid p.text-sm.font-bold {
                color: #0f172a !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .mb-stat-grid > div {
                background: #f8fafc !important;
                border-color: #e2e8f0 !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .mb-stat-grid .mb-field-caption,
            html[data-theme="light"] #modalDetalle .mb-modal-detail .mb-stat-grid .mb-field-caption,
            html[data-theme="light"] #modalDetalle .mb-modal-detail .mb-stat-grid p.text-xs {
                color: #64748b !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail #verV_desc,
            html[data-theme="light"] #modalDetalle .mb-modal-detail #modDesc {
                color: #334155 !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail #verV_codigo,
            html[data-theme="light"] #modalDetalle .mb-modal-detail #modCodigo {
                background: #f1f5f9 !important;
                color: #475569 !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .mb-modal-muted,
            html[data-theme="light"] #modalDetalle .mb-modal-detail .mb-modal-muted {
                color: #64748b !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .mb-modal-muted #verV_archivo,
            html[data-theme="light"] #modalDetalle .mb-modal-detail .mb-modal-muted #modArchivo {
                color: #475569 !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .mb-tag-chip {
                background: #e2e8f0 !important;
                color: #334155 !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .border-white\\/5,
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .border-white\\/10,
            html[data-theme="light"] #modalDetalle .mb-modal-detail .border-white\\/10 {
                border-color: #e2e8f0 !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .mb-modal-footer-btn-secondary,
            html[data-theme="light"] #modalDetalle .mb-modal-detail .mb-modal-footer-btn-secondary {
                border-color: #cbd5e1 !important;
                color: #475569 !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail .mb-modal-footer-btn-secondary:hover,
            html[data-theme="light"] #modalDetalle .mb-modal-detail .mb-modal-footer-btn-secondary:hover {
                background: #f1f5f9 !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail button.rounded-2xl:hover,
            html[data-theme="light"] #modalDetalle .mb-modal-detail button.rounded-full:hover {
                background: #f1f5f9 !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail svg.text-slate-400,
            html[data-theme="light"] #modalDetalle .mb-modal-detail svg {
                color: #64748b !important;
            }
            html[data-theme="light"] #modalVerVacante > .absolute.inset-0,
            html[data-theme="light"] #modalDetalle.modal-overlay,
            html[data-theme="light"] #modalConfigurarVacante .mb-modal-overlay,
            html[data-theme="light"] #modalVacante .mb-modal-overlay,
            html[data-theme="light"] #modalVerVacante .mb-modal-overlay {
                background: rgba(15, 23, 42, 0.35) !important;
            }

            /* ── Modal configurar vacante ── */
            .mb-cfg-title { line-height: 1.3; }
            html[data-theme="dark"] .mb-cfg-title,
            html[data-theme="dark"] #cfgV_nombre { color: #f8fafc !important; }
            html[data-theme="light"] .mb-cfg-title,
            html[data-theme="light"] #cfgV_nombre { color: #0f172a !important; }
            html[data-theme="dark"] .mb-cfg-meta,
            html[data-theme="dark"] .mb-cfg-section-label { color: #94a3b8 !important; }
            html[data-theme="light"] .mb-cfg-meta,
            html[data-theme="light"] .mb-cfg-section-label { color: #64748b !important; }
            html[data-theme="dark"] .mb-cfg-note { color: #fcd34d !important; }
            html[data-theme="light"] .mb-cfg-note { color: #b45309 !important; }

            .mb-cfg-option {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 0.85rem 1rem;
                border-radius: 0.85rem;
                border: 1px solid transparent;
                cursor: pointer;
                transition: background 0.15s ease, border-color 0.15s ease;
            }
            html[data-theme="dark"] .mb-cfg-option {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.12);
            }
            html[data-theme="light"] .mb-cfg-option {
                background: #f8fafc;
                border-color: #e2e8f0;
            }
            html[data-theme="dark"] .mb-cfg-option:hover { background: rgba(255, 255, 255, 0.09); }
            html[data-theme="light"] .mb-cfg-option:hover { background: #f1f5f9; }
            .mb-cfg-option--locked { cursor: default; opacity: 0.92; }

            .mb-cfg-check {
                width: 1.05rem;
                height: 1.05rem;
                margin-top: 0.15rem;
                accent-color: #0071BC;
            }
            .mb-cfg-option-text { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
            .mb-cfg-option-label {
                display: block;
                font-size: 0.8125rem;
                font-weight: 700;
                line-height: 1.35;
            }
            html[data-theme="dark"] .mb-cfg-option-label { color: #f1f5f9 !important; }
            html[data-theme="light"] .mb-cfg-option-label { color: #0f172a !important; }
            .mb-cfg-option-hint {
                display: block;
                font-size: 0.6875rem;
                font-weight: 600;
                line-height: 1.35;
            }
            html[data-theme="dark"] .mb-cfg-option-hint { color: #94a3b8 !important; }
            html[data-theme="light"] .mb-cfg-option-hint { color: #64748b !important; }

            .mb-modal-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 44px;
                padding: 0 1.15rem;
                border-radius: 0.75rem;
                font-size: 0.75rem;
                font-weight: 700;
                line-height: 1.2;
                border: 1px solid transparent;
                white-space: nowrap;
                transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
            }
            .mb-modal-btn--primary {
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            html[data-theme="dark"] .mb-modal-btn--primary {
                background: #059669 !important;
                color: #ffffff !important;
                border-color: #059669 !important;
            }
            html[data-theme="light"] .mb-modal-btn--primary {
                background: #047857 !important;
                color: #ffffff !important;
                border-color: #047857 !important;
            }
            .mb-modal-btn--accent {
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            html[data-theme="dark"] .mb-modal-btn--accent {
                background: rgba(0, 113, 188, 0.22) !important;
                color: #7ec8f0 !important;
                border-color: rgba(0, 113, 188, 0.45) !important;
            }
            html[data-theme="light"] .mb-modal-btn--accent {
                background: rgba(0, 113, 188, 0.12) !important;
                color: #0071BC !important;
                border-color: rgba(0, 113, 188, 0.35) !important;
            }
            html[data-theme="dark"] .mb-modal-btn--accent:hover {
                background: #0071BC !important;
                color: #ffffff !important;
            }
            html[data-theme="light"] .mb-modal-btn--accent:hover {
                background: #0071BC !important;
                color: #ffffff !important;
            }
            .mb-modal-footer--balanced {
                align-items: center !important;
            }
            .mb-modal-status {
                min-height: 44px;
                display: inline-flex !important;
                align-items: center !important;
            }
            html[data-theme="dark"] .mb-modal-btn--neutral {
                background: rgba(255, 255, 255, 0.12) !important;
                color: #f8fafc !important;
                border-color: rgba(255, 255, 255, 0.15) !important;
            }
            html[data-theme="light"] .mb-modal-btn--neutral {
                background: #e2e8f0 !important;
                color: #0f172a !important;
                border-color: #cbd5e1 !important;
            }
            html[data-theme="dark"] .mb-modal-btn--secondary {
                background: transparent !important;
                color: #cbd5e1 !important;
                border-color: rgba(255, 255, 255, 0.18) !important;
            }
            html[data-theme="light"] .mb-modal-btn--secondary {
                background: #ffffff !important;
                color: #475569 !important;
                border-color: #cbd5e1 !important;
            }
            html[data-theme="dark"] .mb-modal-btn--warning {
                background: rgba(245, 158, 11, 0.15) !important;
                color: #fcd34d !important;
                border-color: rgba(245, 158, 11, 0.35) !important;
            }
            html[data-theme="light"] .mb-modal-btn--warning {
                background: #fffbeb !important;
                color: #b45309 !important;
                border-color: #fcd34d !important;
            }
            html[data-theme="dark"] .mb-modal-btn--primary:hover { background: #047857 !important; }
            html[data-theme="light"] .mb-modal-btn--primary:hover { background: #065f46 !important; }
            html[data-theme="dark"] .mb-modal-btn--neutral:hover { background: rgba(255, 255, 255, 0.18) !important; }
            html[data-theme="light"] .mb-modal-btn--neutral:hover { background: #cbd5e1 !important; }

            html[data-theme="dark"] #modalConfigurarVacante .mb-modal-header,
            html[data-theme="dark"] #modalConfigurarVacante .mb-modal-footer {
                border-color: rgba(255, 255, 255, 0.08) !important;
            }
            html[data-theme="light"] #modalConfigurarVacante .mb-modal-header,
            html[data-theme="light"] #modalConfigurarVacante .mb-modal-footer {
                border-color: #e2e8f0 !important;
            }
            html[data-theme="dark"] #modalConfigurarVacante .mb-modal-footer {
                background: rgba(0, 0, 0, 0.2) !important;
            }
            html[data-theme="light"] #modalConfigurarVacante .mb-modal-footer {
                background: #f8fafc !important;
            }

            /* ── Estructura amigable del modal ── */
            #modalVerVacante .mb-modal-detail,
            #modalDetalle .mb-modal-detail,
            #modalConfigurarVacante .mb-modal-detail,
            #modalVacante .mb-modal-detail {
                box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04) !important;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail,
            html[data-theme="light"] #modalDetalle .mb-modal-detail,
            html[data-theme="light"] #modalConfigurarVacante .mb-modal-detail,
            html[data-theme="light"] #modalVacante .mb-modal-detail {
                box-shadow: 0 28px 56px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px #e2e8f0 !important;
            }

            .mb-modal-header {
                position: relative;
                overflow: hidden;
            }
            html[data-theme="dark"] .mb-modal-header {
                background: linear-gradient(135deg, rgba(215, 40, 47, 0.12) 0%, rgba(0, 113, 188, 0.08) 55%, transparent 100%) !important;
            }
            html[data-theme="light"] .mb-modal-header {
                background: linear-gradient(135deg, rgba(215, 40, 47, 0.06) 0%, rgba(0, 113, 188, 0.05) 50%, #ffffff 100%) !important;
            }
            .mb-modal-header::before {
                content: "";
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: linear-gradient(180deg, #D7282F 0%, #0071BC 100%);
                border-radius: 0 4px 4px 0;
            }

            .mb-stat-grid > div {
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            html[data-theme="dark"] .mb-stat-grid > div {
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 14px rgba(0, 0, 0, 0.2);
            }
            html[data-theme="light"] .mb-stat-grid > div {
                box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 #ffffff;
            }
            .mb-stat-grid > div:hover {
                transform: translateY(-1px);
            }

            .mb-stat-inline {
                margin: 0;
            }
            html[data-theme="light"] #modalVerVacante .mb-modal-detail #verV_depto {
                color: #64748b !important;
            }
            html[data-theme="dark"] #modalVerVacante .mb-modal-detail #verV_depto {
                color: #94a3b8 !important;
            }

            .mb-job-panel {
                border-radius: 1.25rem;
                overflow: hidden;
            }
            html[data-theme="dark"] .mb-job-panel {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 24px rgba(0, 0, 0, 0.25);
            }
            html[data-theme="light"] .mb-job-panel {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06), inset 0 1px 0 #ffffff;
            }

            .mb-job-panel-header {
                display: flex;
                align-items: center;
                gap: 0.65rem;
                flex-wrap: wrap;
                padding: 0.85rem 1.15rem;
                border-bottom: 1px solid transparent;
            }
            html[data-theme="dark"] .mb-job-panel-header {
                background: rgba(255, 255, 255, 0.04);
                border-bottom-color: rgba(255, 255, 255, 0.06);
            }
            html[data-theme="light"] .mb-job-panel-header {
                background: #ffffff;
                border-bottom-color: #e2e8f0;
            }
            .mb-job-panel-header svg {
                width: 1.1rem;
                height: 1.1rem;
                flex-shrink: 0;
            }
            html[data-theme="dark"] .mb-job-panel-header svg { color: #fbbf24; }
            html[data-theme="light"] .mb-job-panel-header svg { color: #b45309; }

            .mb-section-heading {
                margin: 0;
                font-family: 'Montserrat', sans-serif;
                font-size: 0.68rem;
                font-weight: 800;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }
            html[data-theme="dark"] .mb-section-heading { color: #fde68a; }
            html[data-theme="light"] .mb-section-heading { color: #92400e; }
            html[data-theme="dark"] .mb-section-heading--green { color: #6ee7b7; }
            html[data-theme="light"] .mb-section-heading--green { color: #047857; }
            html[data-theme="dark"] .mb-section-heading--amber { color: #fcd34d; }
            html[data-theme="light"] .mb-section-heading--amber { color: #b45309; }

            .mb-job-panel-badge {
                margin-left: auto;
                font-size: 0.58rem;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                padding: 0.2rem 0.55rem;
                border-radius: 999px;
            }
            html[data-theme="dark"] .mb-job-panel-badge {
                background: rgba(255, 255, 255, 0.08);
                color: #94a3b8;
            }
            html[data-theme="light"] .mb-job-panel-badge {
                background: #e2e8f0;
                color: #64748b;
            }

            .mb-job-doc-root {
                padding: 1rem 1.25rem 1.25rem;
                max-height: min(50vh, 480px);
                overflow-y: auto;
                overflow-wrap: break-word;
                word-wrap: break-word;
                word-break: normal;
            }
            .mb-job-doc-root.scroll-custom::-webkit-scrollbar { width: 5px; }

            .mb-job-doc { display: flex; flex-direction: column; gap: 0.85rem; }
            .mb-job-section {
                border-radius: 0.85rem;
                overflow: hidden;
            }
            html[data-theme="dark"] .mb-job-section {
                border: 1px solid rgba(255, 255, 255, 0.07);
                background: rgba(0, 0, 0, 0.15);
            }
            html[data-theme="light"] .mb-job-section {
                border: 1px solid #e2e8f0;
                background: #ffffff;
                box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
            }
            .mb-job-section-title {
                margin: 0;
                padding: 0.55rem 0.9rem;
                font-family: 'Montserrat', sans-serif;
                font-size: 0.62rem;
                font-weight: 800;
                letter-spacing: 0.09em;
                text-transform: uppercase;
            }
            html[data-theme="dark"] .mb-job-section-title {
                color: #e2e8f0;
                background: linear-gradient(90deg, rgba(215, 40, 47, 0.2) 0%, rgba(0, 113, 188, 0.12) 100%);
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }
            html[data-theme="light"] .mb-job-section-title {
                color: #334155;
                background: linear-gradient(90deg, rgba(215, 40, 47, 0.08) 0%, rgba(0, 113, 188, 0.06) 100%);
                border-bottom: 1px solid #e2e8f0;
            }
            .mb-job-section-body {
                padding: 0.15rem 0;
                overflow-wrap: break-word;
                word-wrap: break-word;
                word-break: normal;
            }
            .mb-job-subsection-title {
                margin: 0.85rem 0 0.4rem;
                padding: 0.5rem 0.95rem 0.35rem;
                font-family: 'Montserrat', sans-serif;
                font-size: 0.78rem;
                font-weight: 800;
                letter-spacing: 0.02em;
                text-transform: none;
                border-left: 3px solid #0071BC;
            }
            html[data-theme="dark"] .mb-job-subsection-title {
                color: #e2e8f0;
                background: rgba(0, 113, 188, 0.08);
            }
            html[data-theme="light"] .mb-job-subsection-title {
                color: #334155;
                background: rgba(0, 113, 188, 0.06);
            }
            .mb-job-field {
                display: block;
                padding: 0.5rem 0.95rem;
                font-size: 0.84rem;
                line-height: 1.6;
                overflow-wrap: break-word;
                word-wrap: break-word;
                word-break: normal;
            }
            html[data-theme="dark"] .mb-job-field + .mb-job-field {
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }
            html[data-theme="light"] .mb-job-field + .mb-job-field {
                border-top: 1px solid #f1f5f9;
            }
            .mb-job-field-label,
            .mb-job-field-sep,
            .mb-job-field-value {
                display: inline;
            }
            .mb-job-field-label {
                font-family: 'Montserrat', sans-serif;
                font-size: 0.84rem;
                font-weight: 800;
                letter-spacing: 0.01em;
                line-height: 1.6;
            }
            html[data-theme="dark"] .mb-job-field-label { color: #94a3b8; }
            html[data-theme="light"] .mb-job-field-label { color: #64748b; }
            .mb-job-field-sep {
                font-weight: 800;
            }
            html[data-theme="dark"] .mb-job-field-sep { color: #64748b; }
            html[data-theme="light"] .mb-job-field-sep { color: #94a3b8; }
            .mb-job-field-value {
                font-size: 0.84rem;
                font-weight: 700;
                line-height: 1.6;
            }
            html[data-theme="dark"] .mb-job-field-value { color: #f8fafc; }
            html[data-theme="light"] .mb-job-field-value { color: #0f172a; }
            .mb-job-paragraph {
                margin: 0;
                padding: 0.5rem 0.95rem;
                font-size: 0.84rem;
                line-height: 1.65;
                overflow-wrap: break-word;
                word-wrap: break-word;
                word-break: normal;
            }
            html[data-theme="dark"] .mb-job-paragraph { color: #cbd5e1; }
            html[data-theme="light"] .mb-job-paragraph { color: #334155; }
            .mb-job-bullet {
                position: relative;
                padding: 0.45rem 0.95rem 0.45rem 1.75rem;
                font-size: 0.875rem;
                line-height: 1.55;
            }
            .mb-job-bullet::before {
                content: "";
                position: absolute;
                left: 0.9rem;
                top: 0.72rem;
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: #D7282F;
            }
            html[data-theme="dark"] .mb-job-bullet { color: #cbd5e1; }
            html[data-theme="light"] .mb-job-bullet { color: #334155; }
            .mb-job-empty {
                margin: 0;
                padding: 1rem;
                text-align: center;
                font-style: italic;
                font-size: 0.85rem;
            }
            html[data-theme="dark"] .mb-job-empty { color: #64748b; }
            html[data-theme="light"] .mb-job-empty { color: #94a3b8; }

            .mb-skill-card {
                border-radius: 1rem;
                padding: 1rem 1.1rem;
            }
            html[data-theme="dark"] .mb-skill-card {
                border: 1px solid rgba(255, 255, 255, 0.07);
                background: rgba(255, 255, 255, 0.03);
            }
            html[data-theme="light"] .mb-skill-card {
                border: 1px solid #e2e8f0;
                background: #ffffff;
                box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
            }
            html[data-theme="dark"] .mb-skill-card--green { border-top: 3px solid #10b981; }
            html[data-theme="dark"] .mb-skill-card--amber { border-top: 3px solid #f59e0b; }
            html[data-theme="light"] .mb-skill-card--green { border-top: 3px solid #059669; }
            html[data-theme="light"] .mb-skill-card--amber { border-top: 3px solid #d97706; }
            .mb-skill-card .mb-section-heading { margin-bottom: 0.65rem; }

            .mb-modal-footer {
                position: relative;
            }
            html[data-theme="dark"] .mb-modal-footer {
                background: rgba(0, 0, 0, 0.2);
            }
            html[data-theme="light"] .mb-modal-footer {
                background: #f8fafc;
            }
        `;
        document.head.appendChild(style);
    }

    function loadGlobalNavigation() {
        if (window.MB_NAV) {
            window.MB_NAV.inject();
            return;
        }
        if (document.querySelector('script[data-mb-nav="1"]')) return;
        const s = document.createElement('script');
        s.src = 'js/navigation.js';
        s.dataset.mbNav = '1';
        s.onload = function () {
            if (window.MB_NAV) {
                window.MB_NAV.inject();
                window.MB_NAV.syncBrandLogo();
            }
        };
        document.body.appendChild(s);
    }

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
