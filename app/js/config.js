/**
 * Configuracion publica del frontend.
 * Importante: este archivo NO debe contener credenciales privilegiadas.
 */
(function () {
    const runtime = window.__MB_RUNTIME_CONFIG || {};

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    window.MB_CONFIG = {
        SUPABASE_URL: runtime.SUPABASE_URL || "https://znskpdixdyxdbvpapqrg.supabase.co",
        SUPABASE_ANON_KEY: runtime.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2twZGl4ZHl4ZGJ2cGFwcXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTg4MDgsImV4cCI6MjA4ODQzNDgwOH0.MvOASVc-0XkqtfeKp_FBZ4hcE_jFSsGB53KQTTgFRCQ",
        DEMO_CREDENTIALS: runtime.DEMO_CREDENTIALS || {},
        EMAIL_WEBHOOK_URL: runtime.EMAIL_WEBHOOK_URL || "",
        DOCUMENT_UPLOAD_WEBHOOK_URL: runtime.DOCUMENT_UPLOAD_WEBHOOK_URL || "",
        POSTULACION_TRANSFER_WEBHOOK_URL: runtime.POSTULACION_TRANSFER_WEBHOOK_URL || "",
        POSTULACION_PUBLIC_URL: runtime.POSTULACION_PUBLIC_URL || "",
        CANDIDATE_RESULT_EMAIL_OVERRIDE: runtime.CANDIDATE_RESULT_EMAIL_OVERRIDE || "",
        RECRUITER_EMAILS: runtime.RECRUITER_EMAILS || ["rrhh@mabakerandchef.com"],
        COMPANY_NAME: runtime.COMPANY_NAME || "Ma Baker and Chef",
        escapeHTML,
    };
})();
