# Seguimiento de postulación y correos (Ma Baker and Chef)

## Objetivo

Asegurar que cada candidato reciba confirmación de recepción y que RRHH reciba el expediente completo para evaluación.

## Flujo operativo

1. Candidato elige modalidad de captura:
   - `ONLINE (WEB / WHATSAPP)`
   - `EN SITIO (DENTRO DE LA EMPRESA)`
2. Candidato acepta privacidad.
3. Candidato selecciona vacante activa.
4. Candidato llena formulario completo.
5. Sistema guarda la postulación en Supabase.
6. Sistema dispara notificaciones por correo:
   - agradecimiento al candidato;
   - resumen operativo al reclutador.

## Campos nuevos del flujo

- `origen_postulacion`
- `detalle_origen_postulacion`
- `estatus_postulacion` (valor inicial: `RECIBIDA`)

## Requerimientos técnicos de envío de correo

El frontend usa un webhook configurable en runtime:

- `EMAIL_WEBHOOK_URL`: endpoint que recibe `POST` JSON por mensaje.
- `RECRUITER_EMAILS`: lista de correos de RRHH.
- `COMPANY_NAME`: nombre mostrado en asunto y cuerpo.

## Nota de implementación

La app no incluye credenciales SMTP directas.  
El envío real debe resolverse en backend/servicio seguro (Edge Function, API interna o proveedor transaccional).

## Estado actual (jun-2026)

- Edge Function activa: `send-postulacion-emails`.
- **Fase 3 activa:** `setup-psicometric-access` genera token y envía link psicométrico al candidato promovido (≥80%).
- **Fase 4 activa:** cierre psicométricos → RRHH envía a médico → jefe de área (`docs/fase-4-medico-jefe.md`).
- Dashboards internos usan RPC `fn_candidatos_list` / `fn_candidato_update` con `mb_token` de sesión.
- **Catálogo vacantes en dashboard:** ver descripción PDF, editar activas (todos los campos, nombre con autoaltura) y subir PDFs en panel *Catálogo Vacantes* (`docs/catalogo-vacantes-dashboard.md`). Etiquetas de campos con clase `.mb-field-label` (alto contraste en modales).
- **Catálogo vacantes:** guardado vía RPC corrige `text[]` en conocimientos/competencias (`vacantes_array_fields_coalesce_fix`).
- **Marca:** nombre oficial siempre **Ma Baker and Chef** (regla + skill en `.cursor/rules/` y `.cursor/skills/ma-baker-brand-name/`).
- Portal candidato: `evaluacion-candidato.html?token=...`
- Estrategia de continuidad correo: failover multiproveedor.
- Orden de prioridad configurable:
  - `gmail`
  - `resend`
  - `postmark`
  - `brevo`

## Variables operativas en backend

- `MAIL_FROM`
- `EMAIL_PROVIDER_PRIORITY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GMAIL_SENDER_EMAIL`
- `RESEND_API_KEY`
- `POSTMARK_SERVER_TOKEN`
- `BREVO_API_KEY`

## Lecciones operativas

- Resend puede tener incidentes temporales de panel/rutas.
- El flujo de postulación no debe depender de un solo proveedor.
- Si falla `INSERT` por RLS en tablas de postulación, no habrá correo aunque el frontend termine flujo.
- Ojo con `Prefer: return=representation` + RLS: devolver la fila insertada exige política SELECT para el rol. Para inserts anónimos usar `return=minimal` y generar el `id` en el cliente (`crypto.randomUUID()`). No dar SELECT a `anon` en tablas con PII.
- Los correos al candidato y RRHH usan plantillas HTML legibles (sin JSON ni scores técnicos en el cuerpo).
- Vault SQL (`vault.secrets`) y Secrets de Edge Function son distintos: si la funcion responde `missing_email_provider_credentials`, cargar secretos con `supabase secrets set --project-ref ...`.
- OAuth2 Gmail requiere:
  - cliente OAuth tipo web para Playground;
  - `redirect_uri` autorizado;
  - refresh token vigente.
- No usar usuario/contrasena como reemplazo de OAuth2.

## Referencias internas

- Deploy y configuracion: `docs/deploy-email-webhook.md`
- Runbook operativo completo: `docs/RUNBOOK-CORREO-MULTIPROVEEDOR.md`
