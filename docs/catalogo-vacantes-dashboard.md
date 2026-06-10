# Catálogo de vacantes en dashboard (Admin / RRHH)

## Ubicación

`dashboard-admin.html` o `dashboard-rrhh.html` → menú lateral **Catálogo Vacantes**.

## Funciones en la misma pantalla

1. **Ver descripciones PDF** — botón *Ver descripción* por vacante (texto completo extraído del PDF, requisitos, sueldo, archivo origen).
2. **Editar vacantes activas** — botón *Editar* o *Editar vacante* desde el modal de lectura. Todos los campos son editables:
   - **Nombre del puesto** — textarea con autoaltura (sin truncar títulos largos).
   - **Código de vacante** y **archivo PDF origen**.
   - Departamento, sueldos, edad, escolaridad (texto libre con sugerencias), descriptivo completo, conocimientos, competencias, activo/pausada.
3. **Subir nuevos PDFs** — botón *Subir descripciones PDF* (drag & drop o selección múltiple).
4. **Filtros** — Activas / Pausadas / Todas (por defecto: Activas).
5. **Toggle rápido** — interruptor en tabla para publicar o pausar sin abrir el modal.

## Backend

- Lectura: `catalogo_puestos` (RLS anon SELECT).
- Escritura: RPC con sesión
  - `fn_catalogo_puesto_update` (incluye `codigo_puesto`, `nombre_archivo_fuente`)
  - `fn_catalogo_puesto_insert`
- Migración: `database/migracion-vacantes-rpc.sql` (+ `database/migracion-vacantes-array-fields.sql` / remota `vacantes_array_fields_coalesce_fix`)
- `conocimientos_tecnicos` y `competencias_clave` son `text[]` en BD; la RPC convierte texto CSV con `fn_texto_a_text_array`.

## Scripts frontend

- `app/js/vacantes-api.js`
- `app/js/vacantes-pdf-upload.js`
- `app/js/dashboard.js` (tabla, modales, filtros)

## Nota

La pantalla `cargar-puestos.html` sigue disponible como módulo dedicado; el dashboard integra las mismas capacidades para operación diaria sin cambiar de pantalla.
