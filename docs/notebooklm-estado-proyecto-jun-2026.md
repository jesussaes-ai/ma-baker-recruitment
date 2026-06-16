# Estado del Proyecto — Ma Baker and Chef
## Sistema de Reclutamiento y Selección de Personal Automatizado

**Actualizado:** 2026-06-16  
**Versión operativa:** 2.1 (In-House Supabase, sin GoHighLevel)  
**GitHub:** https://github.com/jesussaes-ai/ma-baker-recruitment  
**Supabase project ref:** `znskpdixdyxdbvpapqrg`  
**URL Supabase:** https://znskpdixdyxdbvpapqrg.supabase.co

> **Este documento sustituye** fuentes antiguas del cuaderno que mencionan GoHighLevel (GHL), webhooks GHL, formularios en GHL o integraciones ElevenLabs+GHL. El stack vigente es **frontend propio + Supabase + Edge Functions + agente IA (Antigravity)**.

---

## Empresa

- **Nombre oficial (obligatorio en todo copy):** Ma Baker and Chef
- **Sitio:** https://www.mabakerandchef.com
- **Giro:** Distribución de insumos para repostería y panadería
- **Colores marca:** `#D7282F` (rojo), `#0071BC` (azul), tipografía Montserrat

---

## Arquitectura vigente (2026)

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5 + CSS3 + JavaScript vanilla (mobile-first) |
| Base de datos | Supabase PostgreSQL con RLS |
| Auth / RBAC | RPC custom (`fn_login`, `mb_token` en sesión) |
| Correos | Edge Function `send-postulacion-emails` (failover Gmail/Resend/Postmark/Brevo) |
| Psicométricos | Edge Function `setup-psicometric-access` + portal `evaluacion-candidato.html` |
| IA matching | Agente Antigravity + skill `hr_multi_job_processor_003` |
| Hosting app | Netlify / Vercel / GitHub Pages o servidor local (`python -m http.server 8080` desde `app/`) |

### Lo que YA NO se usa (obsoleto — eliminar de fuentes del cuaderno)

- **GoHighLevel (GHL)** como host de formularios, menús o webhooks
- Formularios incrustados desde GHL Form Builder
- Disparadores GHL → Antigravity
- Integraciones ElevenLabs + GHL (no aplican al proyecto)
- REST anon con `PATCH` directo sobre `candidatos_activos` desde dashboards (reemplazado por RPC)
- Lectura de `log_agente` vía REST anon (reemplazado por `fn_sistema_logs_list`)

---

## Estructura del repositorio

```
ma-baker-recruitment/
├── app/                    # Frontend completo
│   ├── index.html          # Formulario público (23 campos)
│   ├── login.html          # Login central RBAC
│   ├── cargar-puestos.html # Carga vacantes multi-formato
│   ├── evaluacion-candidato.html  # Portal psicométrico por token
│   ├── ayuda.html          # Centro de ayuda por rol
│   ├── dashboard-admin.html
│   ├── dashboard-rrhh.html
│   ├── dashboard-medico.html
│   ├── dashboard-jefe.html
│   ├── dashboard-sgi.html
│   ├── dashboard-seguridad.html
│   └── js/
│       ├── config.js           # Config pública (anon key)
│       ├── runtime-config.js   # Webhooks y override correo
│       ├── auth.js             # Login, sesión, routing por rol
│       ├── app.js              # Postulación + score IA
│       ├── candidates-api.js   # RPC fn_candidatos_*
│       ├── vacantes-api.js     # RPC catálogo vacantes
│       └── vacante-document-parser.js  # PDF/Word/Excel/PPT/ODF
├── database/               # Migraciones SQL
├── supabase/functions/     # Edge Functions
├── docs/                   # Documentación técnica
├── prompts/                # System prompt orquestador
└── skills/                 # Skills agénticas del proyecto
```

---

## Base de datos — tablas principales

| Tabla | Propósito |
|-------|-----------|
| `catalogo_puestos` | Vacantes activas/pausadas con criterios de evaluación |
| `candidatos_activos` | Candidatos con score ≥ 80% |
| `prospectos_rechazados` | Candidatos con score < 80% |
| `seguridad_medica` | Datos clínicos (RLS estricto, rol médico) |
| `evaluaciones_psicometricas` | Resultados baterías psicométricas |
| `candidato_documentos` | Metadatos documentos subidos post-promoción |
| `log_agente` | Trazabilidad IA (lectura vía RPC, no REST anon) |
| `usuarios_sistema` | Usuarios RBAC con bcrypt |

