# Fase 6 — Contratación

## Objetivo

Cerrar el ciclo de reclutamiento registrando uniforme, EPP, firmas legales y fecha de alta, avanzando la fase a `contratado`.

## Flujo

```
listo_para_contrato
    → (RRHH/Admin: checklist de 4 puntos + fecha)
contratado
```

## Checklist obligatorio

| Campo BD | Descripción |
|----------|-------------|
| `entrega_uniforme` | Uniforme entregado |
| `entrega_epp` | EPP entregado |
| `firma_reglamento` | Reglamento interno firmado |
| `firma_confidencialidad` | Acuerdo de confidencialidad firmado |
| `fecha_contratacion` | Fecha de alta |

Solo se permite `fase_actual = contratado` cuando los cuatro booleanos están en `true`.

## Componentes

| Pieza | Ubicación |
|-------|-----------|
| Panel dashboard | `app/dashboard-rrhh.html`, `app/dashboard-admin.html` — menú **Contratación** |
| Lógica UI | `app/js/contratacion-panel.js` |
| Controlador | `app/js/dashboard.js` (notificaciones + carga de datos) |
| API RPC | `app/js/candidates-api.js` → `fn_candidato_update` |
| Migración SQL | `database/migracion-fase6-contratacion.sql` |

## Aplicar migración

SQL Editor o MCP Supabase con el contenido de `database/migracion-fase6-contratacion.sql`.

## Prueba rápida

1. Candidato en `listo_para_contrato` (Seguridad e Higiene completó inducción).
2. Login `rrhh@mabakerandchef.com` → panel **Contratación**.
3. Marcar los 4 puntos + fecha → **Finalizar contratación**.
4. Verificar fase `contratado` y registro en historial del panel.

## Documento corporativo

El PDF *PROCEDIMIENTO A SEGUIR EN LA CONTRATACION DE PERSONAL RRHH* sigue siendo referencia legal; este módulo digitaliza el checklist operativo, no sustituye el formato legal hasta que RRHH lo decida.
