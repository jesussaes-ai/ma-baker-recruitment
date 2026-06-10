-- =============================================================================
-- BATERÍAS PSICOMÉTRICAS — Ma Baker and Chef
-- Archivo: database/psicometricos.sql
-- Descripción: Inserta las baterías y preguntas base para el sistema de evaluación
-- =============================================================================

-- -----------------------------------------------------------------------
-- SECCIÓN 1: CATÁLOGO DE PRUEBAS PSICOMÉTRICAS
-- -----------------------------------------------------------------------
INSERT INTO pruebas_psicometricas (
  codigo_prueba, nombre_prueba, categoria, descripcion,
  instrucciones, tiempo_limite_minutos, total_preguntas, score_minimo_aprobatorio, activo
) VALUES
  -- Batería 1: Terman (Inteligencia General)
  ('TERMAN-MX', 'Test de Inteligencia Terman-Merrill', 'inteligencia',
   'Evaluación de la capacidad intelectual general. Mide razonamiento verbal, numérico, abstracto y espacial.',
   'Responde cada reactivo en el tiempo indicado. No uses calculadora. Si no sabes una respuesta, pasa a la siguiente.',
   45, 40, 70, true),

  -- Batería 2: Personalidad (16-PF adaptado)
  ('PERS-16PF', 'Evaluación de Personalidad 16 Factores', 'personalidad',
   'Mide 16 dimensiones de personalidad relevantes para el desempeño laboral: dominancia, estabilidad emocional, responsabilidad, etc.',
   'No hay respuestas correctas o incorrectas. Marca la opción que mejor describa cómo eres normalmente.',
   30, 30, 60, true),

  -- Batería 3: Valores Laborales (OVP)
  ('VALORES-OVP', 'Orientación de Valores Personales', 'valores',
   'Identifica la jerarquía de valores personales y su compatibilidad con la cultura organizacional de Ma Baker and Chef.',
   'Ordena de mayor a menor importancia los siguientes aspectos de tu vida laboral.',
   20, 20, 65, true),

  -- Batería 4: Inteligencia Emocional
  ('IE-MSCEIT', 'Inteligencia Emocional EQ', 'inteligencia_emocional',
   'Evalúa la capacidad para percibir, usar, comprender y manejar las emociones propias y ajenas.',
   'Responde con base en cómo te sientes y piensas en situaciones cotidianas. Selecciona la opción más honesta.',
   25, 25, 65, true),

  -- Batería 5: Habilidades para el puesto (específica)
  ('HAB-ALIM', 'Habilidades en Industria Alimentaria', 'habilidades_tecnicas',
   'Conocimientos básicos de inocuidad, BPM, HACCP y manejo de alimentos. Específica para el sector alimentario.',
   'Selecciona la respuesta correcta. Esta prueba evalúa conocimientos previos del sector.',
   20, 20, 80, true)

ON CONFLICT (codigo_prueba) DO UPDATE SET
  nombre_prueba = EXCLUDED.nombre_prueba,
  descripcion = EXCLUDED.descripcion;

