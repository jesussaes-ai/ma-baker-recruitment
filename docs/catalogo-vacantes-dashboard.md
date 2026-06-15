# Catálogo de vacantes en dashboard (Admin / RRHH)

## Flujo en dos pasos

1. **Subir descripciones** (`cargar-puestos.html` o botón en dashboard) → guarda en biblioteca con `activo = false`. Los candidatos **no** las ven.
2. **Publicar vacantes** (`cargar-puestos.html` → menú *Publicar vacantes*) → marca `activo = true`. Solo esas aparecen en `index.html` (portal de postulación).

El campo `activo` en `catalogo_puestos` significa **visible en portal**, no solo “pausada”.

## Ubicación

`dashboard-admin.html` o `dashboard-rrhh.html` → menú lateral **Catálogo Vacantes**.

## Funciones en la misma pantalla

1. **Ver descripciones PDF** — botón *Ver descripción* por vacante (texto completo extraído del PDF, requisitos, sueldo, archivo origen).
2. **Editar vacantes** — botón *Editar*. Incluye toggle **Publicada en portal** (`activo`).
3. **Subir descripciones** — importa a biblioteca (no publica automáticamente).
4. **Filtros** — Publicadas / Solo biblioteca / Todas.
5. **Toggle rápido** — interruptor en tabla = visible en portal de postulación.

## Backend

- Lectura: `catalogo_puestos` (RLS anon SELECT).
- Escritura: RPC con sesión
  - `fn_catalogo_puesto_update` (incluye `codigo_puesto`, `nombre_archivo_fuente`)
  - `fn_catalogo_puesto_insert`
- Migración: `database/migracion-vacantes-rpc.sql` (+ `database/migracion-vacantes-array-fields.sql` / remota `vacantes_array_fields_coalesce_fix`)
- `conocimientos_tecnicos` y `competencias_clave` son `text[]` en BD; la RPC convierte texto CSV con `fn_texto_a_text_array`.

## Scripts frontend

- `app/js/vacante-document-parser.js` — extracción de texto (PDF, Word, Excel, PowerPoint, OpenDocument, HTML/RTF/CSV)
- `app/js/vacantes-api.js`
- `app/js/vacantes-pdf-upload.js`
- `app/js/dashboard.js` (tabla, modales, filtros)

### Formatos aceptados al subir descripciones

| Origen | Extensiones |
|--------|-------------|
| PDF | `.pdf` |
| Microsoft | `.docx`, `.xlsx`, `.pptx` (`.doc`/`.ppt` antiguos: guardar como formato moderno) |
| Google | Exportar desde Docs/Sheets como `.docx`, `.xlsx` o `.pdf` (no enlaces `.gdoc`) |
| OpenDocument | `.odt`, `.ods`, `.odp` |
| Texto | `.txt`, `.csv`, `.rtf`, `.html` |

Límite: 20 MB por archivo. Librerías CDN: PDF.js, Mammoth, SheetJS, JSZip.

## Dashboard Admin / RRHH (extras)

- **Ajustes del Sistema:** sesión, tema claro/oscuro, enlace al portal, accesos rápidos.
- **Notificaciones (campana):** vacantes sin publicar, candidatos nuevos (7 días), psicométricos, fase médica.
- **Logs del Sistema:** RPC `fn_sistema_logs_list` con token `mb_token` (roles admin/rrhh). No usar REST anon sobre `log_agente`.
- Migración SQL: `database/migracion-sistema-logs-rpc.sql` (remota: `sistema_logs_list_rpc`).

## Nota

La pantalla `cargar-puestos.html` sigue disponible como módulo dedicado; el dashboard integra las mismas capacidades para operación diaria sin cambiar de pantalla.

### Requisitos de `cargar-puestos.html`

- Debe cargar `js/config.js` en el `<head>` antes de scripts que usen `window.MB_CONFIG`.
- Escritura (subir PDF, pausar/activar): `js/vacantes-api.js` → RPC `fn_catalogo_puesto_insert` / `fn_catalogo_puesto_update` con token de sesión (`mb_token`).
- **Logs del sistema:** RPC `fn_sistema_logs_list` (admin/rrhh) — unifica `log_agente`, postulaciones, rechazos y vacantes.
- Lectura del catálogo: REST anon sobre `catalogo_puestos` (RLS: solo vacantes `activo = true`).
