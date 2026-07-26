# Auditoría de readiness — 2026-07-25

**Proyecto:** Ma Baker and Chef — Reclutamiento  
**Método:** pruebas API contra Supabase + UI física con Playwright en `http://localhost:8080`  
**Scripts:** `scripts/audit-readiness.mjs`, `scripts/audit-ui-deep.mjs`  
**Artefactos:** `tmp/audit-readiness/` (reporte JSON + capturas)

## Veredicto

| Momento | Resultado |
|---------|-----------|
| Mañana (auditoría inicial) | **NO LISTO** — 2 FAIL + varios bloqueantes |
| Noche (post paquete go-live, aprobado por Telegram) | **LISTO_CON_RESERVAS** — 46 PASS / 0 FAIL / 1 WARN |

Reserva principal: `PSYCHOMETRIC_PUBLIC_URL` sigue en localhost (enlaces psicométricos no sirven fuera de la PC de desarrollo). Falta prueba E2E con candidato real.

## Qué se corrigió en el paquete go-live (Telegram ✅)

1. **Migración** `fix_rechazados_token_sesion` — `fn_prospectos_rechazados_list` usa `token_sesion` / `token_expira` → RPC HTTP 200.
2. **Edge** `upload-candidato-document` desplegada (v4, `verify_jwt: false`) → ya no 404.
3. **Correos** — probe `send-postulacion-emails` → **200** vía proveedor **SMTP** (`mabakerandchef.com`).
4. **Vacantes** — hay **10** activas (anon); portal puede listar reales.
5. **Login** — `login.html` carga `runtime-config.js` + `config.js` (acceso rápido demo OK).

## Re-auditoría noche (resumen)

| Área | Resultado |
|------|----------|
| Login admin + guard RBAC | PASS |
| Dashboards (rrhh, médico, jefe, sgi, seguridad, puestos, ayuda) | PASS |
| Catálogo / candidatos / logs / rechazos RPC | PASS |
| Edges correo, psicométricos, upload | PASS (endpoints vivos) |
| Vacantes activas (portal fetch) | PASS (10) |
| `PSYCHOMETRIC_PUBLIC_URL` | WARN (localhost) |

## Pendientes restantes

- [ ] Dominio real en `PSYCHOMETRIC_PUBLIC_URL` y `POSTULACION_PUBLIC_URL` (runtime / hosting)
- [ ] Prueba E2E: postulación → correo → score → psicométricos → … → contratación
- [ ] Usuario rol `seguridad` si se usará ese dashboard
- [ ] NotebookLM: re-pegar `docs/notebooklm-estado-proyecto-jun-2026.md`
- [ ] Commit/push GitHub cuando lo pidas

## Datos (noche)

| Métrica | Valor |
|---------|-------|
| Descriptivos | 33 |
| Vacantes activas | 10 |
| RPC rechazos | OK (0 filas) |
| Correo Edge | SMTP OK |

## Cómo repetir la auditoría

```powershell
cd app
python serve.py
# otra terminal:
npm run audit:readiness
npm run audit:ui-deep
```