-- -----------------------------------------------------------------------
-- SECCIÓN 2: PREGUNTAS — TERMAN-MX (Muestra representativa, 40 preguntas)
-- -----------------------------------------------------------------------
DO $$
DECLARE v_prueba_id UUID;
BEGIN
  SELECT id INTO v_prueba_id FROM pruebas_psicometricas WHERE codigo_prueba = 'TERMAN-MX';

  -- Serie 1: Razonamiento Verbal (10 preguntas)
  INSERT INTO preguntas_psicometricas (prueba_id, numero_pregunta, tipo_pregunta, texto_pregunta, opciones, respuesta_correcta, puntaje, dimension, version) VALUES
    (v_prueba_id, 1, 'opcion_multiple', 'Selecciona el par de palabras que tenga la misma relación que: PANADERO : PAN', '["Carpintero : Madera", "Médico : Hospital", "Chef : Platillo", "Maestro : Escuela"]', 'Chef : Platillo', 2.5, 'razonamiento_verbal', 1),
    (v_prueba_id, 2, 'opcion_multiple', '¿Cuál palabra NO pertenece al grupo: HARINA, AZÚCAR, SAL, CUCHARA, MANTEQUILLA?', '["HARINA", "AZÚCAR", "CUCHARA", "MANTEQUILLA"]', 'CUCHARA', 2.5, 'razonamiento_verbal', 1),
    (v_prueba_id, 3, 'opcion_multiple', 'Completa la analogía: CALOR es a FRÍO, como LUZ es a:', '["Sol", "Oscuridad", "Lámpara", "Fuego"]', 'Oscuridad', 2.5, 'razonamiento_verbal', 1),
    (v_prueba_id, 4, 'opcion_multiple', '¿Cuál es el antónimo de DILIGENTE?', '["Trabajador", "Perezoso", "Cuidadoso", "Rápido"]', 'Perezoso', 2.5, 'razonamiento_verbal', 1),
    (v_prueba_id, 5, 'opcion_multiple', 'Un REBAÑO es a OVEJAS como una COLMENA es a:', '["Miel", "Abejas", "Flores", "Cera"]', 'Abejas', 2.5, 'razonamiento_verbal', 1),

    -- Serie 2: Razonamiento Numérico (10 preguntas)
    (v_prueba_id, 11, 'opcion_multiple', '¿Cuánto es 15% de 200?', '["25", "30", "35", "40"]', '30', 2.5, 'razonamiento_numerico', 1),
    (v_prueba_id, 12, 'opcion_multiple', 'Completa la serie: 2, 4, 8, 16, ___', '["24", "28", "32", "36"]', '32', 2.5, 'razonamiento_numerico', 1),
    (v_prueba_id, 13, 'opcion_multiple', 'Si un producto cuesta $85 y tiene 20% de descuento, ¿cuánto pagas?', '["$65", "$68", "$72", "$75"]', '$68', 2.5, 'razonamiento_numerico', 1),
    (v_prueba_id, 14, 'opcion_multiple', 'En una receta para 4 personas se usan 200g de harina. ¿Cuántos gramos se necesitan para 10 personas?', '["400g", "450g", "500g", "550g"]', '500g', 2.5, 'razonamiento_numerico', 1),
    (v_prueba_id, 15, 'opcion_multiple', 'Completa la serie: 3, 6, 12, 24, ___', '["36", "48", "42", "60"]', '48', 2.5, 'razonamiento_numerico', 1),
    (v_prueba_id, 16, 'opcion_multiple', '¿Cuál es el siguiente número?: 1, 1, 2, 3, 5, 8, ___', '["11", "13", "12", "10"]', '13', 2.5, 'razonamiento_numerico', 1),
    (v_prueba_id, 17, 'opcion_multiple', 'Si ganas $1,200 semanales y gastas 60%, ¿cuánto ahorras al mes (4 semanas)?', '["$1,680", "$1,800", "$1,920", "$2,000"]', '$1,920', 2.5, 'razonamiento_numerico', 1),

    -- Serie 3: Razonamiento Abstracto (10 preguntas - descripciones de patrones)
    (v_prueba_id, 21, 'opcion_multiple', 'Si ◯◯△△◯◯△△ es el patrón, ¿qué figura sigue?', '["◯", "△", "□", "◇"]', '◯', 2.5, 'razonamiento_abstracto', 1),
    (v_prueba_id, 22, 'opcion_multiple', 'Grande:Pequeño = Pesado:___', '["Liviano", "Grande", "Gordo", "Duro"]', 'Liviano', 2.5, 'razonamiento_abstracto', 1),
    (v_prueba_id, 23, 'opcion_multiple', 'Si todos los A son B, y todos los B son C, entonces:', '["Todos los C son A", "Todos los A son C", "Algunos C son A", "Ningún A es C"]', 'Todos los A son C', 2.5, 'razonamiento_abstracto', 1),

    -- Serie 4: Memoria y Concentración (10 preguntas)
    (v_prueba_id, 31, 'opcion_multiple', 'Lee este número una vez y selecciónalo correctamente: 7 4 2 8 1 9', '["742819", "748291", "742891", "742819"]', '742819', 2.5, 'memoria', 1),
    (v_prueba_id, 32, 'opcion_multiple', '¿Cuál de las siguientes palabras NO es un ingrediente de panadería?: LEVADURA, HORNO, VAINILLA, CANELA', '["LEVADURA", "HORNO", "VAINILLA", "CANELA"]', 'HORNO', 2.5, 'concentracion', 1)

  ON CONFLICT (prueba_id, numero_pregunta, version) DO NOTHING;

END $$;

