/**
 * Ejecutor de psicométricos para Ma Baker and Chef
 * Inserta baterías, preguntas y configura por puesto.
 * Usa la Management API de Supabase con PAT.
 * 
 * Uso: node ejecutar-psicometricos.js
 */

const https = require('https');
const fs = require('fs');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const PAT = process.env.SUPABASE_PAT;

if (!PROJECT_REF || !PAT) {
    console.error('Faltan variables de entorno: SUPABASE_PROJECT_REF y SUPABASE_PAT.');
    process.exit(1);
}

/**
 * Ejecuta SQL via Management API de Supabase (requiere PAT, no service key)
 */
async function ejecutarSQL(sql, etiqueta) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query: sql });
        const options = {
            hostname: 'api.supabase.com',
            port: 443,
            path: `/v1/projects/${PROJECT_REF}/database/query`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAT}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const ok = res.statusCode >= 200 && res.statusCode < 300;
                resolve({ ok, etiqueta, status: res.statusCode, body: data });
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ===========================================================================
// SQL: Insertar baterías psicométricas
// Nota: El schema usa columnas: codigo, nombre, descripcion, categoria,
// instrucciones, tiempo_limite_min, total_reactivos, activa, score_min_aprobatorio
// ===========================================================================

const BLOQUES = [

    // -----------------------------------------------------------------------
    // Bloque 1: Catálogo de pruebas
    // -----------------------------------------------------------------------
    {
        etiqueta: 'Catálogo de pruebas psicométricas',
        sql: `
INSERT INTO pruebas_psicometricas (
    codigo, nombre, descripcion, categoria,
    instrucciones, tiempo_limite_min, total_reactivos,
    score_min_aprobatorio, activa, version_actual
) VALUES
    ('TERMAN-MX',
     'Test de Inteligencia Terman-Merrill',
     'Evaluación de capacidad intelectual general. Mide razonamiento verbal, numérico, abstracto y espacial.',
     'inteligencia',
     'Responde cada reactivo en el tiempo indicado. No uses calculadora. Si no sabes una respuesta, pasa a la siguiente.',
     45, 40, 70.0, true, '1.0'),

    ('PERS-16PF',
     'Evaluación de Personalidad 16 Factores',
     'Mide 16 dimensiones de personalidad relevantes para el desempeño laboral: dominancia, estabilidad emocional, responsabilidad, trabajo en equipo y cultura de inocuidad.',
     'personalidad',
     'No hay respuestas correctas o incorrectas. Marca la opción que mejor describa cómo eres normalmente en tu vida cotidiana.',
     30, 18, 60.0, true, '1.0'),

    ('HAB-ALIM',
     'Habilidades en Industria Alimentaria',
     'Conocimientos esenciales de inocuidad, BPM, HACCP, alérgenos, trazabilidad, EPP y NOM-017. Específica para el sector de productos alimentarios.',
     'habilidades_tecnicas',
     'Selecciona la respuesta correcta. Esta prueba evalúa tus conocimientos previos del sector alimentario.',
     20, 12, 80.0, true, '1.0'),

    ('VALORES-OVP',
     'Orientación de Valores Personales',
     'Identifica la jerarquía de valores personales y su compatibilidad con la cultura organizacional de Ma Baker and Chef.',
     'valores',
     'Responde con honestidad. No hay respuestas buenas o malas — solo tu perspectiva real.',
     20, 10, 65.0, true, '1.0'),

    ('IE-MSCEIT',
     'Inteligencia Emocional EQ',
     'Evalúa la capacidad para percibir, usar, comprender y regular las emociones propias y ajenas en el entorno laboral.',
     'inteligencia_emocional',
     'Responde con base en cómo te sientes y piensas en situaciones cotidianas. Selecciona la opción más honesta.',
     25, 10, 65.0, true, '1.0')

ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activa = EXCLUDED.activa;
`
    },

    // -----------------------------------------------------------------------
    // Bloque 2: Preguntas Terman (razonamiento)
    // -----------------------------------------------------------------------
    {
        etiqueta: 'Preguntas TERMAN-MX',
        sql: `
DO $$ DECLARE v UUID; BEGIN
    SELECT id INTO v FROM pruebas_psicometricas WHERE codigo = 'TERMAN-MX';

    INSERT INTO preguntas_psicometricas (id_prueba, version_prueba, numero_orden, tipo_respuesta, texto_pregunta, opciones, respuesta_correcta, valor_maximo, subtipo) VALUES
        -- Razonamiento Verbal
        (v,'1.0',1,'opcion_multiple','La relación PANADERO:PAN es igual a:','["Chef : Platillo","Carpintero : Madera","Maestro : Escuela","Médico : Hospital"]','Chef : Platillo',2.5,'verbal'),
        (v,'1.0',2,'opcion_multiple','¿Cuál NO pertenece al grupo: HARINA, AZÚCAR, CUCHARA, MANTEQUILLA?','["HARINA","AZÚCAR","CUCHARA","MANTEQUILLA"]','CUCHARA',2.5,'verbal'),
        (v,'1.0',3,'opcion_multiple','CALOR es a FRÍO como LUZ es a:','["Sol","Oscuridad","Lámpara","Fuego"]','Oscuridad',2.5,'verbal'),
        (v,'1.0',4,'opcion_multiple','¿Cuál es el antónimo de DILIGENTE?','["Trabajador","Perezoso","Cuidadoso","Rápido"]','Perezoso',2.5,'verbal'),
        (v,'1.0',5,'opcion_multiple','Un REBAÑO es a OVEJAS como una COLMENA es a:','["Miel","Abejas","Flores","Cera"]','Abejas',2.5,'verbal'),
        -- Razonamiento Numérico
        (v,'1.0',11,'opcion_multiple','¿Cuánto es 15% de 200?','["25","30","35","40"]','30',2.5,'numerico'),
        (v,'1.0',12,'opcion_multiple','Completa la serie: 2, 4, 8, 16, ___','["24","28","32","36"]','32',2.5,'numerico'),
        (v,'1.0',13,'opcion_multiple','Un producto cuesta $85 con 20% de descuento. ¿Cuánto pagas?','["$65","$68","$72","$75"]','$68',2.5,'numerico'),
        (v,'1.0',14,'opcion_multiple','Receta para 4 personas: 200g harina. ¿Para 10 personas?','["400g","450g","500g","550g"]','500g',2.5,'numerico'),
        (v,'1.0',15,'opcion_multiple','Completa la serie: 1, 1, 2, 3, 5, 8, ___','["11","13","12","10"]','13',2.5,'numerico'),
        -- Razonamiento Abstracto / Lógico
        (v,'1.0',21,'opcion_multiple','Si todos los A son B, y todos los B son C, entonces:','["Todos los C son A","Todos los A son C","Algunos C son A","Ningún A es C"]','Todos los A son C',2.5,'logico'),
        (v,'1.0',22,'opcion_multiple','Grande:Pequeño = Pesado:___','["Liviano","Grande","Gordo","Duro"]','Liviano',2.5,'logico'),
        -- Concentración y Memoria
        (v,'1.0',31,'opcion_multiple','¿Cuál de estas NO es ingrediente de panadería?: LEVADURA, HORNO, VAINILLA, CANELA','["LEVADURA","HORNO","VAINILLA","CANELA"]','HORNO',2.5,'concentracion'),
        (v,'1.0',32,'opcion_multiple','¿Cuánto es: 8 x 7 - 12 / 4?','["49","53","55","58"]','53',2.5,'numerico')

    ON CONFLICT (id_prueba, version_prueba, numero_orden) DO NOTHING;
END $$;
`
    },

    // -----------------------------------------------------------------------
    // Bloque 3: Preguntas Personalidad 16PF
    // -----------------------------------------------------------------------
    {
        etiqueta: 'Preguntas PERS-16PF',
        sql: `
DO $$ DECLARE v UUID; BEGIN
    SELECT id INTO v FROM pruebas_psicometricas WHERE codigo = 'PERS-16PF';

    INSERT INTO preguntas_psicometricas (id_prueba, version_prueba, numero_orden, tipo_respuesta, texto_pregunta, opciones, valor_maximo, subtipo) VALUES
        (v,'1.0',1,'escala_likert','Me siento cómodo/a tomando decisiones cuando otras personas dependen de mí.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'dominancia'),
        (v,'1.0',2,'escala_likert','Mantengo la calma cuando las cosas no salen como esperaba.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'estabilidad_emocional'),
        (v,'1.0',3,'escala_likert','Puedo trabajar bien bajo presión sin perder la concentración.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'estabilidad_emocional'),
        (v,'1.0',4,'escala_likert','Sigo las reglas aunque nadie me esté observando.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'responsabilidad'),
        (v,'1.0',5,'escala_likert','Entrego mis tareas antes de la fecha límite.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'responsabilidad'),
        (v,'1.0',6,'escala_likert','Me considero una persona en la que se puede confiar para cumplir compromisos.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'responsabilidad'),
        (v,'1.0',7,'escala_likert','Disfruto trabajar en equipo más que de forma individual.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'trabajo_en_equipo'),
        (v,'1.0',8,'escala_likert','Me llevo bien con personas de distintos caracteres.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'trabajo_en_equipo'),
        (v,'1.0',9,'escala_likert','Organizo mi área de trabajo antes de comenzar mis labores.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'disciplina'),
        (v,'1.0',10,'escala_likert','Cuando cometo un error, reconozco mi responsabilidad.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'disciplina'),
        (v,'1.0',11,'escala_likert','Considero importante seguir protocolos de higiene aunque ralenticen el trabajo.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'cultura_inocuidad'),
        (v,'1.0',12,'escala_likert','Reporto inmediatamente cualquier condición insegura que observe en el área de trabajo.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'cultura_inocuidad'),
        (v,'1.0',13,'escala_likert','Uso el equipo de protección personal (EPP) de manera consistente.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'cultura_inocuidad'),
        (v,'1.0',14,'escala_likert','Me resulta fácil defender mi punto de vista ante el grupo.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'dominancia'),
        (v,'1.0',15,'escala_likert','Prefiero que otros tomen la iniciativa en situaciones nuevas.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'dominancia'),
        (v,'1.0',16,'escala_likert','Me preocupo con facilidad por problemas del trabajo.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'estabilidad_emocional'),
        (v,'1.0',17,'escala_likert','Cuando un compañero tiene dificultades, me ofrezco a ayudar.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'trabajo_en_equipo'),
        (v,'1.0',18,'escala_likert','Planifico mis actividades para no improvisar.','["Nunca","Casi nunca","A veces","Casi siempre","Siempre"]',1,'disciplina')

    ON CONFLICT (id_prueba, version_prueba, numero_orden) DO NOTHING;
END $$;
`
    },

    // -----------------------------------------------------------------------
    // Bloque 4: Preguntas Habilidades Alimentarias
    // -----------------------------------------------------------------------
    {
        etiqueta: 'Preguntas HAB-ALIM',
        sql: `
DO $$ DECLARE v UUID; BEGIN
    SELECT id INTO v FROM pruebas_psicometricas WHERE codigo = 'HAB-ALIM';

    INSERT INTO preguntas_psicometricas (id_prueba, version_prueba, numero_orden, tipo_respuesta, texto_pregunta, opciones, respuesta_correcta, valor_maximo, subtipo) VALUES
        (v,'1.0',1,'opcion_multiple','¿Qué significa BPM en la industria alimentaria?','["Buenas Prácticas de Manufactura","Base de Producción Mínima","Batch de Producción Mensual","Buenas Prácticas de Mercadeo"]','Buenas Prácticas de Manufactura',8.33,'bpm'),
        (v,'1.0',2,'opcion_multiple','¿A qué temperatura deben mantenerse los alimentos fríos para inhibir bacterias?','["Menor a 4°C","Menor a 10°C","Menor a 15°C","Menor a 20°C"]','Menor a 4°C',8.33,'inocuidad'),
        (v,'1.0',3,'opcion_multiple','¿Qué es HACCP?','["Sistema de análisis de peligros y puntos críticos de control","Hazardous Area Chemical Control Procedure","Higiene y Control de Calidad en Procesos","Herramienta de Análisis Crítico y Control de Producción"]','Sistema de análisis de peligros y puntos críticos de control',8.33,'haccp'),
        (v,'1.0',4,'opcion_multiple','Si encuentras un ingrediente vencido en producción, ¿qué debes hacer?','["Usarlo si el olor es normal","Reportarlo al supervisor y separarlo inmediatamente","Mezclarlo con producto nuevo","Devolverlo al almacén sin avisar"]','Reportarlo al supervisor y separarlo inmediatamente',8.33,'inocuidad'),
        (v,'1.0',5,'opcion_multiple','¿Con qué frecuencia mínima deben lavarse las manos en producción de alimentos?','["Solo al iniciar el turno","Cada 2 horas","Antes y después de cada actividad crítica","Una vez por hora"]','Antes y después de cada actividad crítica',8.33,'bpm'),
        (v,'1.0',6,'verdadero_falso','¿Es correcto usar el mismo utensilio sin lavar para manipular diferentes tipos de materia prima?','["Verdadero","Falso"]','Falso',8.33,'inocuidad'),
        (v,'1.0',7,'opcion_multiple','¿Qué es un alérgeno alimentario?','["Un colorante natural","Una sustancia que causa reacciones adversas en el sistema inmune","Un conservador químico","Un tipo de bacteria"]','Una sustancia que causa reacciones adversas en el sistema inmune',8.33,'alergenos'),
        (v,'1.0',8,'opcion_multiple','En panadería, ¿cuál es un alérgeno mayor que SIEMPRE debe declararse?','["Sal","Agua","Gluten (trigo)","Azúcar"]','Gluten (trigo)',8.33,'alergenos'),
        (v,'1.0',9,'opcion_multiple','¿Qué significa trazabilidad en alimentos?','["Rastrear el recorrido del producto desde origen hasta consumidor","Registrar el peso de los productos","Calcular el costo de producción","Controlar la temperatura del horno"]','Rastrear el recorrido del producto desde origen hasta consumidor',8.33,'trazabilidad'),
        (v,'1.0',10,'opcion_multiple','¿Cuál norma mexicana regula la seguridad e higiene en centros de trabajo?','["NOM-017-STPS","NOM-001-SSA","NOM-035-STPS","NOM-051-SCFI"]','NOM-017-STPS',8.33,'normatividad'),
        (v,'1.0',11,'opcion_multiple','¿Qué EPP es obligatorio en el área de producción de alimentos?','["Cofia, bata y guantes","Solo guantes","Solo cofia","Ninguno si el área está limpia"]','Cofia, bata y guantes',8.33,'epp'),
        (v,'1.0',12,'verdadero_falso','¿El uso de anillos y pulseras está permitido durante la manipulación de alimentos?','["Verdadero","Falso"]','Falso',8.33,'bpm')

    ON CONFLICT (id_prueba, version_prueba, numero_orden) DO NOTHING;
END $$;
`
    },

    // -----------------------------------------------------------------------
    // Bloque 5: Configurar baterías por puesto (puesto_prueba_config)
    // -----------------------------------------------------------------------
    {
        etiqueta: 'Configuración por puesto',
        sql: `
DO $$
DECLARE
    v_terman UUID; v_pers UUID; v_alim UUID; v_valores UUID; v_ie UUID;
    v_qc UUID; v_alm UUID; v_mix UUID; v_adm UUID; v_ven UUID;
BEGIN
    SELECT id INTO v_terman FROM pruebas_psicometricas WHERE codigo = 'TERMAN-MX';
    SELECT id INTO v_pers   FROM pruebas_psicometricas WHERE codigo = 'PERS-16PF';
    SELECT id INTO v_alim   FROM pruebas_psicometricas WHERE codigo = 'HAB-ALIM';
    SELECT id INTO v_valores FROM pruebas_psicometricas WHERE codigo = 'VALORES-OVP';
    SELECT id INTO v_ie     FROM pruebas_psicometricas WHERE codigo = 'IE-MSCEIT';

    SELECT id INTO v_qc  FROM catalogo_puestos WHERE codigo_puesto = 'QC-001';
    SELECT id INTO v_alm FROM catalogo_puestos WHERE codigo_puesto = 'ALM-001';
    SELECT id INTO v_mix FROM catalogo_puestos WHERE codigo_puesto = 'MIX-001';
    SELECT id INTO v_adm FROM catalogo_puestos WHERE codigo_puesto = 'ADM-001';
    SELECT id INTO v_ven FROM catalogo_puestos WHERE codigo_puesto = 'VEN-001';

    -- QC-001: Control de Calidad (énfasis en BPM y Terman alto)
    INSERT INTO puesto_prueba_config (id_puesto, id_prueba, orden_aplicacion, es_obligatoria, score_minimo_puesto, momento_aplicacion)
    VALUES
        (v_qc, v_terman,  1, true,  75.0, 'pre_entrevista'),
        (v_qc, v_alim,    2, true,  85.0, 'pre_entrevista'),
        (v_qc, v_pers,    3, true,  65.0, 'pre_entrevista'),
        (v_qc, v_valores, 4, false, 60.0, 'durante_entrevista')
    ON CONFLICT (id_puesto, id_prueba) DO NOTHING;

    -- ALM-001: Almacén
    INSERT INTO puesto_prueba_config (id_puesto, id_prueba, orden_aplicacion, es_obligatoria, score_minimo_puesto, momento_aplicacion)
    VALUES
        (v_alm, v_terman, 1, true, 65.0, 'pre_entrevista'),
        (v_alm, v_pers,   2, true, 65.0, 'pre_entrevista'),
        (v_alm, v_alim,   3, true, 75.0, 'pre_entrevista')
    ON CONFLICT (id_puesto, id_prueba) DO NOTHING;

    -- MIX-001: Mezclador/Producción
    INSERT INTO puesto_prueba_config (id_puesto, id_prueba, orden_aplicacion, es_obligatoria, score_minimo_puesto, momento_aplicacion)
    VALUES
        (v_mix, v_terman, 1, true,  60.0, 'pre_entrevista'),
        (v_mix, v_alim,   2, true,  80.0, 'pre_entrevista'),
        (v_mix, v_pers,   3, false, 60.0, 'durante_entrevista')
    ON CONFLICT (id_puesto, id_prueba) DO NOTHING;

    -- ADM-001: Administrativo
    INSERT INTO puesto_prueba_config (id_puesto, id_prueba, orden_aplicacion, es_obligatoria, score_minimo_puesto, momento_aplicacion)
    VALUES
        (v_adm, v_terman,  1, true,  80.0, 'pre_entrevista'),
        (v_adm, v_pers,    2, true,  70.0, 'pre_entrevista'),
        (v_adm, v_ie,      3, true,  70.0, 'pre_entrevista'),
        (v_adm, v_valores, 4, false, 65.0, 'durante_entrevista')
    ON CONFLICT (id_puesto, id_prueba) DO NOTHING;

    -- VEN-001: Ventas
    INSERT INTO puesto_prueba_config (id_puesto, id_prueba, orden_aplicacion, es_obligatoria, score_minimo_puesto, momento_aplicacion)
    VALUES
        (v_ven, v_terman,  1, true, 70.0, 'pre_entrevista'),
        (v_ven, v_ie,      2, true, 75.0, 'pre_entrevista'),
        (v_ven, v_pers,    3, true, 70.0, 'pre_entrevista'),
        (v_ven, v_valores, 4, true, 70.0, 'pre_entrevista')
    ON CONFLICT (id_puesto, id_prueba) DO NOTHING;

    RAISE NOTICE '✅ Configuración de baterías por puesto completada.';
END $$;
`
    }
];

async function main() {
    console.log('🧠 Iniciando carga de baterías psicométricas en Supabase...\n');
    for (const bloque of BLOQUES) {
        process.stdout.write(`  ⏳ ${bloque.etiqueta}...`);
        const r = await ejecutarSQL(bloque.sql, bloque.etiqueta);
        if (r.ok) {
            console.log(' ✅');
        } else {
            console.log(` ❌ Error ${r.status}`);
            // Mostrar primeros 300 chars del error para diagnóstico
            try {
                const parsed = JSON.parse(r.body);
                console.log(`     → ${JSON.stringify(parsed).substring(0, 300)}`);
            } catch {
                console.log(`     → ${r.body.substring(0, 300)}`);
            }
        }
    }
    console.log('\n✅ Proceso completado.');
}

main().catch(e => console.error('Error fatal:', e));
