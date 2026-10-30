# Skill: Dynamic Job Matcher & Orchestrator
**ID: hr_multi_job_processor_003**

## Propósito
Esta habilidad automatiza la validación de candidatos contra un catálogo dinámico de puestos en Supabase, asegurando la integridad de los datos obligatorios.

## Workflow

### Step 1: Context Retrieval
- **Input:** `id_puesto_aplicado` y `payload_formulario_completo`.
- **Acción:** Consultar la tabla `catalogo_puestos` en Supabase para recuperar requisitos específicos (edad, escolaridad, experiencia, competencias técnicas).

### Step 2: Universal Validation (Los 23 puntos)
- **Verifica:** Presencia de datos personales, salud, socioeconómicos, académicos y 5 registros de empleos anteriores.
- **Validación Estricta:** Si falta algún campo obligatorio, retornar error solicitando la información faltante.

### Step 3: Dynamic Scoring
- **Criterio:**
    - Cumplimiento de Hard Filters (Aviso de privacidad, Edad, Carrera).
    - Match Score (0-100%): Ponderar experiencia específica vs requisitos del puesto.

### Step 4: Intelligent Routing
- **Score < 80%:** Generar comando `ARCHIVE_PROSPECT` para la tabla `prospectos_rechazados`.
- **Score >= 80%:** Generar comando `PROMOTE_TO_CANDIDATE` para la tabla `candidatos_activos`.

## Formato de Respuesta
JSON estructurado según el System Prompt.
