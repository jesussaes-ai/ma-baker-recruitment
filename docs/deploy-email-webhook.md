# Despliegue de correo (Edge Function)

## Objetivo

Enviar correos desde la app al finalizar la postulación:

1. Agradecimiento al candidato.
2. Notificación con expediente al reclutador.

## Requisitos

- Proyecto Supabase activo.
- Resend API Key (o proveedor compatible vía HTTP).

## Función incluida

- Ruta de código: `supabase/functions/send-postulacion-emails/index.ts`
- Método: `POST`
- Payload esperado:

```json
{
  "to": "persona@dominio.com",
  "subject": "Asunto",
  "text": "Cuerpo en texto plano",
  "meta": { "tipo": "candidato_confirmacion" }
}
```

## Variables de entorno en Supabase

Configura en el proyecto:

- `MAIL_FROM` (ejemplo: `Ma Baker and Chef <no-reply@tu-dominio.com>`)
- `EMAIL_PROVIDER_PRIORITY` (opcional, default: `gmail,resend,postmark,brevo`)

Configura al menos una credencial de proveedor:

- **Gmail API**
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REFRESH_TOKEN`
  - `GMAIL_SENDER_EMAIL`
- `RESEND_API_KEY`
- `POSTMARK_SERVER_TOKEN`
- `BREVO_API_KEY`

> Recomendado: mantener 2 proveedores configurados para continuidad operativa.
> Gmail requiere OAuth2 (no usuario/contraseña). No usar credenciales de login en texto plano.

## Deploy (CLI)

```bash
supabase functions deploy send-postulacion-emails
supabase functions deploy upload-candidato-document
```

## URL final para la app

```
https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails
https://<PROJECT_REF>.functions.supabase.co/upload-candidato-document
```

## Configuración runtime en frontend

Define `window.__MB_RUNTIME_CONFIG` antes de cargar `js/config.js`:

```html
<script>
  window.__MB_RUNTIME_CONFIG = {
    EMAIL_WEBHOOK_URL: "https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails",
    DOCUMENT_UPLOAD_WEBHOOK_URL: "https://<PROJECT_REF>.functions.supabase.co/upload-candidato-document",
    RECRUITER_EMAILS: ["rrhh@mabakerandchef.com", "seleccion@mabakerandchef.com"],
    COMPANY_NAME: "Ma Baker and Chef"
  };
</script>
```

## Variables extra para carga de documentos

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CANDIDATOS_DOCS_BUCKET` (ejemplo: `expedientes-candidatos`)

> Recomendado: bucket privado y acceso solo vía funciones/servicio.

## Prueba rápida

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails" \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"tu-correo@dominio.com\",\"subject\":\"Prueba\",\"text\":\"Correo de prueba\"}"
```
