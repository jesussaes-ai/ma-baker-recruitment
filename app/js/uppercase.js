(function () {
    if (window.MB_UPPERCASE) return;

    const EXCLUDED_TYPES = new Set([
        "password", "hidden", "file", "checkbox", "radio", "range", "email", "url", "tel", "number", "date", "datetime-local", "time", "month", "week",
    ]);

    const PRESERVE_FIELD_PATTERN = /(?:^|[-_])(email|correo|e-mail|mail|url|website|sitio|enlace|link|webhook|web|pagina|paginaweb|linkedin|instagram|facebook|twitter|github|uri|href)(?:$|[-_])/i;

    const PRESERVE_PAYLOAD_KEY_PATTERN = /(?:^|_)(email|correo|e_mail|p_email|mail|url|website|sitio|enlace|link|webhook|web|pagina|uri|href|linkedin|instagram|facebook|twitter|github)(?:_|$)/i;

    function fieldMeta(el) {
        return [
            el.name,
            el.id,
            el.getAttribute("autocomplete"),
            el.getAttribute("data-field"),
            el.getAttribute("placeholder"),
        ].filter(Boolean).join(" ");
    }

    function looksLikeEmail(value) {
        const v = String(value ?? "").trim();
        return v.includes("@") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function looksLikeUrl(value) {
        const v = String(value ?? "").trim();
        return /^(https?:\/\/|www\.)\S+/i.test(v) || /^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(\/\S*)?$/i.test(v);
    }

    function shouldPreserveCaseField(el) {
        if (!el) return false;
        if (el.dataset && (el.dataset.noUppercase !== undefined || el.dataset.preserveCase !== undefined)) {
            return true;
        }
        if (el.tagName === "INPUT") {
            const type = (el.type || "text").toLowerCase();
            if (type === "email" || type === "url") return true;
        }
        const meta = fieldMeta(el);
        if (PRESERVE_FIELD_PATTERN.test(meta)) return true;
        if (/\b(email|url)\b/i.test(el.getAttribute("autocomplete") || "")) return true;
        return false;
    }

    function shouldPreservePayloadKey(key) {
        if (!key || typeof key !== "string") return false;
        const k = key.toLowerCase();
        if (PRESERVE_PAYLOAD_KEY_PATTERN.test(k)) return true;
        if (k.endsWith("_url") || k.endsWith("_link") || k.endsWith("_email")) return true;
        return false;
    }

    function shouldPreserveCaseValue(value) {
        return looksLikeEmail(value) || looksLikeUrl(value);
    }

    function shouldTransform(el) {
        if (!el || el.disabled || el.readOnly) return false;
        if (shouldPreserveCaseField(el)) return false;
        if (el.tagName === "TEXTAREA") return true;
        if (el.tagName === "INPUT") {
            const type = (el.type || "text").toLowerCase();
            return !EXCLUDED_TYPES.has(type);
        }
        return false;
    }

    function transformValue(value) {
        if (shouldPreserveCaseValue(value)) return String(value ?? "");
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
            if (typeof v !== "string") {
                out[k] = v;
            } else if (shouldPreservePayloadKey(k) || shouldPreserveCaseValue(v)) {
                out[k] = v;
            } else {
                out[k] = transformValue(v);
            }
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
        shouldPreserveCaseField,
        shouldPreservePayloadKey,
        shouldPreserveCaseValue,
        transformValue,
        transformElement,
        normalizePayload,
    };
})();
