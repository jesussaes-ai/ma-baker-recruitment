# Repomix — empaquetado de repos para IA

## Qué es

Herramienta de línea de comandos que empaqueta un repositorio completo en un solo archivo optimizado para modelos de IA (resumen + estructura de directorios + contenido). Útil para auditorías de código, generar contexto para el agente, documentación y revisión.

Repo oficial: https://github.com/yamadashy/repomix

## Instalación (global, todos los proyectos)

```bash
npm install -g repomix
repomix --version   # 1.15.0
```

Disponible como comando `repomix` en cualquier carpeta. No requiere clonar el código fuente.

## Configuración global

Archivo (Windows): `%LOCALAPPDATA%\Repomix\repomix.config.json`
(equivalente Linux/Mac: `~/.config/repomix/repomix.config.json`).

Valores por defecto definidos para el equipo:

- Salida **Markdown** (`repomix-output.md`).
- **Security check** activado (detecta API keys, tokens y contraseñas antes de empaquetar).
- Respeta `.gitignore` + ignora `dist`, `build`, `coverage`, `.next`, `*.lock`, `repomix-output.*`.
- Top 10 archivos por tokens; base64 truncado; codificación `o200k_base`.

La config de un proyecto (`repomix.config.json` en su raíz) sobreescribe la global cuando existe.

## Uso rápido

```bash
repomix                      # empaqueta el proyecto actual -> repomix-output.md
repomix --compress           # solo estructura de código (clases/funciones)
repomix --remote user/repo   # empaqueta un repo remoto (clona temporalmente)
repomix --copy               # copia el resultado al portapapeles
repomix --include "app/**"   # solo ciertos archivos
```

## Integración MCP en Cursor

Registrado como servidor MCP global en `~/.cursor/mcp.json`:

```json
"repomix": {
  "command": "cmd",
  "args": ["/c", "npx", "-y", "repomix", "--mcp"]
}
```

Requiere reiniciar/recargar Cursor para que detecte el servidor. Tras eso se puede invocar el empaquetado desde el chat del agente en cualquier proyecto.

## Notas

- `repomix-output.*` está en el `.gitignore` del proyecto: las salidas no se suben a GitHub.
- El security check no garantiza ocultar todos los secretos: revisar antes de compartir el archivo generado.
