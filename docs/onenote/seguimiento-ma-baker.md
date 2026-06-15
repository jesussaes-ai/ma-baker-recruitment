# Ma Baker and Chef — Seguimiento de Reclutamiento (espejo OneNote)

> Copiar o sincronizar este archivo con el cuaderno OneNote del equipo.
> El agente actualiza este espejo al cerrar cada sesión relevante.

---

## 2026-06-14 — Logs del sistema habilitados

- **Cambio:** RPC `fn_sistema_logs_list` (admin/rrhh) unifica auditoría: IA, postulaciones, rechazos, vacantes.
- **Impacto operativo:** panel *Logs del Sistema* deja de mostrar vacío por RLS; botón *Actualizar logs*.
- **Validado:** RPC aplicada en Supabase remoto.
- **Pendiente:** eventos aparecen al subir vacantes o recibir postulaciones.
- **Docs relacionados:** `database/migracion-sistema-logs-rpc.sql`, `docs/catalogo-vacantes-dashboard.md`, `app/ayuda.html`

---

## 2026-06-14 — Ayuda contextual RRHH/Admin

- **Cambio:** `app/ayuda.html` documenta multi-formato, publicar, campana, ajustes y logs.
- **Tooltips:** `data-help` en Ajustes, Logs y campana (dashboards Admin/RRHH).
- **Impacto operativo:** botón Ayuda flotante enlaza guías actualizadas por rol.

---

## 2026-06-14 — Ajustes y notificaciones en dashboard

- **Ajustes del Sistema:** panel con sesión, tema claro/oscuro, portal y accesos rápidos.
- **Campana:** alertas de vacantes sin publicar, candidatos nuevos (7 días), psicométricos y fase médica.
- **Pantallas:** `dashboard-admin.html`, `dashboard-rrhh.html`, lógica en `dashboard.js`.

---

## 2026-06-14 — Carga multi-formato de descripciones de puesto

- **Cambio:** Subida de vacantes acepta PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), OpenDocument y exportados de Google (no enlaces .gdoc).
- **Módulo:** `app/js/vacante-document-parser.js` (PDF.js, Mammoth, SheetJS, JSZip vía CDN).
- **Pantallas:** `cargar-puestos.html`, dashboards Admin/RRHH (panel Catálogo Vacantes).
- **Fix previo:** `cargar-puestos.html` requiere `config.js` + RPC con sesión para escritura.
- **Validado:** pendiente prueba manual con .docx del usuario.
- **Docs:** `docs/catalogo-vacantes-dashboard.md`

---

## 2026-06-10 — Catálogo vacantes integrado en dashboard

- **Cambio:** Panel *Catálogo Vacantes* en admin/RRHH: ver descripción PDF, editar activas, subir PDFs, filtros Activas/Pausadas.
- **RPC:** `fn_catalogo_puesto_update` / `fn_catalogo_puesto_insert`.
- **Docs:** `docs/catalogo-vacantes-dashboard.md`

---

## 2026-06-10 — Fase 4 médico + jefe + correos reenviados

- **Correos:** Reenviados OK tras fix `verify_jwt: false` en `send-postulacion-emails` v7 (Gmail 200).
- **Fase 4:** Cierre psicométricos actualiza candidato; RRHH → médico → jefe vía RPC con sesión.
- **SQL aplicado:** `migracion-fase4-medico-jefe.sql` (`fn_candidatos_list`, `fn_candidato_update`, columna `veredicto_jefe`).
- **Pendiente:** Fase 5 SGI/seguridad. Commit/push cuando se pida.
- **Docs:** `docs/fase-4-medico-jefe.md`, runbook §401 JWT

---

## 2026-06-10 — Fase 3 psicométricos (link automático)

- **Cambio:** Edge Function `setup-psicometric-access` + integración en `app.js` al promover candidato (≥80%).
- **Flujo:** token UUID → correo con link → `evaluacion-candidato.html` → RRHH ve resultados.
- **RLS:** políticas anon para portal psicométrico aplicadas (`migracion-fase3-psicometricos.sql`).
- **Pendiente:** Fase 5 (SGI + seguridad). Producción: cambiar `PSYCHOMETRIC_PUBLIC_URL` a dominio real.
- **Docs:** `docs/fase-3-psicometricos.md`

---

## 2026-06-10 — Skill auto-aprendizaje (todos los proyectos)

- **Cambio:** Meta-skill personal `auto-skill-from-learning` en `~/.cursor/skills/`. Crea skills al detectar patrones y avisa con bloque "Skill aprendida".
- **Primera skill derivada:** `supabase-edge-secrets-not-vault` (Vault ≠ Edge Function secrets).
- **Registro:** `~/.cursor/skills/auto-skill-from-learning/registry.md`
- **Docs relacionados:** README Ma Baker (nota skills globales)

---

## 2026-06-09 — Correo multiproveedor operativo (Gmail)

- **Cambio:** Edge Function `send-postulacion-emails` con failover Gmail/Resend/Postmark/Brevo. Secretos cargados vía `supabase secrets set` (no solo Vault SQL).
- **Impacto operativo:** Postulación guarda en BD; correos candidato + reclutador vía Gmail. Override de prueba: `jesussaes@gmail.com`.
- **Validado:** Insert anon con `return=minimal` + UUID en cliente. Gmail responde HTTP 200.
- **Pendiente:** Fase 3 psicométricos (link automático al promovido). Rotar secretos OAuth expuestos en chat. Commit/push GitHub cuando se pida.
- **Docs relacionados:** `docs/RUNBOOK-CORREO-MULTIPROVEEDOR.md`, `docs/obsidian/seguimiento-postulacion-y-correos.md`

---

## Índice de temas

| Tema | Archivo en repo |
|------|-----------------|
| Postulación y correos | `docs/obsidian/seguimiento-postulacion-y-correos.md` |
| Runbook correo | `docs/RUNBOOK-CORREO-MULTIPROVEEDOR.md` |
| Cambios de implementación | `docs/RECMI.md` |
| Contexto general | `docs/CONTEXTO.md` |
