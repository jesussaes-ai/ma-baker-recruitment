# Fase 3 — Evaluaciones psicométricas

## Objetivo

Automatizar el acceso del candidato promovido (score ≥ 80%) a las baterías psicométricas en línea.

## Flujo

1. Candidato completa postulación con score ≥ 80% → `candidatos_activos` + `fase_actual = espera_psicometricos`.
2. Frontend llama Edge Function `setup-psicometric-access` con `candidatoId`.
3. Se crea (o reutiliza) registro en `evaluaciones_psicometricas` con `token_acceso` UUID y vigencia 7 días.
4. Se envía correo al candidato con enlace: `evaluacion-candidato.html?token=...`
5. Candidato completa baterías en `evaluacion-candidato.html`.
6. RRHH revisa respuestas en dashboard (`dashboard-rrhh.html` → pestaña Psicométricos).

## Componentes

| Pieza | Ubicación |
|-------|-----------|
| Edge Function setup | `supabase/functions/setup-psicometric-access/index.ts` |
| Portal candidato | `app/evaluacion-candidato.html` |
| Integración postulación | `app/js/app.js` → `setupPsychometricAccess()` |
| Migración RLS anon | `database/migracion-fase3-psicometricos.sql` |
| Config runtime | `PSYCHOMETRIC_SETUP_WEBHOOK_URL`, `PSYCHOMETRIC_PUBLIC_URL` |

## Variables

### Frontend (`runtime-config.js`)

```javascript
PSYCHOMETRIC_SETUP_WEBHOOK_URL: "https://<REF>.functions.supabase.co/setup-psicometric-access"
PSYCHOMETRIC_PUBLIC_URL: "https://tu-dominio/evaluacion-candidato.html"
```

### Supabase Secrets (Edge Function)

- `PSYCHOMETRIC_PUBLIC_URL` — URL base del portal (producción)
- `PSYCHOMETRIC_TOKEN_TTL_DAYS` — opcional, default 7

## Deploy

```bash
npx supabase functions deploy setup-psicometric-access --project-ref <REF>
npx supabase secrets set --project-ref <REF> PSYCHOMETRIC_PUBLIC_URL="https://..."
```

Aplicar SQL:

```bash
# Contenido de database/migracion-fase3-psicometricos.sql en SQL Editor o via CLI
```

## Prueba rápida

```bash
curl -X POST "https://<REF>.functions.supabase.co/setup-psicometric-access" \
  -H "Content-Type: application/json" \
  -d '{"candidatoId":"<UUID>","publicBaseUrl":"http://localhost:8080/evaluacion-candidato.html"}'
```

Esperado: `"ok":true,"link":"...?token=..."`

## Siguiente fase (Fase 5)

- Inducción SGI (`dashboard-sgi.html`) y seguridad (`dashboard-seguridad.html`)
- Ver: `docs/fase-4-medico-jefe.md` para el flujo médico/jefe ya implementado
