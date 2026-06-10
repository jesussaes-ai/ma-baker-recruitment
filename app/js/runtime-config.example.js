window.__MB_RUNTIME_CONFIG = {
  // URL Edge Function para envio de correo
  EMAIL_WEBHOOK_URL: "https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails",
  DOCUMENT_UPLOAD_WEBHOOK_URL: "https://<PROJECT_REF>.functions.supabase.co/upload-candidato-document",
  PSYCHOMETRIC_SETUP_WEBHOOK_URL: "https://<PROJECT_REF>.functions.supabase.co/setup-psicometric-access",
  PSYCHOMETRIC_PUBLIC_URL: "http://localhost:8080/evaluacion-candidato.html",
  // Opcional: forzar envio de resultado del candidato a un correo temporal de pruebas
  CANDIDATE_RESULT_EMAIL_OVERRIDE: "",
  // Webhook para transferir la postulacion a otros modulos del sistema (opcional)
  POSTULACION_TRANSFER_WEBHOOK_URL: "https://<PROJECT_REF>.functions.supabase.co/transfer-postulacion",
  // URL publica para compartir el modulo independiente de postulacion (opcional)
  POSTULACION_PUBLIC_URL: "https://vacantes.mabakerandchef.com/postulacion-module.html",

  // Correos internos de reclutamiento
  RECRUITER_EMAILS: ["rrhh@mabakerandchef.com", "seleccion@mabakerandchef.com"],

  // Nombre usado en asuntos y textos
  COMPANY_NAME: "Ma Baker and Chef",

  // Opcional: credenciales demo para accesos rapidos
  DEMO_CREDENTIALS: {
    admin: { email: "admin@mabakerandchef.com", password: "CAMBIAR_EN_RUNTIME" },
    rrhh: { email: "rrhh@mabakerandchef.com", password: "CAMBIAR_EN_RUNTIME" },
  },
};
