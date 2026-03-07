# Proyecto: Reclutamiento y Selección de Talento Automatizado
## Ma Baker and Chef

Este proyecto implementa un sistema agéntico avanzado para automatizar el proceso de reclutamiento, validación y onboarding de talento en Ma Baker and Chef.

### Componentes Clave
1. **Orquestador de Talento (System Prompt):** Gobierna el flujo completo y aplica filtros duros.
2. **Dynamic Job Matcher (Skill):** Valida los 23 puntos obligatorios del formulario y realiza el cálculo de Match Score.
3. **SGI & Safety Auditor (Skill):** Asegura el cumplimiento normativo (ISO 22000, NOM-251) y de seguridad industrial.
4. **Supabase Router (Skill):** Gestiona la base de datos distribuida y el RBAC (Control de Acceso Basado en Roles).

### Directorios
- `skills/`: Contiene las definiciones de las habilidades agénticas.
- `docs/`: Documentación técnica y flujos.
- `prompts/`: Definiciones de prompts maestros y auxiliares.

> [!NOTE]
> Este proyecto se basa en la arquitectura definida en el cuaderno de NotebookLM: "Reclutamiento y Seleccion de Personal Automatizado: Ma Baker and Chef".
