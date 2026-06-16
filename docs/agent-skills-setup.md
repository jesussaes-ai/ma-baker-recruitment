# Agent Skills — instalación local (Cursor / Antigravity)

Las skills de terceros **no se versionan** en Git (`.agents/` está en `.gitignore`). Cada desarrollador las instala en su máquina con los comandos de abajo.

Ubicación local del proyecto: `.agents/skills/`

## Fuentes instaladas en este equipo (2026-06)

| Origen GitHub | Comando | Skills |
|---------------|---------|--------|
| [supabase/agent-skills](https://github.com/supabase/agent-skills) | `npx skills add supabase/agent-skills -y` | Supabase, Postgres best practices |
| [sickn33/antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) | `npx antigravity-awesome-skills --path .agents/skills` | Biblioteca amplia (~1.500+) |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `npx skills add vercel-labs/agent-skills -y` | React, deploy Vercel, diseño web |
| [obra/superpowers](https://github.com/obra/superpowers) | `npx skills add obra/superpowers -y` | Planes, TDD, debugging, code review |

## Skills del proyecto (versionadas)

Estas sí viven en el repo bajo `.cursor/skills/`:

- `documentacion-cierre-ma-baker` — cierre Obsidian + README + OneNote + Git
- `ma-baker-brand-name` — nombre oficial **Ma Baker and Chef**
- `supabase-webhook-autopilot` — webhook correos y Edge Functions

## Uso en Cursor

Invocar con `@nombre-skill`, por ejemplo:

- `@supabase` — cambios en RLS, migraciones, Edge Functions
- `@brainstorming` — explorar diseño antes de implementar
- `@deploy-to-vercel` — despliegue frontend
- `@systematic-debugging` — depuración estructurada

## Actualizar

```bash
npx skills update supabase/agent-skills
npx skills update vercel-labs/agent-skills
npx skills update obra/superpowers
npx antigravity-awesome-skills --path .agents/skills
```

## Nota

`skills-lock.json` (generado por `npx skills`) también está ignorado en Git por tamaño. Regenerar con las instalaciones anteriores si hace falta.