---

## RBAC — roles y acceso

| Rol | Email ejemplo | Acceso |
|-----|---------------|--------|
| `admin` | admin@mabakerandchef.com | Todo: candidatos, rechazados, médico, jefes, SGI, seguridad, usuarios, logs, vacantes |
| `rrhh` | rrhh@mabakerandchef.com | Candidatos, rechazados, psicométricos, vacantes, envío links, logs |
| `medico` | medico@mabakerandchef.com | Datos clínicos (`seguridad_medica`) |
| `jefe` | jefe@mabakerandchef.com | Candidatos de su departamento |
| `sgi` | sgi@mabakerandchef.com | Inducción calidad/inocuidad (7 puntos) |
| `seguridad` | seguridad@mabakerandchef.com | Inducción seguridad e higiene (7 puntos) |

Credenciales seed en `database/usuarios.sql` (solo desarrollo).

---

## Flujo de reclutamiento — 19 pasos / 6 fases

### Fase 1 — Postulación (auto-servicio)
1. Candidato entra desde bolsa de trabajo web o captura EN SITIO
2. Acepta aviso de privacidad (scroll obligatorio)
3. Selecciona vacante activa del catálogo
4. Llena formulario de **23 campos** (no confundir con "23 etapas")
5. Sistema guarda postulación: `estatus_postulacion = RECIBIDA`, `origen_postulacion = ONLINE | EN SITIO`
6. Edge Function envía correo al candidato (agradecimiento) y a RRHH (expediente)

### Fase 2 — Evaluación IA (automática)
7. Agente consulta `catalogo_puestos` y calcula Match Score 0–100
8. Score < 80% → `prospectos_rechazados` + correo agradecimiento
9. Score ≥ 80% → `candidatos_activos`, fase `espera_psicometricos`
10. Opcional: módulo carga documentos (`upload-candidato-document`)

### Fase 3 — Psicométricos ✅ implementada
11. `setup-psicometric-access` genera token UUID y envía link por correo
12. Segundo aviso de privacidad (datos psicológicos)
13. Candidato completa baterías en `evaluacion-candidato.html?token=...`
14. RRHH visualiza resultados en dashboard → Gestor Psicométricos
15. Docs: `docs/fase-3-psicometricos.md`

### Fase 4 — Médico + Jefe de área ✅ implementada
16. RRHH cierra psicométricos → envía a médico (`espera_medico`)
17. Médico evalúa en `dashboard-medico.html` → `espera_jefe`
18. Jefe evalúa en `dashboard-jefe.html` → `induccion_sgi`
19. RPC: `fn_candidatos_list`, `fn_candidato_update` con `mb_token`
20. Docs: `docs/fase-4-medico-jefe.md`

### Fase 5 — SGI + Seguridad e Higiene ✅ implementada
21. SGI (`dashboard-sgi.html`): 7 puntos calidad/inocuidad → fase `induccion_seguridad`
22. Seguridad (`dashboard-seguridad.html`): 7 puntos EPP/IMSS/emergencias → `listo_para_contrato`
23. Migración: `database/migracion-fase5-sgi-seguridad.sql` (aplicada remota)
24. Docs: `docs/fase-5-sgi-seguridad.md`

### Fase 6 — Contratación ⏳ pendiente
25. Uniforme, EPP, firmas, documentos legales
26. Transición final: `fase_actual = contratado`

---

## Ciclo de fases (`fase_actual`)

```
formulario_web
  → [IA score]
  → espera_psicometricos
  → psicometricos_realizados
  → espera_medico
  → espera_jefe
  → induccion_sgi
  → induccion_seguridad
  → listo_para_contrato
  → contratado
```

---

## Correos — configuración operativa

### Frontend (`app/js/runtime-config.js`)
- `EMAIL_WEBHOOK_URL` → Edge Function desplegada
- `RECRUITER_EMAILS` → array correos RRHH
- `COMPANY_NAME` → "Ma Baker and Chef"

### Edge Function `send-postulacion-emails`
- Failover multiproveedor: Gmail OAuth2 → Resend → Postmark → Brevo
- Secretos en **Project Secrets** (`supabase secrets set`), NO solo Vault SQL
- Runbooks: `docs/deploy-email-webhook.md`, `docs/RUNBOOK-CORREO-MULTIPROVEEDOR.md`

