/**
 * Ejecuta el schema de Ma Baker directamente en Supabase
 * usando la Management API v1 con el access token de servicio.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const REF = 'znskpdixdyxdbvpapqrg';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2twZGl4ZHl4ZGJ2cGFwcXJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg1ODgwOCwiZXhwIjoyMDg4NDM0ODA4fQ.s7yC5ODssUgqHjH0PsAhTZuNQ1R-lMuJAt62OKDwryg';

// El endpoint de query de la Management API
const HOST = 'api.supabase.com';
const PATH = `/v1/projects/${REF}/database/query`;

function runSQL(sql) {
    return new Promise((resolve) => {
        const body = JSON.stringify({ query: sql });
        const opts = {
            hostname: HOST,
            port: 443,
            path: PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + KEY,
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', e => resolve({ status: 0, body: e.message }));
        req.write(body);
        req.end();
    });
}

const SQL = [
    // 1. Extensiones
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,

    // 2. Catálogo de puestos
    `CREATE TABLE IF NOT EXISTS public.catalogo_puestos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_puesto TEXT NOT NULL UNIQUE,
    nombre_puesto TEXT NOT NULL,
    departamento TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    edad_minima INTEGER NOT NULL DEFAULT 18,
    edad_maxima INTEGER NOT NULL DEFAULT 55,
    escolaridad_minima TEXT NOT NULL DEFAULT 'preparatoria',
    carrera_afin TEXT[],
    experiencia_minima_anios NUMERIC(3,1) DEFAULT 0,
    area_experiencia TEXT[],
    peso_experiencia INTEGER DEFAULT 40,
    peso_tecnico INTEGER DEFAULT 30,
    peso_estabilidad INTEGER DEFAULT 30,
    conocimientos_tecnicos TEXT[],
    certificaciones_requeridas TEXT[],
    competencias_clave TEXT[],
    sueldo_minimo NUMERIC(10,2),
    sueldo_maximo NUMERIC(10,2),
    tipo_contrato TEXT DEFAULT 'tiempo_indeterminado',
    descripcion_puesto TEXT,
    descripcion_completa TEXT,
    nombre_archivo_fuente TEXT,
    fuente_pdf BOOLEAN DEFAULT false,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);`,

    // 3. Prospectos rechazados
    `CREATE TABLE IF NOT EXISTS public.prospectos_rechazados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_puesto UUID REFERENCES public.catalogo_puestos(id),
    codigo_puesto TEXT, nombre_puesto TEXT, nombre_completo TEXT NOT NULL,
    fecha_nacimiento DATE, edad INTEGER, genero TEXT, curp TEXT, rfc TEXT,
    estado_civil TEXT, telefono TEXT, email TEXT, domicilio TEXT,
    colonia TEXT, municipio TEXT, estado TEXT, escolaridad TEXT, carrera TEXT,
    institucion TEXT, anio_egreso TEXT, cedula_profesional TEXT,
    enfermedades_cronicas TEXT, medicamentos TEXT, discapacidades TEXT, tipo_sangre TEXT,
    empresa_1 TEXT, puesto_1 TEXT, antiguedad_1 TEXT, motivo_salida_1 TEXT, jefe_1 TEXT, tel_jefe_1 TEXT,
    empresa_2 TEXT, puesto_2 TEXT, antiguedad_2 TEXT, motivo_salida_2 TEXT, jefe_2 TEXT, tel_jefe_2 TEXT,
    empresa_3 TEXT, puesto_3 TEXT, antiguedad_3 TEXT, motivo_salida_3 TEXT, jefe_3 TEXT, tel_jefe_3 TEXT,
    match_score NUMERIC(5,2) DEFAULT 0,
    razon_rechazo TEXT, filtro_fallido TEXT, decision_agente JSONB,
    privacy_accepted BOOLEAN DEFAULT false, fuente TEXT DEFAULT 'formulario_web',
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,

    // 4. Candidatos activos
    `CREATE TABLE IF NOT EXISTS public.candidatos_activos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_puesto UUID REFERENCES public.catalogo_puestos(id),
    codigo_puesto TEXT, nombre_puesto TEXT, nombre_completo TEXT NOT NULL,
    fecha_nacimiento DATE, edad INTEGER, genero TEXT, curp TEXT, rfc TEXT,
    estado_civil TEXT, telefono TEXT, email TEXT, domicilio TEXT,
    colonia TEXT, municipio TEXT, estado TEXT, escolaridad TEXT, carrera TEXT,
    institucion TEXT, anio_egreso TEXT, cedula_profesional TEXT,
    enfermedades_cronicas TEXT, medicamentos TEXT, discapacidades TEXT, tipo_sangre TEXT,
    empresa_1 TEXT, puesto_1 TEXT, antiguedad_1 TEXT, motivo_salida_1 TEXT, jefe_1 TEXT, tel_jefe_1 TEXT,
    empresa_2 TEXT, puesto_2 TEXT, antiguedad_2 TEXT, motivo_salida_2 TEXT, jefe_2 TEXT, tel_jefe_2 TEXT,
    empresa_3 TEXT, puesto_3 TEXT, antiguedad_3 TEXT, motivo_salida_3 TEXT, jefe_3 TEXT, tel_jefe_3 TEXT,
    match_score NUMERIC(5,2) DEFAULT 0,
    fase_actual TEXT DEFAULT 'espera_psicometricos' CHECK (fase_actual IN (
        'espera_psicometricos','psicometricos_realizados','espera_medico',
        'espera_jefe','induccion_sgi','listo_para_contrato','contratado','archivado'
    )),
    decision_agente JSONB,
    privacy_accepted BOOLEAN DEFAULT false, fuente TEXT DEFAULT 'formulario_web',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);`,

    // 5. Seguridad médica
    `CREATE TABLE IF NOT EXISTS public.seguridad_medica (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_candidato UUID REFERENCES public.candidatos_activos(id) ON DELETE CASCADE,
    privacidad_medica_aceptada BOOLEAN DEFAULT false,
    enfermedades_cronicas TEXT, medicamentos_controlados TEXT, discapacidades TEXT, tipo_sangre TEXT,
    tension_arterial TEXT, peso NUMERIC(5,2), talla NUMERIC(4,2), glucosa NUMERIC(5,2),
    antecedentes_familiares TEXT, alergias TEXT, observaciones_medico TEXT,
    veredicto TEXT CHECK (veredicto IN ('APTO','NO_APTO','CONDICIONADO')),
    condicionamiento TEXT, medico_responsable TEXT,
    fecha_examen TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW()
);`,

    // 6. Pruebas psicométricas
    `CREATE TABLE IF NOT EXISTS public.pruebas_psicometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL, descripcion TEXT,
    categoria TEXT NOT NULL, instrucciones TEXT, tiempo_limite_min INTEGER,
    total_reactivos INTEGER, version_actual TEXT DEFAULT '1.0', activa BOOLEAN DEFAULT true,
    puestos_aplica TEXT[], score_min_aprobatorio NUMERIC(5,2) DEFAULT 70.0,
    creado_por TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);`,

    // 7. Preguntas psicométricas
    `CREATE TABLE IF NOT EXISTS public.preguntas_psicometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_prueba UUID NOT NULL REFERENCES public.pruebas_psicometricas(id) ON DELETE CASCADE,
    version_prueba TEXT DEFAULT '1.0', numero_orden INTEGER NOT NULL,
    texto_pregunta TEXT NOT NULL,
    tipo_respuesta TEXT NOT NULL CHECK (tipo_respuesta IN ('opcion_multiple','escala_likert','verdadero_falso','ordenamiento','texto_libre')),
    opciones JSONB, respuesta_correcta TEXT, valor_maximo NUMERIC(6,2) DEFAULT 1.0,
    subtipo TEXT, dificultad TEXT DEFAULT 'media' CHECK (dificultad IN ('baja','media','alta')),
    activa BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_prueba, version_prueba, numero_orden)
);`,

    // 8. Evaluaciones psicométricas
    `CREATE TABLE IF NOT EXISTS public.evaluaciones_psicometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_candidato UUID REFERENCES public.candidatos_activos(id) ON DELETE CASCADE,
    id_prueba UUID REFERENCES public.pruebas_psicometricas(id),
    version_prueba_aplicada TEXT DEFAULT '1.0',
    token_acceso TEXT UNIQUE, token_enviado_en TIMESTAMPTZ, token_expira TIMESTAMPTZ,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_proceso','completado','expirado')),
    iniciado_en TIMESTAMPTZ, completado_en TIMESTAMPTZ,
    score_total NUMERIC(5,2), resultado TEXT CHECK (resultado IN ('APROBADO','REPROBADO','REVISAR')),
    respuestas JSONB, perfil_por_dimension JSONB, observaciones TEXT, evaluador_rrhh TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);`,

    // 9. Log agente
    `CREATE TABLE IF NOT EXISTS public.log_agente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_prospecto UUID, nombre_candidato TEXT, id_puesto UUID, codigo_puesto TEXT,
    decision TEXT NOT NULL, score NUMERIC(5,2), reasoning TEXT,
    filtros_aplicados JSONB, supabase_status TEXT, input_payload JSONB, output_payload JSONB,
    skill_usada TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);`,

    // 10. Usuarios sistema
    `CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL, password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin','rrhh','medico','jefe','sgi','seguridad')),
    departamento TEXT, activo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMPTZ, token_sesion TEXT, token_expira TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,

    // 11. Puesto-prueba config
    `CREATE TABLE IF NOT EXISTS public.puesto_prueba_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_puesto UUID NOT NULL REFERENCES public.catalogo_puestos(id) ON DELETE CASCADE,
    id_prueba UUID NOT NULL REFERENCES public.pruebas_psicometricas(id) ON DELETE CASCADE,
    orden_aplicacion INTEGER NOT NULL DEFAULT 1, es_obligatoria BOOLEAN DEFAULT true,
    score_minimo_puesto NUMERIC(5,2), tiempo_limite_min INTEGER,
    momento_aplicacion TEXT DEFAULT 'pre_entrevista' CHECK (momento_aplicacion IN ('pre_entrevista','durante_entrevista','post_entrevista')),
    instrucciones_adicionales TEXT, activa BOOLEAN DEFAULT true,
    creado_por TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_puesto, id_prueba)
);`,

    // 12. RLS
    `ALTER TABLE public.seguridad_medica           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos_activos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospectos_rechazados       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_agente                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_sistema            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_puestos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones_psicometricas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pruebas_psicometricas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preguntas_psicometricas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puesto_prueba_config        ENABLE ROW LEVEL SECURITY;`,

    // 13. Políticas RLS
    `DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.candidatos_activos FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.prospectos_rechazados FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.seguridad_medica FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.log_agente FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.usuarios_sistema FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.catalogo_puestos FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.evaluaciones_psicometricas FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.pruebas_psicometricas FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.preguntas_psicometricas FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
    CREATE POLICY "srv_all" ON public.puesto_prueba_config FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;`,

    // 14. Datos iniciales — puestos
    `INSERT INTO public.catalogo_puestos (codigo_puesto, nombre_puesto, departamento, escolaridad_minima, experiencia_minima_anios, edad_minima, edad_maxima, sueldo_minimo, sueldo_maximo)
VALUES
    ('QC-001','Analista de Control de Calidad','Calidad e Inocuidad','licenciatura',1,22,40,12000,18000),
    ('ALM-001','Auxiliar de Almacen','Logistica y Almacen','preparatoria',0,18,45,7000,10000),
    ('MIX-001','Mezclador de Produccion','Produccion','secundaria',0,20,50,6000,9000),
    ('ADM-001','Auxiliar Administrativo','Administracion','preparatoria',0,20,40,8000,12000),
    ('VEN-001','Vendedor de Ruta','Ventas','preparatoria',1,22,45,9000,15000)
ON CONFLICT (codigo_puesto) DO NOTHING;`,

    // 15. Datos iniciales — usuarios
    `INSERT INTO public.usuarios_sistema (email, nombre, password_hash, rol, departamento)
VALUES
    ('admin@mabakerandchef.com','Administrador General',crypt('MaBaker2024!',gen_salt('bf')),'admin',NULL),
    ('rrhh@mabakerandchef.com','Recursos Humanos',crypt('RRHH2024!',gen_salt('bf')),'rrhh','Recursos Humanos'),
    ('medico@mabakerandchef.com','Medico Empresarial',crypt('Medico2024!',gen_salt('bf')),'medico','Salud Ocupacional'),
    ('jefe.calidad@mabakerandchef.com','Jefe Calidad',crypt('Jefe2024!',gen_salt('bf')),'jefe','Calidad e Inocuidad'),
    ('sgi@mabakerandchef.com','SGI Calidad',crypt('SGI2024!',gen_salt('bf')),'sgi','Sistema Gestion Integral'),
    ('sh@mabakerandchef.com','Seguridad e Higiene',crypt('SH2024!',gen_salt('bf')),'seguridad','Seguridad e Higiene')
ON CONFLICT (email) DO NOTHING;`
];

async function main() {
    console.log('======================================');
    console.log('  EJECUTANDO SCHEMA EN SUPABASE');
    console.log('  Proyecto:', REF);
    console.log('======================================\n');
    let ok = 0, fail = 0;
    for (let i = 0; i < SQL.length; i++) {
        const n = String(i + 1).padStart(2, '0');
        const r = await runSQL(SQL[i]);
        if (r.status >= 200 && r.status < 300) {
            console.log(`[${n}] ✅  OK (${r.status})`);
            ok++;
        } else {
            const msg = JSON.parse(r.body || '{}');
            console.log(`[${n}] ❌  Error ${r.status}: ${msg.message || r.body.substring(0, 200)}`);
            fail++;
        }
    }
    console.log('\n======================================');
    console.log(`  RESULTADO: ${ok} OK / ${fail} errores`);
    console.log('======================================');
}
main();
