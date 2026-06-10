# Ma Baker and Chef — Seguimiento de Reclutamiento (espejo OneNote)

> Copiar o sincronizar este archivo con el cuaderno OneNote del equipo.
> El agente actualiza este espejo al cerrar cada sesión relevante.

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
