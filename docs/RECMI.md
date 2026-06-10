# RECMI - Registro de Cambios de Implementación

## Sesión actual

### Flujo de postulación
- Se agregó estatus de origen de captura: `ONLINE` / `EN SITIO`.
- Se agregó `estatus_postulacion = RECIBIDA` al registrar candidato.

### Notificaciones por correo
- Se implementó envío de correo al candidato (agradecimiento).
- Se implementó envío de correo a reclutador con expediente y resumen.
- Se agregó integración por webhook configurable (`EMAIL_WEBHOOK_URL`).

### Backend de correo
- Se creó Edge Function `send-postulacion-emails` para Supabase.
- Se documentó despliegue y pruebas en `docs/deploy-email-webhook.md`.

### Backend psicométricos (Fase 3)
- Edge Function `setup-psicometric-access` desplegada.
- Migración RLS + `candidato_documentos` en Supabase.
- Guía: `docs/fase-3-psicometricos.md`.

### Documentación
- README actualizado con configuración runtime y flujo de correos.
- Obsidian actualizado en `docs/obsidian/seguimiento-postulacion-y-correos.md`.
- Skill de cierre documental: `.cursor/skills/documentacion-cierre-ma-baker/SKILL.md` (Obsidian + README + OneNote + GitHub).
- Espejo OneNote: `docs/onenote/seguimiento-ma-baker.md`.
