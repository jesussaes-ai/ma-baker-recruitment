# Fase 4 — Médico y Jefe de Área

## Objetivo

Conectar el cierre de psicométricos con la evaluación médica y la evaluación técnica del jefe, usando dashboards existentes y acceso seguro vía RPC con sesión.

## Flujo de fases

```
espera_psicometricos
    → (candidato termina evaluacion-candidato.html)
psicometricos_realizados
    → (RRHH: botón "Enviar a médico")
espera_medico
    → (médico: dictamen APTO / CONDICIONADO / NO APTO)
espera_jefe  |  rechazado_medico
    → (jefe: APROBADO / RECHAZADO)
induccion_sgi  |  rechazado_jefe
```

## Componentes

| Pieza | Ubicación |
|-------|-----------|
| Cierre psicométricos + scores | `app/evaluacion-candidato.html` |
| Botón RRHH "Enviar a médico" | `app/js/dashboard.js` → `avanzarAMedico()` |
| Reenvío link psicométrico | `app/js/dashboard.js` → `prepararPsicometrico()` |
| API RPC con sesión | `app/js/candidates-api.js` |
| Dashboard médico | `app/dashboard-medico.html` |
| Dashboard jefe | `app/dashboard-jefe.html` |
| Migración SQL | `database/migracion-fase4-medico-jefe.sql` |

## RPC (Supabase)

- `fn_candidatos_list(p_token, p_incluir_medico)` — lista candidatos según rol y sesión.
- `fn_candidato_update(p_token, p_id, p_payload)` — actualiza campos permitidos por rol.

Los dashboards ya no dependen de `SELECT` anónimo sobre `candidatos_activos` (bloqueado por RLS).

## Aplicar migración

```bash
# SQL Editor o:
# Contenido de database/migracion-fase4-medico-jefe.sql
```

## Prueba rápida

1. Login RRHH → candidato en `psicometricos_realizados` → **Enviar a médico**.
2. Login médico (`medico@mabakerandchef.com`) → evaluar → dictamen APTO → fase `espera_jefe`.
3. Login jefe (`jefe@mabakerandchef.com`) → veredicto APROBADO → fase `induccion_sgi`.

## Siguiente fase (Fase 5)

- Inducción SGI (`dashboard-sgi.html`)
- Seguridad e inducción (`dashboard-seguridad.html`)