### Lecciones operativas
- Si falla INSERT por RLS, no hay correo aunque el frontend parezca OK
- Inserts anon: usar `return=minimal` + `crypto.randomUUID()` en cliente
- `verify_jwt: false` en función de correo (v7+) para evitar 401 en webhook

---

## Catálogo de vacantes (dashboard)

- Panel *Descripciones*, *Publicar vacantes* y *Catálogo Vacantes* (Admin/RRHH)
- Ver descriptivo: modal con secciones, subtítulos y viñetas (`job-description-format.js`)
- Campos opcionales en portal: `portal-vacante-config.js` + RPC `portal_campos_visibles`
- Subir PDF/Word/Excel/PPT/ODF; parser `vacante-document-parser.js`
- Skill Cursor: `.cursor/skills/descriptivo-puesto-legible/SKILL.md`
- Docs: `docs/catalogo-vacantes-dashboard.md`

---

## Dashboards — capacidades recientes (jun-2026)

- **Ajustes del Sistema:** sesión, tema claro/oscuro, accesos rápidos
- **Campana notificaciones:** vacantes sin publicar, candidatos nuevos (7 días), psicométricos pendientes, fase médica
- **Logs del sistema:** `fn_sistema_logs_list` (admin/rrhh) — unifica IA, postulaciones, vacantes
- **Ayuda contextual:** `app/ayuda.html` + tooltips `data-help` + botón flotante
- **Navegación global:** `navigation.js` (Atrás / Inicio)

---

## Edge Functions desplegadas

| Función | Propósito |
|---------|-----------|
| `send-postulacion-emails` | Correos postulación (candidato + RRHH) |
| `setup-psicometric-access` | Token + link psicométrico al promover ≥80% |
| `upload-candidato-document` | Subida segura documentos candidato |

---

## RPC principales (patrón sesión)

Todas reciben `mb_token` de la sesión post-login:

- `fn_login` — autenticación y emisión token
- `fn_candidatos_list` / `fn_candidato_update` — pipelines por rol
- `fn_catalogo_puestos_list` / `fn_catalogo_puesto_insert` / `fn_catalogo_puesto_update`
- `fn_sistema_logs_list` — auditoría unificada

---

## Desarrollo local

```powershell
cd app
python serve.py
```

URLs con o sin `.html` (ej. `/login` y `/login.html` funcionan igual):
- Login: http://localhost:8080/login
- Formulario: http://localhost:8080/index.html
- Vacantes: http://localhost:8080/cargar-puestos

---

## Skills y documentación del proyecto

### Skills propias (`.cursor/skills/`)
- Marca oficial Ma Baker and Chef
- Webhook correo Supabase (`supabase-webhook-autopilot`)
- Cierre documental Obsidian + README + OneNote

### Agent skills terceros (local `.agents/skills/`, no en Git)
- Supabase, Vercel, Superpowers, antigravity-awesome-skills
- Instalación: `docs/agent-skills-setup.md`

### Documentos técnicos clave
- `docs/CONTEXTO.md` — contexto completo (actualizar fecha al editar)
- `docs/obsidian/seguimiento-postulacion-y-correos.md` — operación diaria
- `docs/onenote/seguimiento-ma-baker.md` — espejo OneNote

**Cambio 2026-06-16 (descripciones/vacantes):** descripciones de puesto y vacantes en portal son capas independientes; campos opcionales en publicación. Ver `docs/catalogo-vacantes-dashboard.md`.

---

## Fuentes del cuaderno NotebookLM — inventario y mantenimiento

**Última auditoría:** 2026-06-16 (vía MCP NotebookLM)  
**Total fuentes:** 12 / 50  
**Cuaderno:** https://notebooklm.google.com/notebook/611114f3-ebc0-4db5-bc74-bda2a78b2fbd

### Estado actual (12 fuentes)