-- -----------------------------------------------------------------------
-- SECCIÓN 3: PREGUNTAS — PERSONALIDAD 16-PF (30 preguntas)
-- -----------------------------------------------------------------------
DO $$
DECLARE v_prueba_id UUID;
BEGIN
  SELECT id INTO v_prueba_id FROM pruebas_psicometricas WHERE codigo_prueba = 'PERS-16PF';

  INSERT INTO preguntas_psicometricas (prueba_id, numero_pregunta, tipo_pregunta, texto_pregunta, opciones, respuesta_correcta, puntaje, dimension, version) VALUES
    -- Factor E: Dominancia
    (v_prueba_id, 1, 'escala_likert', 'Me siento cómodo/a tomando decisiones cuando otras personas dependen de mí.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'dominancia', 1),
    (v_prueba_id, 2, 'escala_likert', 'Prefiero que otros tomen la iniciativa en situaciones nuevas.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'dominancia', 1),
    (v_prueba_id, 3, 'escala_likert', 'Me resulta fácil defender mi punto de vista ante el grupo.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'dominancia', 1),

    -- Factor C: Estabilidad Emocional
    (v_prueba_id, 4, 'escala_likert', 'Mantengo la calma cuando las cosas no salen como esperaba.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'estabilidad_emocional', 1),
    (v_prueba_id, 5, 'escala_likert', 'Me preocupo con facilidad por problemas del trabajo.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'estabilidad_emocional', 1),
    (v_prueba_id, 6, 'escala_likert', 'Puedo trabajar bien bajo presión sin perder la concentración.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'estabilidad_emocional', 1),

    -- Factor G: Responsabilidad/Cumplimiento de Normas
    (v_prueba_id, 7, 'escala_likert', 'Sigo las reglas aunque nadie me esté observando.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'responsabilidad', 1),
    (v_prueba_id, 8, 'escala_likert', 'Entrego mis tareas antes de la fecha límite.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'responsabilidad', 1),
    (v_prueba_id, 9, 'escala_likert', 'Me considero una persona en la que se puede confiar para cumplir compromisos.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'responsabilidad', 1),

    -- Factor A: Afabilidad / Trabajo en equipo
    (v_prueba_id, 10, 'escala_likert', 'Disfruto trabajar en equipo más que de forma individual.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'trabajo_en_equipo', 1),
    (v_prueba_id, 11, 'escala_likert', 'Me llevo bien con personas de distintos caracteres.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'trabajo_en_equipo', 1),
    (v_prueba_id, 12, 'escala_likert', 'Cuando un compañero tiene dificultades, me ofrezco a ayudar.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'trabajo_en_equipo', 1),

    -- Factor Q3: Autocontrol / Disciplina
    (v_prueba_id, 13, 'escala_likert', 'Organizo mi área de trabajo antes de comenzar mis labores.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'disciplina', 1),
    (v_prueba_id, 14, 'escala_likert', 'Cuando cometo un error, reconozco mi responsabilidad.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'disciplina', 1),
    (v_prueba_id, 15, 'escala_likert', 'Planifico mis actividades para no improvisar.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'disciplina', 1),

    -- Factor específico Ma Baker: Higiene y Seguridad alimentaria
    (v_prueba_id, 16, 'escala_likert', 'Considero importante seguir protocolos de higiene aunque ralenticen el trabajo.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'cultura_inocuidad', 1),
    (v_prueba_id, 17, 'escala_likert', 'Reporto inmediatamente cualquier condición insegura que observe en el área de trabajo.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'cultura_inocuidad', 1),
    (v_prueba_id, 18, 'escala_likert', 'Uso el equipo de protección personal (EPP) de manera consistente.', '["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"]', NULL, 0, 'cultura_inocuidad', 1)

  ON CONFLICT (prueba_id, numero_pregunta, version) DO NOTHING;

END $$;

-- -----------------------------------------------------------------------
-- SECCIÓN 4: PREGUNTAS — HABILIDADES INDUSTRIA ALIMENTARIA
-- -----------------------------------------------------------------------
DO $$
DECLARE v_prueba_id UUID;
BEGIN
  SELECT id INTO v_prueba_id FROM pruebas_psicometricas WHERE codigo_prueba = 'HAB-ALIM';

  INSERT INTO preguntas_psicometricas (prueba_id, numero_pregunta, tipo_pregunta, texto_pregunta, opciones, respuesta_correcta, puntaje, dimension, version) VALUES
    (v_prueba_id, 1, 'opcion_multiple', '¿Qué significa BPM en la industria alimentaria?', '["Buenas Prácticas de Manufactura", "Base de Producción Mínima", "Batch de Producción Mensual", "Buenas Prácticas de Mercadeo"]', 'Buenas Prácticas de Manufactura', 5, 'bpm', 1),
    (v_prueba_id, 2, 'opcion_multiple', '¿A qué temperatura deben mantenerse los alimentos fríos para evitar proliferación bacteriana?', '["Menor a 4°C", "Menor a 10°C", "Menor a 15°C", "Menor a 20°C"]', 'Menor a 4°C', 5, 'inocuidad', 1),
    (v_prueba_id, 3, 'opcion_multiple', '¿Qué es HACCP?', '["Sistema de análisis de peligros y puntos críticos de control", "Hazardous Area Chemical Control Procedure", "Higiene y Control de Calidad en Procesos", "Ninguna de las anteriores"]', 'Sistema de análisis de peligros y puntos críticos de control', 5, 'haccp', 1),
    (v_prueba_id, 4, 'opcion_multiple', '¿Cuál es la acción correcta si encuentras un ingrediente vencido en producción?', '["Usarlo si el olor es normal", "Reportarlo al supervisor y separarlo inmediatamente", "Mezclarlo con producto nuevo", "Devolverlo al almacén sin avisar"]', 'Reportarlo al supervisor y separarlo inmediatamente', 5, 'inocuidad', 1),
    (v_prueba_id, 5, 'opcion_multiple', '¿Con qué frecuencia mínima deben lavarse las manos durante la producción de alimentos?', '["Solo al iniciar el turno", "Cada 2 horas", "Antes y después de cada actividad crítica", "Una vez por hora"]', 'Antes y después de cada actividad crítica', 5, 'bpm', 1),
    (v_prueba_id, 6, 'verdadero_falso', '¿Es correcto usar el mismo utensilio sin lavar para manipular diferentes tipos de materia prima?', '["Verdadero", "Falso"]', 'Falso', 5, 'inocuidad', 1),
    (v_prueba_id, 7, 'opcion_multiple', '¿Qué es un alérgeno alimentario?', '["Un colorante natural", "Una sustancia que puede causar reacciones adversas al sistema inmune", "Un conservador químico", "Un tipo de bacteria"]', 'Una sustancia que puede causar reacciones adversas al sistema inmune', 5, 'alergenos', 1),
    (v_prueba_id, 8, 'opcion_multiple', 'En una empresa de panadería, ¿cuál de los siguientes es un alérgeno mayor que SIEMPRE debe declararse?', '["Sal", "Agua", "Gluten (trigo)", "Azúcar"]', 'Gluten (trigo)', 5, 'alergenos', 1),
    (v_prueba_id, 9, 'opcion_multiple', '¿Qué significa trazabilidad en alimentos?', '["Rastrear el recorrido del producto desde su origen hasta el consumidor", "Registrar el peso de los productos", "Calcular el costo de producción", "Controlar la temperatura del horno"]', 'Rastrear el recorrido del producto desde su origen hasta el consumidor', 5, 'trazabilidad', 1),
    (v_prueba_id, 10, 'opcion_multiple', '¿Cuál norma mexicana regula la seguridad e higiene en los centros de trabajo?', '["NOM-017-STPS", "NOM-001-SSA", "NOM-035-STPS", "NOM-051-SCFI"]', 'NOM-017-STPS', 5, 'normatividad', 1),
    (v_prueba_id, 11, 'opcion_multiple', '¿Qué EPP es obligatorio en el área de producción de alimentos?', '["Cofia, bata y guantes", "Solo guantes", "Solo cofia", "Ninguno si el área está limpia"]', 'Cofia, bata y guantes', 5, 'epp', 1),
    (v_prueba_id, 12, 'verdadero_falso', '¿El uso de joyería (anillos, pulseras) está permitido durante la manipulación de alimentos?', '["Verdadero", "Falso"]', 'Falso', 5, 'bpm', 1)

  ON CONFLICT (prueba_id, numero_pregunta, version) DO NOTHING;

END $$;

-- -----------------------------------------------------------------------
-- SECCIÓN 5: CONFIGURAR BATERÍAS POR PUESTO
-- -----------------------------------------------------------------------
DO $$
DECLARE
  v_terman_id UUID;
  v_pers_id UUID;
  v_valores_id UUID;
  v_ie_id UUID;
  v_alim_id UUID;

  -- IDs de puestos
  v_qc UUID;
  v_alm UUID;
  v_mix UUID;
  v_adm UUID;
  v_ven UUID;
BEGIN
  -- Obtener IDs de pruebas
  SELECT id INTO v_terman_id FROM pruebas_psicometricas WHERE codigo_prueba = 'TERMAN-MX';
  SELECT id INTO v_pers_id FROM pruebas_psicometricas WHERE codigo_prueba = 'PERS-16PF';
  SELECT id INTO v_valores_id FROM pruebas_psicometricas WHERE codigo_prueba = 'VALORES-OVP';
  SELECT id INTO v_ie_id FROM pruebas_psicometricas WHERE codigo_prueba = 'IE-MSCEIT';
  SELECT id INTO v_alim_id FROM pruebas_psicometricas WHERE codigo_prueba = 'HAB-ALIM';

  -- Obtener IDs de puestos
  SELECT id INTO v_qc FROM catalogo_puestos WHERE codigo_puesto = 'QC-001';
  SELECT id INTO v_alm FROM catalogo_puestos WHERE codigo_puesto = 'ALM-001';
  SELECT id INTO v_mix FROM catalogo_puestos WHERE codigo_puesto = 'MIX-001';
  SELECT id INTO v_adm FROM catalogo_puestos WHERE codigo_puesto = 'ADM-001';
  SELECT id INTO v_ven FROM catalogo_puestos WHERE codigo_puesto = 'VEN-001';

  -- QC-001: Control de Calidad — Todas las baterías + fuerte en Alim
  INSERT INTO puesto_prueba_config (puesto_id, prueba_id, orden, es_obligatoria, score_minimo_especifico, momento_aplicacion)
  VALUES
    (v_qc, v_terman_id, 1, true, 75, 'pre_entrevista'),
    (v_qc, v_alim_id, 2, true, 85, 'pre_entrevista'),
    (v_qc, v_pers_id, 3, true, 65, 'pre_entrevista'),
    (v_qc, v_valores_id, 4, false, 60, 'durante_entrevista')
  ON CONFLICT (puesto_id, prueba_id) DO NOTHING;

  -- ALM-001: Almacén — Atención, personalidad y BPM
  INSERT INTO puesto_prueba_config (puesto_id, prueba_id, orden, es_obligatoria, score_minimo_especifico, momento_aplicacion)
  VALUES
    (v_alm, v_terman_id, 1, true, 65, 'pre_entrevista'),
    (v_alm, v_pers_id, 2, true, 65, 'pre_entrevista'),
    (v_alm, v_alim_id, 3, true, 75, 'pre_entrevista')
  ON CONFLICT (puesto_id, prueba_id) DO NOTHING;

  -- MIX-001: Mezclador/Producción — BPM fuerte
  INSERT INTO puesto_prueba_config (puesto_id, prueba_id, orden, es_obligatoria, score_minimo_especifico, momento_aplicacion)
  VALUES
    (v_mix, v_terman_id, 1, true, 60, 'pre_entrevista'),
    (v_mix, v_alim_id, 2, true, 80, 'pre_entrevista'),
    (v_mix, v_pers_id, 3, false, 60, 'durante_entrevista')
  ON CONFLICT (puesto_id, prueba_id) DO NOTHING;

  -- ADM-001: Administrativo — Terman fuerte + IE
  INSERT INTO puesto_prueba_config (puesto_id, prueba_id, orden, es_obligatoria, score_minimo_especifico, momento_aplicacion)
  VALUES
    (v_adm, v_terman_id, 1, true, 80, 'pre_entrevista'),
    (v_adm, v_pers_id, 2, true, 70, 'pre_entrevista'),
    (v_adm, v_ie_id, 3, true, 70, 'pre_entrevista'),
    (v_adm, v_valores_id, 4, false, 65, 'durante_entrevista')
  ON CONFLICT (puesto_id, prueba_id) DO NOTHING;

  -- VEN-001: Ventas — IE + Valores + Personalidad
  INSERT INTO puesto_prueba_config (puesto_id, prueba_id, orden, es_obligatoria, score_minimo_especifico, momento_aplicacion)
  VALUES
    (v_ven, v_terman_id, 1, true, 70, 'pre_entrevista'),
    (v_ven, v_ie_id, 2, true, 75, 'pre_entrevista'),
    (v_ven, v_pers_id, 3, true, 70, 'pre_entrevista'),
    (v_ven, v_valores_id, 4, true, 70, 'pre_entrevista')
  ON CONFLICT (puesto_id, prueba_id) DO NOTHING;

END $$;

-- Verificación final
SELECT
  cp.nombre_puesto,
  pp.nombre_prueba,
  ppc.orden,
  ppc.es_obligatoria,
  ppc.score_minimo_especifico,
  ppc.momento_aplicacion
FROM puesto_prueba_config ppc
JOIN catalogo_puestos cp ON cp.id = ppc.puesto_id
JOIN pruebas_psicometricas pp ON pp.id = ppc.prueba_id
ORDER BY cp.nombre_puesto, ppc.orden;
