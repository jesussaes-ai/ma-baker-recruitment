# Proyecto: Reclutamiento y Selección de Talento Automatizado

## Ma Baker and Chef

Este proyecto implementa un sistema agéntico avanzado para automatizar el proceso de reclutamiento, validación y onboarding de talento en Ma Baker and Chef.

### Marca oficial

- Nombre completo obligatorio: **Ma Baker and Chef** (regla Cursor: `.cursor/rules/nombre-oficial-ma-baker-and-chef.mdc`, skill: `.cursor/skills/ma-baker-brand-name/SKILL.md`, constante: `app/js/brand.js`).

### Componentes Clave

1. **Orquestador de Talento (System Prompt):** Gobierna el flujo completo y aplica filtros duros.
2. **Dynamic Job Matcher (Skill):** Valida los 23 puntos obligatorios del formulario y realiza el cálculo de Match Score.
3. **SGI & Safety Auditor (Skill):** Asegura el cumplimiento normativo (ISO 22000, NOM-251) y de seguridad industrial.
4. **Supabase Router (Skill):** Gestiona la base de datos distribuida y el RBAC (Control de Acceso Basado en Roles).

### Directorios

- `skills/`: Contiene las definiciones de las habilidades agénticas.
- `docs/`: Documentación técnica y flujos.
- `prompts/`: Definiciones de prompts maestros y auxiliares.

### Herramientas externas (referencia local)

**Handy** — speech-to-text offline (open source, Tauri + Whisper). Fork en GitHub y clon local para uso puntual (dictado, accesibilidad, pruebas de voz sin nube):


| Recurso     | Ruta / URL                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Fork GitHub | [https://github.com/jesussaes-ai/Handy.Computer](https://github.com/jesussaes-ai/Handy.Computer) |
| Upstream    | [https://github.com/RicoSaupeB/Handy.Computer](https://github.com/RicoSaupeB/Handy.Computer)     |
| Clon local  | `C:\Users\jesus\.gemini\antigravity\scratch\Handy.Computer`                                      |
| Sitio       | [https://handy.computer](https://handy.computer)                                                 |


Abrir en Cursor: **File → Open Folder** → ruta del clon local. Actualizar: `git pull origin main` desde esa carpeta.

### Ayuda contextual en la app

- Se agregó `app/ayuda.html` como centro de ayuda por departamento.
- Se agregó `app/js/help-overlay.js` para mostrar ayuda flotante en iconos y acciones.
- El script de ayuda se carga en las pantallas principales para mejorar onboarding y operación diaria.
- Navegación global **Atrás / Inicio** vía `app/js/navigation.js` (cargado automáticamente desde `theme.js` en todas las pantallas).

### Seguridad de configuración

- Se agregó `app/js/config.js` con configuración pública del frontend.
- El frontend usa solo `SUPABASE_ANON_KEY`; no utiliza `service_role`.
- Los scripts de `database/` ahora leen secretos desde variables de entorno.
- Usa `.env.example` como plantilla local y nunca subas secretos reales.

### Flujo de postulación y correos

- Se captura el origen de la postulación desde inicio: `ONLINE` o `EN SITIO`.
- Al enviar el formulario se registra `estatus_postulacion = RECIBIDA`.
- Si `EMAIL_WEBHOOK_URL` está configurado en runtime, se envían:
  - correo de agradecimiento al candidato;
  - correo de notificación al reclutador con el resumen y payload completo.
- Configuración esperada en runtime (`window.__MB_RUNTIME_CONFIG`):
  - `EMAIL_WEBHOOK_URL`
  - `RECRUITER_EMAILS` (arreglo de correos)
  - `COMPANY_NAME` (opcional)
- Se incluye ejemplo en `app/js/runtime-config.example.js`.

### Webhook de correo (Supabase)

- Se agregó Edge Function en `supabase/functions/send-postulacion-emails/index.ts`.
- Guía de despliegue: `docs/deploy-email-webhook.md`.
- Runbook operativo multiproveedor (Gmail/Resend/Postmark/Brevo): `docs/RUNBOOK-CORREO-MULTIPROVEEDOR.md`.
- Fase 3 psicométricos (link automático al promovido): `docs/fase-3-psicometricos.md`.
- Fase 4 médico + jefe (transición de fases y RPC dashboards): `docs/fase-4-medico-jefe.md`.
- Fase 5 SGI + Seguridad (inducción vía RPC): `docs/fase-5-sgi-seguridad.md`.
- Fase 6 Contratación (uniforme, EPP, firmas, checklist RRHH): `docs/fase-6-contratacion.md`.
- Catálogo de vacantes en dashboard (ver descripción, editar, subir PDF/Word/Excel): `docs/catalogo-vacantes-dashboard.md`.
- Portal candidato (`index.html`): tarjetas respetan `portal_campos_visibles` (descripción, escolaridad, experiencia, edad, sueldo, conocimientos, competencias); resumen legible vía `job-description-format.js`.
- Formato legible descriptivos RRHH (modal Ver descripción): skill `.cursor/skills/descriptivo-puesto-legible/SKILL.md`.
- Dashboard Admin/RRHH: ajustes del sistema, notificaciones y logs unificados (`fn_sistema_logs_list`); migración `database/migracion-sistema-logs-rpc.sql`.
- Ayuda contextual actualizada: `app/ayuda.html` + tooltips `data-help` en dashboards.
- Espejo OneNote (seguimiento operativo): `docs/onenote/seguimiento-ma-baker.md`.
- **NotebookLM** (cuaderno + inventario): `docs/notebooklm-estado-proyecto-jun-2026.md` — actualizar al cierre de cada sesión; pegar en cuaderno si cambia arquitectura/flujo.
- Skill de cierre documental (Obsidian + README + OneNote + GitHub): `.cursor/skills/documentacion-cierre-ma-baker/SKILL.md`.
- Skills personales globales (auto-aprendizaje): `~/.cursor/skills/auto-skill-from-learning/`.

### Carga documental opcional para candidatos >= 80%

- Al finalizar con score >= 80% se habilita módulo para subir documentos uno por uno.
- Endpoint seguro: `supabase/functions/upload-candidato-document/index.ts`.
- Registro de metadatos en tabla `candidato_documentos`.
- Migración SQL: `database/migracion-candidato-documentos.sql`.

> [!NOTE]
> Este proyecto se basa en la arquitectura definida en el cuaderno de NotebookLM: "Reclutamiento y Seleccion de Personal Automatizado: Ma Baker and Chef".