| # | Título | Veredicto |
|---|--------|-----------|
| 1 | 1AVISO DE PRIVACIDAD MA BAKER.pdf | ✅ Conservar |
| 2 | FORMATO ACUSE DE CONOCIMIENTO DEL REGLAMENTO INTERIOR DE TRABAJO.pdf | ✅ Conservar |
| 3 | FORMATO CONVENIO DE CONFIDENCIALIDAD MA BAKER AND CHEF.pdf | ✅ Conservar |
| 4 | Interfaz y UX del Sistema Agéntico Ma Baker & Chef | ⚠️ Conservar hasta pegar fuente maestra; luego opcional |
| 5 | PROCEDIMIENTO A SEGUIR EN LA CONTRATACION DE PERSONAL RRHH.pdf | ✅ Conservar (procedimiento legal RRHH; complementa Fase 6) |
| 6 | PUNTOS A EVALUAR DE EXAMEN MEDICO DE INGRESO.pdf | ✅ Conservar |
| 7 | Reglamento Interior de Trabajo MA BAKER.pdf | ✅ Conservar |
| 8 | Temario del SGI de inducción para el personal de nuevo ingreso.pdf | ✅ Conservar |
| 9 | Texto pegado (RBAC, módulos, Supabase) | ⚠️ Renombrar o fusionar en fuente maestra |
| 10 | Texto pegado (System Prompt, respuestas psicométricas) | ⚠️ Renombrar o fusionar en fuente maestra |
| 11 | Triptico de curso de induccion.pdf | ✅ Conservar |
| 12 | mb_sgi_safety_auditor_006.md | ✅ Conservar |

### Veredicto general

| Aspecto | Estado |
|---------|--------|
| Limpieza GHL / arquitectura v1 | ✅ Hecho (0 fuentes con GoHighLevel) |
| Duplicados v2.0 / RRHH Gemini | ✅ Eliminados |
| Fuente maestra jun-2026 en cuaderno | ❌ **Falta pegar** `docs/notebooklm-estado-proyecto-jun-2026.md` |
| Nombres descriptivos | ⚠️ 2× «Texto pegado» — renombrar en NotebookLM |
| Listo para consultas operativas | ⚠️ Parcial — falta fuente maestra |

### Acciones pendientes en NotebookLM

1. **Pegar** como «Texto copiado» el archivo `docs/notebooklm-estado-proyecto-jun-2026.md` (título: *Estado del Proyecto jun-2026 — Ma Baker and Chef*).
2. **Renombrar** (clic en ⋮ de cada fuente) los «Texto pegado»:
   - Fuente 9 → *Arquitectura RBAC y módulos Supabase*
   - Fuente 10 → *System Prompt y batería psicométrica*
3. **No eliminar** el PDF de procedimiento RRHH: es documento corporativo; el sistema digital lo automatiza pero el formato legal sigue vigente hasta Fase 6.

### Política de cierre de sesión (agente + equipo)

Al terminar cada sesión de trabajo con impacto en el proyecto, el agente debe:

1. Actualizar este archivo (`docs/notebooklm-estado-proyecto-jun-2026.md`) con fecha, cambios y nuevo inventario si aplica.
2. Actualizar `docs/obsidian/seguimiento-postulacion-y-correos.md`.
3. Actualizar espejo `docs/onenote/seguimiento-ma-baker.md`.
4. Enlazar o nota breve en `README.md` si hay doc nuevo.
5. Indicar al usuario si debe **pegar de nuevo** en NotebookLM (solo cuando cambie arquitectura, fases o flujos).
6. GitHub: commit/push solo si el usuario lo pide.

### Histórico — fuentes ya eliminadas (sesión jun-2026)

- Ecosistema de Reclutamiento Inteligente (×2, GHL)
- Esquema y Flujos Ma Baker (×2, GHL)
- Arquitectura v2.0 duplicada, CONTEXTO 2026-03-07, RRHH Gemini, Texto pegado ElevenLabs, duplicados arquitectura agéntica

### ELIMINAR solo si reaparecen

- Cualquier fuente que mencione **GoHighLevel / GHL**
- Duplicados exactos de títulos ya cubiertos por la fuente maestra

### REEMPLAZAR con este documento (repo)

- CONTEXTO v2.0 (2026-03-07) — ya eliminado
- Sesión de Desarrollo 2026-03-07 — ya eliminado
- Contenido técnico disperso en «Texto pegado» — consolidar al pegar fuente maestra

---

## Pendientes activos (jun-2026)

- [ ] **NotebookLM:** pegar/actualizar este documento como fuente maestra en el cuaderno
- [ ] **NotebookLM:** renombrar los 2 «Texto pegado» con títulos descriptivos
- [ ] **GitHub:** `git push origin main` (7+ commits locales pendientes tras commit 2026-06-14)
- [ ] Producción: `PSYCHOMETRIC_PUBLIC_URL` con dominio real (no localhost)
- [ ] Prueba manual carga .docx vacantes en entorno usuario

---

## Contacto técnico del proyecto

- Repositorio: jesussaes-ai/ma-baker-recruitment
- Dominio correo operativo: admin@mabakerandchef.com, rrhh@mabakerandchef.com
