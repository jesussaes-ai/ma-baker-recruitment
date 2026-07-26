---
name: telegram-remoto-cursor
description: >-
  Cableado Telegram↔Cursor para TODOS los proyectos de Jesús: resúmenes al
  cerrar turnos, aprobaciones sensibles, preguntas remotas y ejecución de
  acciones vía bot. Usar SIEMPRE al empezar/retomar un proyecto y cuando falte
  el puente (hooks, telegram-agente, config). Skill personal global.
---

# Telegram remoto Cursor (todos los proyectos)

## Qué debe funcionar siempre

| Capacidad | Cómo |
|-----------|------|
| Resúmenes | `… \| node .cursor/hooks/telegram-approval.mjs send` |
| Aprobaciones | hooks `beforeShellExecution` / `beforeMCPExecution` → botones ✅/⛔ |
| Preguntas / pedidos | texto al bot → `scripts/telegram-agente.mjs` → Cursor Agent SDK |
| Acciones | el agente remoto trabaja en el `cwd` del repo y responde en Telegram |

Esto **no** es el chat de la ventana de Cursor: las preguntas por Telegram abren un **agente aparte** y contestan **en Telegram**.

## Al empezar o retomar CUALQUIER proyecto (obligatorio)

1. Leer esta skill.
2. Comprobar cableado:

```text
.cursor/hooks/telegram-approval.mjs
.cursor/hooks/telegram-approval.config.json   (local, no git)
.cursor/hooks.json                            (hooks shell + mcp)
scripts/telegram-agente.mjs
node_modules/@cursor/sdk  (o dependencia en package.json)
```

3. Si falta algo, ejecutar **sin preguntar**:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.cursor\skills\telegram-remoto-cursor\scripts\setup-telegram-bridge.ps1" -ProjectRoot "<ruta-del-repo>" -ProjectLabel "<Nombre corto>"
```

4. Config: si no hay `telegram-approval.config.json`, el setup la copia del hub Ma Baker o deja el example (completar token/chatId).
5. `CURSOR_API_KEY` debe existir (variable de usuario Windows) para preguntas remotas.

## Enviar resumen (fin de turno con avances)

Preferir el script **local del proyecto**. Si no existe, hub Ma Baker:

```powershell
@"
📋 <PROYECTO> — resumen
• qué se hizo
• resultado
• pendiente
"@ | node .cursor/hooks/telegram-approval.mjs send
```

Fallback:

```powershell
@"
📋 <PROYECTO> — resumen
• …
"@ | node "C:\Users\jesus\Proyectos\ma-baker-crm\.cursor\hooks\telegram-approval.mjs" send
```

## Autorizaciones

- Commit/push, SSH, borrados, producción, migraciones destructivas → Telegram (hooks o pedir confirmación).
- No asumir “sí” sin aprobación cuando la regla lo exige.
- Sin secretos/tokens/contraseñas en mensajes de Telegram.

## Preguntas y acciones desde Telegram

Comandos del bot (chat autorizado):

- Texto libre → encola/lanza agente en el repo cuyo **listener** está activo
- `/estado` — ¿ocupado?
- `/nueva` — reinicia conversación del agente
- `/ayuda` — ayuda

### Regla del listener (crítica)

Telegram Bot API: **solo un proceso** puede hacer `getUpdates` por bot.

- Si Ma Baker y CxC (u otro) usan el **mismo bot**, solo uno escucha.
- Para trabajar remoto en un proyecto: ese proyecto debe tener el listener vivo, o usar un bot distinto por proyecto.
- El listener se mantiene con los hooks / `node .cursor/hooks/telegram-approval.mjs listen`.

## Plantillas canónicas

```text
C:\Users\jesus\.cursor\skills\telegram-remoto-cursor\scripts\templates\
  telegram-approval.mjs
  telegram-agente.mjs
  telegram-approval.config.example.json
```

No reinventar el puente en cada repo: correr `setup-telegram-bridge.ps1`.

## Anti-patrones

- Mandar solo resúmenes y olvidar cablear `telegram-agente.mjs`.
- Pedir al usuario que pegue pasos de instalación del bot en cada proyecto nuevo sin correr el setup.
- Usar dos listeners del mismo bot a la vez (conflicto 409).
- Meter tokens en git.

## Memoria permanente

En **cualquier** proyecto nuevo o retomado: asegurar este cableado. Regla global:

`C:\Users\jesus\.cursor\rules\telegram-resumen-autorizaciones-global.mdc`
