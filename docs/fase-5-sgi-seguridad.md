# Fase 5 — Inducción SGI y Seguridad e Higiene

## Objetivo

Permitir que los dashboards de Calidad (SGI) y Seguridad e Higiene evalúen candidatos y avancen fases usando RPC con sesión, sin depender de `PATCH` anónimo sobre `candidatos_activos`.

## Flujo de fases

```
induccion_sgi
    → (SGI: 7 puntos de calidad/inocuidad)
induccion_seguridad
    → (Seguridad: 7 puntos EPP, IMSS, emergencias)
listo_para_contrato
    → (Fase 6: contratación / onboarding)
```

## Componentes

| Pieza | Ubicación |
|-------|-----------|
| Dashboard SGI | `app/dashboard-sgi.html` |
| Dashboard Seguridad | `app/dashboard-seguridad.html` |
| API RPC | `app/js/candidates-api.js` |
| Migración SQL | `database/migracion-fase5-sgi-seguridad.sql` |

## RPC

- `fn_candidatos_list` — rol `sgi` ve fases de inducción; rol `seguridad` ve `induccion_seguridad` y posteriores.
- `fn_candidato_update` — roles `sgi` y `seguridad` fusionan `decision_agente` (no pisan datos SGI al guardar Seguridad).

## Aplicar migración

SQL Editor o MCP Supabase con el contenido de `database/migracion-fase5-sgi-seguridad.sql`.

## Prueba rápida

1. Candidato en `induccion_sgi` (jefe aprobó).
2. Login `sgi@mabakerandchef.com` → evaluar 7 puntos → fase `induccion_seguridad`.
3. Login `seguridad@mabakerandchef.com` → verificar 7 puntos S&H → fase `listo_para_contrato`.

## Siguiente fase (Fase 6)

Contratación implementada: panel **Contratación** en dashboard RRHH/Admin, checklist uniforme/EPP/firmas → `fase_actual = contratado`. Ver `docs/fase-6-contratacion.md`.
