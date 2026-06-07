(function () {
    if (window.MB_HELP_OVERLAY) return;

    let tooltip = null;

    function ensureTooltip() {
        if (tooltip) return tooltip;
        tooltip = document.createElement('div');
        tooltip.id = 'mb-icon-help-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '10000';
        tooltip.style.maxWidth = '280px';
        tooltip.style.padding = '8px 10px';
        tooltip.style.borderRadius = '10px';
        tooltip.style.fontFamily = "'Montserrat', sans-serif";
        tooltip.style.fontSize = '12px';
        tooltip.style.lineHeight = '1.35';
        tooltip.style.fontWeight = '600';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity .14s ease';
        tooltip.style.background = 'rgba(15, 23, 42, 0.96)';
        tooltip.style.color = '#F8FAFC';
        tooltip.style.border = '1px solid rgba(148, 163, 184, 0.35)';
        tooltip.style.boxShadow = '0 10px 30px rgba(2, 6, 23, .55)';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    function getHelpText(el) {
        if (!el) return '';
        const t = el.getAttribute('data-help')
            || el.getAttribute('title')
            || el.getAttribute('aria-label')
            || '';
        if (t && t.trim()) return t.trim();

        const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (raw) return raw.length > 120 ? raw.slice(0, 117) + '...' : raw;
        return '';
    }

    function positionTooltip(target) {
        if (!tooltip || !target) return;
        const r = target.getBoundingClientRect();
        const t = tooltip.getBoundingClientRect();
        const top = Math.max(8, r.top - t.height - 10);
        const left = Math.min(window.innerWidth - t.width - 8, Math.max(8, r.left + (r.width / 2) - (t.width / 2)));
        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
    }

    function showHelp(target) {
        const text = getHelpText(target);
        if (!text) return;
        const tip = ensureTooltip();
        tip.textContent = text;
        tip.style.opacity = '1';
        positionTooltip(target);
    }

    function hideHelp() {
        if (!tooltip) return;
        tooltip.style.opacity = '0';
    }

    function isActionableIconTarget(el) {
        if (!(el instanceof Element)) return false;
        return Boolean(
            el.closest('[data-help], [title], [aria-label], button, a, [role="button"], .nav-item, .role-btn, .btn-eval')
        );
    }

    function targetFromEvent(e) {
        const el = e.target;
        if (!(el instanceof Element)) return null;
        const node = el.closest('[data-help], [title], [aria-label], button, a, [role="button"], .nav-item, .role-btn, .btn-eval');
        if (!node || !isActionableIconTarget(node)) return null;
        return node;
    }

    function init() {
        document.addEventListener('mouseover', (e) => {
            const t = targetFromEvent(e);
            if (!t) return;
            showHelp(t);
        }, true);
        document.addEventListener('mouseout', (e) => {
            const t = targetFromEvent(e);
            if (!t) return;
            hideHelp();
        }, true);
        document.addEventListener('focusin', (e) => {
            const t = targetFromEvent(e);
            if (!t) return;
            showHelp(t);
        }, true);
        document.addEventListener('focusout', (e) => {
            const t = targetFromEvent(e);
            if (!t) return;
            hideHelp();
        }, true);
        window.addEventListener('scroll', hideHelp, true);
        window.addEventListener('resize', hideHelp, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.MB_HELP_OVERLAY = { showHelp, hideHelp };
})();
