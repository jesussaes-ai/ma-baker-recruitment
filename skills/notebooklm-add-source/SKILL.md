---
name: notebooklm-add-source
description: Agrega fuentes de texto, URLs o documentos de Drive a un notebook existente en NotebookLM. Incluye búsqueda del notebook, lectura de archivo local y subida como texto pegado.
---

# Skill: NotebookLM — Agregar Fuente

## Objetivo
Añadir contexto de proyecto (docs de arquitectura, contexto, prompts del sistema) a un notebook de NotebookLM para que el AI tenga conocimiento del proyecto.

## Prerequisitos
- MCP `notebooklm` configurado y autenticado
- Si hay error de auth: ejecutar `notebooklm-mcp-auth` en terminal
- El notebook destino ya debe existir (o se crea uno nuevo)

## Variables requeridas
- `NOTEBOOK_TITLE` — palabra clave para buscar el notebook (ej: `ma baker`)
- `SOURCE_FILE` — ruta al archivo local a agregar como fuente
- `SOURCE_TITLE` — título descriptivo para la fuente

## Pasos

### 1. Verificar autenticación
```
# Si falla la siguiente operación con "Authentication expired":
# Ejecutar en terminal: notebooklm-mcp-auth
# Luego llamar: mcp_notebooklm_refresh_auth
```

### 2. Listar notebooks y encontrar el destino
```
# Herramienta: mcp_notebooklm_notebook_list (max_results: 20)
# Buscar en la lista por título que contenga NOTEBOOK_TITLE
# Guardar el notebook_id del resultado
```

### 3. Verificar fuentes existentes
```
# Herramienta: mcp_notebooklm_notebook_get (notebook_id)
# Revisar si SOURCE_TITLE ya existe como fuente
# Si ya existe → no agregar duplicado
```

### 4a. Agregar archivo local como texto pegado
```
# Leer el archivo con view_file o read_file
# Herramienta: mcp_notebooklm_notebook_add_text
#   notebook_id: <del paso 2>
#   text: <contenido del archivo>
#   title: <SOURCE_TITLE>
```

### 4b. Agregar URL como fuente
```
# Herramienta: mcp_notebooklm_notebook_add_url
#   notebook_id: <del paso 2>
#   url: <URL pública>
```

### 4c. Agregar Google Drive
```
# Herramienta: mcp_notebooklm_notebook_add_drive
#   notebook_id: <del paso 2>
#   document_id: <ID del documento de la URL de Drive>
#   title: <SOURCE_TITLE>
#   doc_type: doc | slides | sheets | pdf
```

### 5. Crear notebook nuevo si no existe
```
# Herramienta: mcp_notebooklm_notebook_create
#   title: <NOTEBOOK_TITLE>
# Luego usar el notebook_id retornado en el paso 4
```

### 6. Verificar que se agregó
```
# Herramienta: mcp_notebooklm_notebook_get (notebook_id)
# Confirmar que SOURCE_TITLE aparece en sources
```

## Archivos útiles para agregar como fuente en proyectos
| Archivo | Descripción |
|---------|-------------|
| `CONTEXTO.md` | Resumen general del proyecto |
| `docs/architecture.md` | Arquitectura técnica |
| `prompts/system_prompt.md` | Prompt del sistema del agente IA |
| `README.md` | Descripción del proyecto |
| `database/schema.sql` | Estructura de la base de datos |

## Errores comunes
| Error | Causa | Solución |
|-------|-------|----------|
| `Authentication expired` | Token expirado | `notebooklm-mcp-auth` en terminal |
| `RPC error` | Sesión caducada | Repetir autenticación |
| `Source already exists` | Duplicado | Verificar con notebook_get primero |
| `Source limit reached` | >50 fuentes | Eliminar fuentes antiguas primero |
