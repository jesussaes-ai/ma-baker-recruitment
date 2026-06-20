# Ma Baker and Chef — Seguimiento de Reclutamiento (espejo OneNote)

> Copiar o sincronizar este archivo con el cuaderno OneNote del equipo.
> El agente actualiza este espejo al cerrar cada sesión relevante.

---

## 2026-06-16 — Descripciones vs vacantes (independientes)

- **Descripciones de Puesto:** biblioteca permanente; editar/ver/eliminar; no desaparecen al publicar.
- **Publicar vacantes:** modal con campos opcionales para candidatos (sueldo, escolaridad, etc.).
- **Catálogo Vacantes:** solo vacantes activas en portal; pausar no borra descriptivo. **Ver descriptivo** con formato legible (secciones/viñetas, skill `descriptivo-puesto-legible`).
- **Migración Supabase:** `vacantes_portal_campos` — columna `portal_campos_visibles`.
- **Docs:** `docs/catalogo-vacantes-dashboard.md`

---

- **Problema:** descripciones subidas/publicadas parecían borradas al cambiar pantalla (filtro «Solo biblioteca» ocultaba las publicadas).
- **Corrección:** filtro Todas por defecto; contadores; recarga al entrar al panel; auto-switch si biblioteca vacía; botón Ver publicadas navega bien.
- **Validado en código:** `app/js/dashboard.js` — pendiente Ctrl+F5 en dashboard RRHH/Admin.
- **Docs:** `docs/catalogo-vacantes-dashboard.md`

---

- **Problema:** texto plano del PDF sin jerarquía; modal plano e ilegible en modo claro.
- **Formato sección identificación:** todos los campos del descriptivo (p. ej. Puestos que supervisa, Tipo de jornada, Modalidad) en línea `Etiqueta: valor`; emparejamiento aunque haya líneas vacías entre PDF/Word.
- **Verificar:** dashboard Admin/RRHH → Vacantes → Ver; alternar tema.

---

- **Cambio:** `fn_candidatos_list` / `fn_candidato_update` con roles `sgi` y `seguridad`; dashboards dejan REST anon.
- **Flujo:** `induccion_sgi` → `induccion_seguridad` → `listo_para_contrato`.
- **SQL:** `database/migracion-fase5-sgi-seguridad.sql` (remota: `fase5_sgi_seguridad_rpc`).
- **Pendiente:** Fase 6 contratación (uniforme, EPP, firmas).
- **Docs:** `docs/fase-5-sgi-seguridad.md`

---

## 2026-06-16 — Auditoría NotebookLM (12 fuentes)

- **Resultado:** cuaderno limpio (sin GHL); 12 fuentes legales + técnicas.
- **Pendiente:** pegar `docs/notebooklm-estado-proyecto-jun-2026.md`; renombrar 2 «Texto pegado».
- **Procedimiento RRHH.pdf:** conservar (documento corporativo; Fase 6 lo digitalizará).
- **Cierre sesión:** agente actualiza repo + indica si hay que re-pegar en NotebookLM.

---

## 2026-06-16 — NotebookLM cuaderno sincronizado

- **Cuaderno:** https://notebooklm.google.com/notebook/611114f3-ebc0-4db5-bc74-bda2a78b2fbd
- **Fuente maestra:** `docs/notebooklm-estado-proyecto-jun-2026.md` — estado jun-2026, fases 1–5, sin GoHighLevel.
- **Acción manual:** pegar fuente maestra en NotebookLM; eliminar ~13 fuentes obsoletas (lista en el doc).
- **MCP Cursor:** biblioteca actualizada; herramienta `add_source` no disponible hasta reiniciar MCP / liberar perfil Chrome.

---

## 2026-06-16 — Agent skills Cursor (local)

- **Fuentes:** Supabase, antigravity-awesome-skills, Vercel, obra/superpowers.
- **Carpeta local:** `.agents/skills/` (gitignored, ~60 MB).
- **Runbook:** `docs/agent-skills-setup.md`
- **Push GitHub:** documentación + 5 commits pendientes de sesiones anteriores.

---

## 2026-06-14 — Logs del sistema habilitados

- **Cambio:** RPC `fn_sistema_logs_list` (admin/rrhh) unifica auditoría: IA, postulaciones, rechazos, vacantes.
- **Impacto operativo:** panel *Logs del Sistema* deja de mostrar vacío por RLS; botón *Actualizar logs*.
- **Validado:** RPC aplicada en Supabase remoto.
- **Pendiente:** eventos aparecen al subir vacantes o recibir postulaciones.
- **Docs relacionados:** `database/migracion-sistema-logs-rpc.sql`, `docs/catalogo-vacantes-dashboard.md`, `app/ayuda.html`

---

## 2026-06-14 — Fork Handy.Computer (STT offline)

- **GitHub:** https://github.com/jesussaes-ai/Handy.Computer (fork de RicoSaupeB/Handy.Computer)
- **Clon local:** `C:\Users\jesus\.gemini\antigravity\scratch\Handy.Computer`
- **Uso:** speech-to-text offline cuando se requiera; no integrado al portal Ma Baker.
- **Docs:** README Ma Baker § Herramientas externas

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

## 2026-06-14 — Portal candidato + push GitHub

- **Portal:** tarjetas con campos opcionales `portal_campos_visibles`; resumen legible; chips conocimientos/competencias.
- **GitHub:** push `main` hasta commit `4b0265a`.

---

## 2026-06-14 — Modal Ver descriptivo y formato legible

- **Ver descriptivo:** clic corregido; modal `#modalVerVacante` con tema claro/oscuro uniforme.
- **Formato PDF:** `job-description-format.js` (secciones, viñetas, sin bloque MAYÚSCULAS).
- **Skill:** `.cursor/skills/descriptivo-puesto-legible/SKILL.md`
- **Commit local:** `f21e20a` (2026-06-14). Push remoto pendiente.

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
