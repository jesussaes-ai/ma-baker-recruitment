---
name: documentacion-cierre-ma-baker
description: >-
  Cierra tareas técnicas documentando en Obsidian, README, OneNote y GitHub.
  Usar al terminar cualquier cambio de arquitectura, flujo, configuración,
  corrección operativa o sesión de trabajo. También cuando el usuario pida
  guardar, documentar, actualizar notas, Obsidian, README, OneNote o GitHub.
---

# Documentación de cierre — Ma Baker Recruitment

## Objetivo

Ninguna tarea técnica se considera terminada hasta documentar en **los cuatro destinos** y reportar el estado de Git.

## Cuándo aplicar

- Al cerrar una tarea de implementación, corrección o configuración.
- Tras resolver incidentes (correo, RLS, OAuth, Edge Functions, etc.).
- Cuando el usuario diga: "guarda", "documenta", "actualiza notas", "cierra la sesión".
- Antes de responder "listo", "hecho" o "perfecto" en cambios con impacto operativo.

## Checklist obligatorio (ejecutar en orden)

```
- [ ] 1. Inspeccionar qué cambió (código, Supabase, secretos, flujos)
- [ ] 2. Obsidian — actualizar nota en docs/obsidian/
- [ ] 3. README — enlace o nota breve si aplica
- [ ] 4. OneNote — reflejar en docs/onenote/ (espejo para copiar al cuaderno)
- [ ] 5. docs/ técnico — runbook, RECMI o CONTEXTO si hay arquitectura/config
- [ ] 6. GitHub — commit/push solo si el usuario lo pidió; si no, informar pendiente
- [ ] 7. Confirmar al usuario los cuatro destinos + Git
```

## Destinos y rutas

| Destino | Ruta en repo | Qué va ahí |
|---------|--------------|------------|
| **Obsidian** | `docs/obsidian/` | Seguimiento operativo diario, lecciones aprendidas, estado actual |
| **README** | `README.md` | Enlaces a docs nuevos, resumen de capacidades visibles al equipo |
| **OneNote** | `docs/onenote/` | Misma información en formato breve para el cuaderno corporativo |
| **GitHub** | remoto | Commit/push cuando el usuario lo solicite explícitamente |

> OneNote no tiene API en este proyecto. El agente **siempre** escribe o actualiza el espejo en `docs/onenote/` para que el usuario lo sincronice con su cuaderno "Ma Baker - Reclutamiento" (o el nombre que use el equipo).

## Qué actualizar en cada destino

### Obsidian (`docs/obsidian/`)

- Fecha y título de la sesión o cambio.
- Estado actual (qué funciona / qué falla).
- Variables, URLs y secretos **sin valores sensibles** (solo nombres).
- Lecciones operativas en viñetas.
- Próximo paso concreto.

Archivo principal: `docs/obsidian/seguimiento-postulacion-y-correos.md`  
Crear archivo nuevo solo si el tema no cabe ahí (ej. `docs/obsidian/psicometricos.md`).

### README (`README.md`)

- Agregar sección o viñeta con enlace relativo al doc técnico nuevo.
- No duplicar runbooks completos; solo puntero y una línea de contexto.

### OneNote (`docs/onenote/`)

- Crear o actualizar `docs/onenote/seguimiento-ma-baker.md` (índice maestro).
- Por sesión relevante: entrada con fecha, 3–8 viñetas, sin secretos.
- Formato apto para pegar en OneNote (títulos `##`, listas cortas).

Plantilla de entrada:

```markdown
## YYYY-MM-DD — [Título breve]

- Cambio:
- Impacto operativo:
- Validado:
- Pendiente:
- Docs relacionados: [ruta en repo]
```

### Documentación técnica (`docs/`)

Actualizar cuando haya cambios de:

- arquitectura o flujos;
- variables de entorno / Edge Functions;
- troubleshooting nuevo;
- migraciones SQL.

Archivos frecuentes:

- `docs/RUNBOOK-CORREO-MULTIPROVEEDOR.md`
- `docs/deploy-email-webhook.md`
- `docs/RECMI.md`
- `docs/CONTEXTO.md`

### GitHub

- **No** hacer commit ni push salvo petición explícita del usuario.
- Si no hubo commit/push: escribir **"GitHub remoto pendiente"**.
- Si hubo commit: indicar mensaje y si falta push.

## Formato de cierre al usuario

Incluir siempre este bloque al final:

```markdown
- **Inspeccionado:** [qué se verificó]
- **Documentado:** Obsidian ✓ | README ✓ | OneNote (`docs/onenote/`) ✓ | docs/ ✓
- **Git/GitHub:** [commit hecho / pendiente / push hecho / remoto pendiente]
```

## Reglas de seguridad

- Nunca volcar API keys, refresh tokens, contraseñas ni PAT en Obsidian, README, OneNote ni commits.
- Referir secretos solo por nombre (`GOOGLE_REFRESH_TOKEN`, `RESEND_API_KEY`, etc.).

## Relación con otras reglas del proyecto

- Complementa `.cursor/rules/documentacion-operativa-obligatoria.mdc` (alwaysApply).
- Esta skill detalla **cómo** y **dónde** documentar, incluyendo OneNote.
- La regla `.mdc` obliga a no omitir el cierre; esta skill define el procedimiento completo.
