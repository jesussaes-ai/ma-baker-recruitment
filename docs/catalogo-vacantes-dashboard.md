# Catálogo de vacantes en dashboard (Admin / RRHH)

## Modelo en dos capas (independientes)

| Capa | Menú | Qué es | Persistencia |
|------|------|--------|--------------|
| **Descripción de puesto** | Descripciones de Puesto | Descriptivo completo (PDF/Word). Biblioteca RRHH. | **Siempre visible** para ver/editar. Publicar vacante **no la borra ni la oculta**. |
| **Vacante en portal** | Publicar vacantes + Catálogo Vacantes | Vista pública para candidatos con **campos opcionales** (`portal_campos_visibles`). | `activo = true` solo controla visibilidad en `index.html`. Pausar quita del portal; el descriptivo sigue en RRHH. |

## Flujo operativo

1. **Subir / editar descripciones** → `Descripciones de Puesto`. Todas las descripciones aparecen siempre en la tabla.
2. **Crear vacante** → `Publicar vacantes` → botón **Crear vacante** / **Editar vacante** → modal con checkboxes de campos opcionales → **Publicar en portal**.
3. **Gestionar vacantes activas** → menú **Catálogo Vacantes** (vacantes en portal): editar campos visibles, pausar, ver descriptivo origen.
4. **Eliminar** → solo con botón Eliminar en Descripciones (acción irreversible). Para ocultar del portal usar **Pausar** o **Quitar del portal**.

## Campos opcionales en portal (`portal_campos_visibles`)

Siempre visibles: **nombre**, **departamento**.

Opcionales (checkbox en modal):

- Descripción / resumen
- Escolaridad mínima
- Experiencia requerida
- Rango de edad
- Rango salarial
- Conocimientos técnicos
- Competencias clave

Migración SQL: `database/migracion-vacantes-portal-campos.sql` (remota: `vacantes_portal_campos`).

## Ubicación en dashboard

- `dashboard-admin.html` / `dashboard-rrhh.html`
- **Descripciones de Puesto** — biblioteca permanente
- **Publicar vacantes** — configurar vacante pública por descripción
- **Catálogo Vacantes** — solo vacantes activas en portal

## Backend

- Lectura admin/RRHH: RPC `fn_catalogo_puestos_list` (todas las descripciones).
- Lectura portal: REST `catalogo_puestos?activo=eq.true` (RLS).
- Escritura: `fn_catalogo_puesto_insert` / `fn_catalogo_puesto_update` (incluye `portal_campos_visibles`).
- Portal candidato (`index.html` + `app.js`): tarjetas respetan los mismos campos visibles; resumen con `job-description-format.js`.
- Subida nueva: `activo = false` por defecto (sin vacante en portal hasta publicar).
- **Código interno (`codigo_puesto`):** se genera único por archivo (nombre + sufijo aleatorio). Las plantillas Word compartían el mismo «Código/Clave» y provocaban error rojo en lote; corregido en `vacantes-pdf-upload.js` + RPC insert (`migracion-vacantes-codigo-unico-insert.sql`).

## Scripts frontend

- `app/js/job-description-format.js` — convierte texto PDF/Word en HTML legible (`MB_JOB_DESC.formatHtml`): secciones, subtítulos, viñetas, `Etiqueta: valor`; skill `.cursor/skills/descriptivo-puesto-legible/SKILL.md`
- `app/js/portal-vacante-config.js` — defaults y checkboxes
- `app/js/vacantes-api.js`
- `app/js/vacantes-pdf-upload.js`
- `app/js/dashboard.js`
- `app/js/app.js` — tarjetas del portal respetan campos visibles
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
