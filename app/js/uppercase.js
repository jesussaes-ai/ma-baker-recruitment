(function () {
    if (window.MB_UPPERCASE) return;

    const EXCLUDED_TYPES = new Set(["password", "hidden", "file", "checkbox", "radio", "range"]);

    function shouldTransform(el) {
        if (!el || el.disabled || el.readOnly) return false;
        if (el.tagName === "TEXTAREA") return true;
        if (el.tagName === "INPUT") {
            const type = (el.type || "text").toLowerCase();
            return !EXCLUDED_TYPES.has(type);
        }
        return false;
    }

    function transformValue(value) {
        return String(value ?? "").toLocaleUpperCase("es-MX");
    }

    function transformElement(el) {
        if (!shouldTransform(el)) return;
        const before = el.value || "";
        const after = transformValue(before);
        if (before !== after) {
            const pos = el.selectionStart;
            el.value = after;
            if (typeof pos === "number" && el.setSelectionRange) el.setSelectionRange(pos, pos);
        }
    }

    function normalizePayload(payload) {
        if (!payload || typeof payload !== "object") return payload;
        const out = {};
        Object.entries(payload).forEach(([k, v]) => {
            out[k] = typeof v === "string" ? transformValue(v) : v;
        });
        return out;
    }

    function init() {
        document.addEventListener("input", (e) => transformElement(e.target), true);
        document.addEventListener("blur", (e) => transformElement(e.target), true);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.MB_UPPERCASE = {
        shouldTransform,
        transformValue,
        transformElement,
        normalizePayload,
    };
})();
