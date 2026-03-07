---
name: github-push
description: Sube un proyecto local de git a un repositorio de GitHub nuevo o existente. Incluye creación del repo via API, configuración del remote, commit y push. Omite archivos sensibles vía .gitignore.
---

# Skill: GitHub Push

## Objetivo
Subir el código de un proyecto local a GitHub de forma segura y reproducible.

## Prerequisitos
- Git instalado y configurado (`git config user.name` y `git config user.email`)
- Un GitHub Personal Access Token (PAT) con scope `repo`
- El directorio del proyecto tiene que tener commits (o al menos un archivo)

## Variables requeridas (preguntar al usuario si no están disponibles)
- `GITHUB_USER` — nombre de usuario GitHub (ej: `jesusSan61`)
- `GITHUB_PAT` — Personal Access Token con scope `repo`
- `REPO_NAME` — nombre del repositorio a crear/usar (ej: `ma-baker-recruitment`)
- `REPO_DESC` — descripción del repositorio
- `PRIVATE` — `true` o `false`
- `PROJECT_DIR` — ruta absoluta al directorio del proyecto

## Pasos

### 1. Verificar si el repositorio ya existe
```powershell
# Busca el repo via MCP github-mcp-server search_repositories
# query: "<REPO_NAME> user:<GITHUB_USER>"
# Si total_count > 0, el repo ya existe → saltar al paso 3
```

### 2. Crear el repositorio en GitHub
Si el MCP falla con 403 (scope insuficiente), usar curl:
```powershell
curl -s -X POST `
  -H "Authorization: token <GITHUB_PAT>" `
  -H "Accept: application/vnd.github.v3+json" `
  https://api.github.com/user/repos `
  -d '{\"name\":\"<REPO_NAME>\",\"description\":\"<REPO_DESC>\",\"private\":<PRIVATE>}'
```

### 3. Proteger archivos sensibles
Asegurarse de que `.gitignore` incluye:
```
.env
.env.*
CREDENCIALES.md
node_modules/
```

### 4. Inicializar git si no existe
```powershell
git -C "<PROJECT_DIR>" init
git -C "<PROJECT_DIR>" config user.email "tu@email.com"
git -C "<PROJECT_DIR>" config user.name "Tu Nombre"
```

### 5. Agregar remote origin
```powershell
# Verificar si ya existe: git remote -v
# Si no existe, agregar:
git -C "<PROJECT_DIR>" remote add origin https://<GITHUB_PAT>@github.com/<GITHUB_USER>/<REPO_NAME>.git

# Si ya existe pero es diferente:
git -C "<PROJECT_DIR>" remote set-url origin https://<GITHUB_PAT>@github.com/<GITHUB_USER>/<REPO_NAME>.git
```

### 6. Commit y push
```powershell
git -C "<PROJECT_DIR>" add .
git -C "<PROJECT_DIR>" commit -m "feat: primera versión del proyecto"
git -C "<PROJECT_DIR>" branch -M main
git -C "<PROJECT_DIR>" push -u origin main
```

### 7. Verificar
```powershell
# Abrir en browser: https://github.com/<GITHUB_USER>/<REPO_NAME>
# O verificar via MCP: github-mcp-server get_file_contents
```

## Errores comunes
| Error | Causa | Solución |
|-------|-------|----------|
| `403 Resource not accessible` | PAT sin scope `repo` | Regenerar PAT en github.com/settings/tokens |
| `remote: Repository not found` | Repo no creado | Ejecutar paso 2 |
| `rejected - non-fast-forward` | Hay commits remotos | `git pull --rebase origin main` primero |
| `Author identity unknown` | Git no configurado | Ejecutar paso 4 |

## Notas de Seguridad
⚠️ El PAT se embebe en la URL del remote — es temporal. Después del push puedes quitarlo con:
```powershell
git -C "<PROJECT_DIR>" remote set-url origin https://github.com/<GITHUB_USER>/<REPO_NAME>.git
```
