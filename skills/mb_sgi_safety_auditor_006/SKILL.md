# Skill: SGI & Safety Compliance Auditor
**ID: mb_sgi_safety_auditor_006**

## Propósito
Validar que el expediente de inducción (SGI y Seguridad Industrial) cumpla al 100% con ISO 22000, NOM-251 y reglamentos internos.

## Lógica de Auditoría

### Módulo SGI (Inocuidad)
Verificar obligatoriamente:
1. Política SGI.
2. ISO 22000:2018.
3. Conceptos de ETAs y Contaminación.
4. NOM-251-SSA1-2009.
5. BPMs (Buenas Prácticas de Manufactura).
6. Práctica de lavado de manos (`practica_lavado_manos` == TRUE).
7. Revisión Física BPH:
    - `uñas_cortas` == TRUE.
    - `sin_bisuteria` == TRUE.
    - **FILTRO DURO:** Si `tiene_barba` o `tiene_maquillaje` (en áreas críticas) == TRUE, detener proceso.

### Módulo Seguridad e Higiene
Verificar:
1. Riesgos Psicosociales (No violencia/discriminación).
2. Diferencia entre Accidente e Incidente.
3. Protocolo de Emergencias.
4. Firmas de aceptación: No joyas, No fumar, Uso de EPP.

## Acciones de Salida
- **INDUCCION_INCOMPLETA:** Si falta algún check o falla revisión física.
- **LISTO_PARA_CONTRATO:** Si todos los puntos son TRUE. Habilitar firma de convenio de confidencialidad y reglamento.
