-- =======================================================
-- ESQUEMA MAESTRO v2.0: RRHH Ma Baker and Chef
-- Supabase Project: znskpdixdyxdbvpapqrg
-- Incluye: puestos, prospectos rechazados, candidatos
--          activos, médico, psicométricos, usuarios RBAC
-- =======================================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- TABLA 1: catalogo_puestos
-- =========================================================
CREATE TABLE IF NOT EXISTS public.catalogo_puestos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_puesto TEXT NOT NULL UNIQUE,
    nombre_puesto TEXT NOT NULL,
    departamento TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    -- Filtros Eliminatorios
    edad_minima INTEGER NOT NULL DEFAULT 18,
    edad_maxima INTEGER NOT NULL DEFAULT 55,
    escolaridad_minima TEXT NOT NULL DEFAULT 'preparatoria',
    carrera_afin TEXT[],
    experiencia_minima_anios NUMERIC(3,1) DEFAULT 0,
    area_experiencia TEXT[],
    -- Ponderación Score (suma 100)
    peso_experiencia INTEGER DEFAULT 40,
    peso_tecnico INTEGER DEFAULT 30,
    peso_estabilidad INTEGER DEFAULT 30,
    -- Requisitos Técnicos
    conocimientos_tecnicos TEXT[],
    certificaciones_requeridas TEXT[],
    competencias_clave TEXT[],
    -- Sueldo
    sueldo_minimo NUMERIC(10,2),
    sueldo_maximo NUMERIC(10,2),
    tipo_contrato TEXT DEFAULT 'tiempo_indeterminado',
    -- Descripción completa del puesto
    descripcion_puesto TEXT,
    descripcion_completa TEXT,           -- texto completo del PDF
    nombre_archivo_fuente TEXT,          -- nombre del PDF original
    fuente_pdf BOOLEAN DEFAULT false,    -- true si se cargó desde PDF
    -- Metadatos
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- TABLA 2: prospectos_rechazados
-- Histórico de aplicantes NO seleccionados por el agente IA
-- =========================================================
CREATE TABLE IF NOT EXISTS public.prospectos_rechazados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Puesto solicitado
    id_puesto UUID REFERENCES public.catalogo_puestos(id),
    codigo_puesto TEXT,
    nombre_puesto TEXT,
    -- Datos Personales
    nombre_completo TEXT NOT NULL,
    fecha_nacimiento DATE,
    edad INTEGER,
    genero TEXT,
    curp TEXT,
    rfc TEXT,
    estado_civil TEXT,
    telefono TEXT,
    email TEXT,
    domicilio TEXT,
    colonia TEXT,
    municipio TEXT,
    estado TEXT,
    -- Datos Académicos
    escolaridad TEXT,
    carrera TEXT,
    institucion TEXT,
    anio_egreso INTEGER,
    cedula_profesional TEXT,
    -- Historial Laboral (últimos 5 empleos)
    empresa_1 TEXT, puesto_1 TEXT, antiguedad_1 TEXT, motivo_salida_1 TEXT, jefe_1 TEXT, tel_jefe_1 TEXT,
    empresa_2 TEXT, puesto_2 TEXT, antiguedad_2 TEXT, motivo_salida_2 TEXT, jefe_2 TEXT, tel_jefe_2 TEXT,
    empresa_3 TEXT, puesto_3 TEXT, antiguedad_3 TEXT, motivo_salida_3 TEXT, jefe_3 TEXT, tel_jefe_3 TEXT,
    empresa_4 TEXT, puesto_4 TEXT, antiguedad_4 TEXT, motivo_salida_4 TEXT, jefe_4 TEXT, tel_jefe_4 TEXT,
    empresa_5 TEXT, puesto_5 TEXT, antiguedad_5 TEXT, motivo_salida_5 TEXT, jefe_5 TEXT, tel_jefe_5 TEXT,
    -- Evaluación del Agente IA
    match_score NUMERIC(5,2),
    razon_rechazo TEXT NOT NULL DEFAULT 'score_insuficiente',
    filtro_fallido TEXT,  -- 'edad' | 'escolaridad' | 'experiencia' | 'score' | 'privacidad' | 'datos_invalidos'
    decision_agente JSONB,
    -- Datos de Salud (sólo si los proporcionó)
    enfermedades_cronicas TEXT,
    medicamentos TEXT,
    discapacidades TEXT,
    tipo_sangre TEXT,
    -- Consentimiento
    privacy_accepted BOOLEAN DEFAULT false,
    -- Metadatos
    fuente TEXT DEFAULT 'formulario_web',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_origen TEXT
);

-- =========================================================
-- TABLA 3: candidatos_activos
-- Pipeline completo de selección — los que SÍ pasaron el filtro IA
-- =========================================================
CREATE TABLE IF NOT EXISTS public.candidatos_activos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Puesto
    id_puesto UUID REFERENCES public.catalogo_puestos(id),
    codigo_puesto TEXT,
    nombre_puesto TEXT,
    -- Datos Personales
    nombre_completo TEXT NOT NULL,
    fecha_nacimiento DATE,
    edad INTEGER,
    genero TEXT,
    curp TEXT,
    rfc TEXT,
    estado_civil TEXT,
    telefono TEXT,
    email TEXT,
    domicilio TEXT,
    colonia TEXT,
    municipio TEXT,
    estado TEXT,
    foto_url TEXT,
    -- Datos Académicos
    escolaridad TEXT,
    carrera TEXT,
    institucion TEXT,
    anio_egreso INTEGER,
    cedula_profesional TEXT,
    -- Datos Socioeconómicos
    personas_dependientes INTEGER,
    nivel_socioeconomico TEXT,
    transporte TEXT,
    -- Historial Laboral (últimos 5 empleos)
    empresa_1 TEXT, puesto_1 TEXT, antiguedad_1 TEXT, motivo_salida_1 TEXT, jefe_1 TEXT, tel_jefe_1 TEXT,
    empresa_2 TEXT, puesto_2 TEXT, antiguedad_2 TEXT, motivo_salida_2 TEXT, jefe_2 TEXT, tel_jefe_2 TEXT,
    empresa_3 TEXT, puesto_3 TEXT, antiguedad_3 TEXT, motivo_salida_3 TEXT, jefe_3 TEXT, tel_jefe_3 TEXT,
    empresa_4 TEXT, puesto_4 TEXT, antiguedad_4 TEXT, motivo_salida_4 TEXT, jefe_4 TEXT, tel_jefe_4 TEXT,
    empresa_5 TEXT, puesto_5 TEXT, antiguedad_5 TEXT, motivo_salida_5 TEXT, jefe_5 TEXT, tel_jefe_5 TEXT,
    -- Evaluación Inicial del Agente IA
    match_score NUMERIC(5,2),              -- Score 0-100
    decision_agente JSONB,
    privacy_accepted BOOLEAN DEFAULT false,
    -- ══════════════════════════════════════
    -- FASES DEL PROCESO DE SELECCIÓN
    -- ══════════════════════════════════════
    -- espera_psicometricos → psicometricos_realizados → espera_medico →
    -- espera_jefe → induccion_sgi → listo_para_contrato → contratado → archivado
    fase_actual TEXT DEFAULT 'espera_psicometricos',
    -- ── Fase: Psicométricos ──
    token_psicometrico TEXT UNIQUE,        -- link único enviado al candidato
    token_enviado_en TIMESTAMPTZ,
    score_psicometrico NUMERIC(5,2),
    resultado_psicometria TEXT,            -- 'APROBADO' | 'REPROBADO' | 'REVISAR'
    perfil_psicologico JSONB,              -- gráfica de barras comparativa
    fecha_psicometria TIMESTAMPTZ,
    -- ── Fase: Médico ──
    aprobacion_medica TEXT,                -- 'APTO' | 'NO_APTO' | 'CONDICIONADO'
    medico_responsable TEXT,
    fecha_examen_medico TIMESTAMPTZ,
    alerta_medica BOOLEAN DEFAULT false,
    -- ── Fase: Jefe de Área ──
    veredicto_jefe TEXT,                   -- 'APROBADO' | 'RECHAZADO' | 'PENDIENTE'
    comentario_jefe TEXT,
    jefe_evaluador TEXT,
    fecha_evaluacion_jefe TIMESTAMPTZ,
    -- ── Fase: Inducción SGI ──
    score_induccion NUMERIC(5,2),
    induccion_completa BOOLEAN DEFAULT false,
    fecha_induccion TIMESTAMPTZ,
    auditor_sgi TEXT,
    alerta_bph BOOLEAN DEFAULT false,
    -- ── Onboarding / Contratación ──
    entrega_uniforme BOOLEAN DEFAULT false,
    entrega_epp BOOLEAN DEFAULT false,
    firma_reglamento BOOLEAN DEFAULT false,
    firma_confidencialidad BOOLEAN DEFAULT false,
    fecha_contratacion DATE,
    -- Metadatos
    fuente TEXT DEFAULT 'formulario_web',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ip_origen TEXT
);

-- =========================================================
-- TABLA 4: seguridad_medica (DATOS SENSIBLES — RLS ESTRICTO)
-- Solo accesible por rol 'medico' o 'admin'
-- =========================================================
CREATE TABLE IF NOT EXISTS public.seguridad_medica (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_candidato UUID REFERENCES public.candidatos_activos(id) ON DELETE CASCADE,
    -- Datos Clínicos
    enfermedades_cronicas TEXT,
    medicamentos_controlados TEXT,
    discapacidades TEXT,
    tipo_sangre TEXT,
    tension_arterial TEXT,
    peso NUMERIC(5,2),
    talla NUMERIC(4,2),
    imc NUMERIC(4,2) GENERATED ALWAYS AS (
        CASE WHEN talla > 0 THEN ROUND((peso / (talla * talla))::NUMERIC, 2) ELSE NULL END
    ) STORED,
    glucosa NUMERIC(5,2),
    antecedentes_familiares TEXT,
    alergias TEXT,
    observaciones_medico TEXT,
    -- Veredicto Médico
    veredicto TEXT CHECK (veredicto IN ('APTO', 'NO_APTO', 'CONDICIONADO')),
    condicionamiento TEXT,
    medico_responsable TEXT,
    fecha_examen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- TABLA 5A: pruebas_psicometricas
-- Catálogo de baterías disponibles — expandible con el tiempo
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pruebas_psicometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT NOT NULL UNIQUE,       -- 'TERMAN', 'PERSONALIDAD', 'SITUACIONAL', etc.
    nombre TEXT NOT NULL,              -- 'Terman-Merril', 'Inventario de Personalidad', etc.
    descripcion TEXT,
    categoria TEXT NOT NULL,           -- 'inteligencia' | 'personalidad' | 'liderazgo' | 'situacional'
    instrucciones TEXT,                -- Instrucciones que ve el candidato antes de iniciar
    tiempo_limite_min INTEGER,         -- minutos, NULL = sin límite
    total_reactivos INTEGER,           -- número total de preguntas
    version_actual TEXT DEFAULT '1.0', -- versión actual de la prueba
    activa BOOLEAN DEFAULT true,
    -- Aplicabilidad por puestos
    puestos_aplica TEXT[],             -- NULL = aplica a todos los puestos
    -- Calificación
    score_min_aprobatorio NUMERIC(5,2) DEFAULT 70.0,
    -- Metadatos
    creado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- TABLA 5B: preguntas_psicometricas
-- Banco de preguntas por prueba — se puede ampliar y cambiar
-- =========================================================
CREATE TABLE IF NOT EXISTS public.preguntas_psicometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_prueba UUID NOT NULL REFERENCES public.pruebas_psicometricas(id) ON DELETE CASCADE,
    version_prueba TEXT DEFAULT '1.0', -- permite versionar el banco de preguntas
    -- Pregunta
    numero_orden INTEGER NOT NULL,
    texto_pregunta TEXT NOT NULL,
    tipo_respuesta TEXT NOT NULL CHECK (tipo_respuesta IN (
        'opcion_multiple',   -- a, b, c, d (una correcta)
        'escala_likert',     -- 1-5 o 1-7
        'verdadero_falso',   -- V/F
        'ordenamiento',      -- ordenar opciones
        'texto_libre'        -- respuesta abierta
    )),
    -- Opciones de respuesta (JSON flexible)
    opciones JSONB,
    /*
    Para opcion_multiple:
    [{"id":"a","texto":"Muy de acuerdo","valor":5},{"id":"b","texto":"De acuerdo","valor":4}]
    
    Para escala_likert:
    {"min":1,"max":7,"etiqueta_min":"Totalmente en desacuerdo","etiqueta_max":"Totalmente de acuerdo"}
    
    Para verdadero_falso:
    [{"id":"V","texto":"Verdadero"},{"id":"F","texto":"Falso"}]
    */
    -- Calificación
    respuesta_correcta TEXT,           -- ID de la opción correcta (NULL para likert/libre)
    valor_maximo NUMERIC(6,2) DEFAULT 1.0,
    -- Aplicabilidad
    subtipo TEXT,                      -- 'razonamiento_verbal' | 'razonamiento_numerico' | etc.
    dificultad TEXT DEFAULT 'media' CHECK (dificultad IN ('baja','media','alta')),
    activa BOOLEAN DEFAULT true,
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_prueba, version_prueba, numero_orden)
);

-- =========================================================
-- TABLA 5C: evaluaciones_psicometricas
-- Resultados por candidato — referencia la prueba con versión
-- =========================================================
CREATE TABLE IF NOT EXISTS public.evaluaciones_psicometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_candidato UUID REFERENCES public.candidatos_activos(id) ON DELETE CASCADE,
    id_prueba UUID REFERENCES public.pruebas_psicometricas(id),
    version_prueba_aplicada TEXT DEFAULT '1.0',
    -- Token de acceso
    token_acceso TEXT UNIQUE,          -- enlace único enviado al candidato
    token_enviado_en TIMESTAMPTZ,
    token_expira TIMESTAMPTZ,          -- expira en 72 horas
    -- Estado
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN (
        'pendiente',    -- link enviado, no iniciado
        'en_proceso',   -- candidato comenzó
        'completado',   -- terminó la prueba
        'expirado'      -- no contestó a tiempo
    )),
    iniciado_en TIMESTAMPTZ,
    completado_en TIMESTAMPTZ,
    -- Resultados globales
    score_total NUMERIC(5,2),
    resultado TEXT CHECK (resultado IN ('APROBADO', 'REPROBADO', 'REVISAR')),
    -- Respuestas individuales (referencia a pregunta + respuesta dada)
    respuestas JSONB,
    /*
    [{
        "id_pregunta": "uuid",
        "numero": 1,
        "respuesta_dada": "b",
        "correcta": true,
        "valor_obtenido": 1.0,
        "tiempo_respuesta_seg": 12
    }, ...]
    */
    -- Resultados por dimensión (para gráfica comparativa)
    perfil_por_dimension JSONB,
    /*
    {
        "razonamiento_verbal":    {"obtenido": 85, "ideal": 80, "percentil": 75},
        "razonamiento_numerico":  {"obtenido": 70, "ideal": 85, "percentil": 55},
        "memoria":                {"obtenido": 90, "ideal": 75, "percentil": 92},
        "atencion":               {"obtenido": 88, "ideal": 80, "percentil": 80}
    }
    */
    -- Alertas y observaciones
    observaciones TEXT,
    evaluador_rrhh TEXT,               -- quién revisó los resultados en RRHH
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- TABLA 6: log_agente
-- Trazabilidad de cada decisión del agente IA
-- =========================================================
CREATE TABLE IF NOT EXISTS public.log_agente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_prospecto UUID,
    nombre_candidato TEXT,
    id_puesto UUID,
    codigo_puesto TEXT,
    decision TEXT NOT NULL,     -- 'PROMOTE' | 'ARCHIVE' | 'UPDATE_PHASE' | 'AUDIT_PASS' | 'AUDIT_FAIL'
    score NUMERIC(5,2),
    reasoning TEXT,
    filtros_aplicados JSONB,
    supabase_status TEXT,
    input_payload JSONB,
    output_payload JSONB,
    skill_usada TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- TABLA 7: usuarios_sistema (RBAC)
-- Control de acceso por roles para el sistema interno
-- =========================================================
CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    password_hash TEXT NOT NULL,   -- bcrypt hash
    rol TEXT NOT NULL CHECK (rol IN (
        'admin',      -- Administrador General: acceso total
        'rrhh',       -- Recursos Humanos: candidatos, rechazados, vacantes, psicométricos
        'medico',     -- Médico: solo datos clínicos y veredicto médico
        'jefe',       -- Jefe de Área: solo candidatos de su departamento
        'sgi',        -- Sistema de Gestión Integral de Calidad: inducción BPM y calidad
        'seguridad'   -- Seguridad e Higiene: inducción SH, EPP y protocolos de seguridad
    )),
    departamento TEXT,             -- solo relevante para rol 'jefe'
    activo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMPTZ,
    token_sesion TEXT,             -- token activo
    token_expira TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- ÍNDICES PARA RENDIMIENTO
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_candidatos_fase      ON public.candidatos_activos(fase_actual);
CREATE INDEX IF NOT EXISTS idx_candidatos_puesto    ON public.candidatos_activos(id_puesto);
CREATE INDEX IF NOT EXISTS idx_candidatos_score     ON public.candidatos_activos(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidatos_depto     ON public.candidatos_activos(nombre_puesto);
CREATE INDEX IF NOT EXISTS idx_rechazados_puesto    ON public.prospectos_rechazados(id_puesto);
CREATE INDEX IF NOT EXISTS idx_rechazados_fecha     ON public.prospectos_rechazados(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rechazados_filtro    ON public.prospectos_rechazados(filtro_fallido);
CREATE INDEX IF NOT EXISTS idx_log_decision         ON public.log_agente(decision, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_puestos_activos      ON public.catalogo_puestos(activo) WHERE activo = true;
-- =========================================================
-- TABLA 8: puesto_prueba_config
-- Configuración de psicométricos POR PUESTO DE TRABAJO
-- Permite definir qué baterías aplican a cada vacante,
-- en qué orden, si son obligatorias y con qué score mínimo.
-- =========================================================
CREATE TABLE IF NOT EXISTS public.puesto_prueba_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_puesto UUID NOT NULL REFERENCES public.catalogo_puestos(id) ON DELETE CASCADE,
    id_prueba UUID NOT NULL REFERENCES public.pruebas_psicometricas(id) ON DELETE CASCADE,
    -- Configuración específica para este puesto
    orden_aplicacion INTEGER NOT NULL DEFAULT 1,    -- en qué orden se aplica (1 primero, 2 segundo…)
    es_obligatoria BOOLEAN DEFAULT true,            -- si no aplica al puesto, puede ser false
    score_minimo_puesto NUMERIC(5,2),               -- score mínimo para ESTE puesto (sobreescribe el global)
    -- Tiempo personalizado
    tiempo_limite_min INTEGER,                      -- el puesto puede tener más/menos tiempo
    -- ¿Se aplica antes o después de la entrevista?
    momento_aplicacion TEXT DEFAULT 'pre_entrevista' CHECK (momento_aplicacion IN (
        'pre_entrevista',     -- el candidato la hace solo antes de ser contactado
        'durante_entrevista', -- se aplica en presencia del evaluador
        'post_entrevista'     -- se aplica después de la entrevista
    )),
    -- Instrucciones adicionales específicas del puesto
    instrucciones_adicionales TEXT,
    activa BOOLEAN DEFAULT true,
    -- Metadatos
    creado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_puesto, id_prueba)  -- un puesto no puede tener la misma prueba dos veces
);


CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_candidatos_updated_at
    BEFORE UPDATE ON public.candidatos_activos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.update_catalogo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_catalogo_updated_at
    BEFORE UPDATE ON public.catalogo_puestos
    FOR EACH ROW EXECUTE FUNCTION public.update_catalogo_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================
ALTER TABLE public.seguridad_medica          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos_activos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospectos_rechazados     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_agente                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_sistema          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_puestos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones_psicometricas ENABLE ROW LEVEL SECURITY;

-- service_role tiene acceso total (requerido por la app)
CREATE POLICY "service_role_all" ON public.candidatos_activos         FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON public.prospectos_rechazados      FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON public.seguridad_medica           FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON public.log_agente                 FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON public.usuarios_sistema           FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON public.catalogo_puestos           FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON public.evaluaciones_psicometricas FOR ALL TO service_role USING (true);

-- Acceso anónimo: solo insertar en candidatos/rechazados (desde el formulario público)
CREATE POLICY "anon_insert_candidatos"   ON public.candidatos_activos    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_rechazados"   ON public.prospectos_rechazados FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_read_puestos"        ON public.catalogo_puestos      FOR SELECT TO anon USING (activo = true);

-- =========================================================
-- FUNCIÓN: fn_login — autenticación de usuarios sistema
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_login(p_email TEXT, p_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user public.usuarios_sistema%ROWTYPE;
    v_token TEXT;
    v_expira TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_user
    FROM public.usuarios_sistema
    WHERE email = LOWER(TRIM(p_email)) AND activo = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Usuario no encontrado');
    END IF;

    IF v_user.password_hash != crypt(p_password, v_user.password_hash) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Contraseña incorrecta');
    END IF;

    v_token := encode(gen_random_bytes(32), 'hex');
    v_expira := NOW() + INTERVAL '8 hours';

    UPDATE public.usuarios_sistema
    SET token_sesion = v_token, token_expira = v_expira, ultimo_login = NOW()
    WHERE id = v_user.id;

    RETURN jsonb_build_object(
        'ok', true,
        'token', v_token,
        'expira', v_expira,
        'rol', v_user.rol,
        'nombre', v_user.nombre,
        'departamento', v_user.departamento,
        'id', v_user.id
    );
END;
$$;

-- =========================================================
-- FUNCIÓN: fn_verificar_sesion
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_verificar_sesion(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user public.usuarios_sistema%ROWTYPE;
BEGIN
    SELECT * INTO v_user
    FROM public.usuarios_sistema
    WHERE token_sesion = p_token AND token_expira > NOW() AND activo = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Sesión inválida o expirada');
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'rol', v_user.rol,
        'nombre', v_user.nombre,
        'departamento', v_user.departamento,
        'id', v_user.id
    );
END;
$$;

-- =========================================================
-- USUARIOS INICIALES (contraseñas en bcrypt)
-- IMPORTANTE: Establecer contraseñas usando psql o Supabase SQL Editor.
-- No ejecutar este bloque con contraseñas hardcodeadas en producción.
-- Ejemplo: UPDATE usuarios_sistema SET password_hash = crypt('TuContraseña', gen_salt('bf')) WHERE email = '...';
-- =========================================================
INSERT INTO public.usuarios_sistema (email, nombre, password_hash, rol, departamento) VALUES
    ('admin@mabakerandchef.com',  'Administrador General', 'PENDIENTE_ESTABLECER', 'admin',  NULL),
    ('rrhh@mabakerandchef.com',   'RRHH Ma Baker',         'PENDIENTE_ESTABLECER', 'rrhh',   'Recursos Humanos'),
    ('medico@mabakerandchef.com', 'Médico del Trabajo',    'PENDIENTE_ESTABLECER', 'medico', 'Salud Ocupacional'),
    ('jefe@mabakerandchef.com',   'Jefe de Producción',    'PENDIENTE_ESTABLECER', 'jefe',   'Producción'),
    ('sgi@mabakerandchef.com',    'Auditor SGI',           'PENDIENTE_ESTABLECER', 'sgi',    'SGI y Seguridad')
ON CONFLICT (email) DO NOTHING;

-- =========================================================
-- DATOS INICIALES: Catálogo de Puestos
-- =========================================================
INSERT INTO public.catalogo_puestos (
    codigo_puesto, nombre_puesto, departamento,
    edad_minima, edad_maxima, escolaridad_minima, carrera_afin,
    experiencia_minima_anios, area_experiencia,
    peso_experiencia, peso_tecnico, peso_estabilidad,
    conocimientos_tecnicos, certificaciones_requeridas,
    sueldo_minimo, sueldo_maximo,
    descripcion_puesto, competencias_clave
) VALUES
(
    'QC-001', 'Analista de Control de Calidad', 'Calidad e Inocuidad',
    22, 35, 'licenciatura',
    ARRAY['Ing. Alimentos', 'Química', 'Biología', 'Ing. Agroindustrial', 'Nutrición'],
    1.0, ARRAY['control de calidad', 'microbiología', 'inocuidad alimentaria'],
    40, 30, 30,
    ARRAY['HACCP', 'ISO 22000', 'NOM-251-SSA1-2009', 'análisis microbiológico', 'BPM'],
    ARRAY['ISO 22000', 'HACCP'],
    18000, 25000,
    'Responsable del análisis y aseguramiento de la calidad e inocuidad en los procesos de producción.',
    ARRAY['atención al detalle', 'análisis crítico', 'trabajo en equipo', 'normas de higiene']
),
(
    'ALM-001', 'Auxiliar de Almacén', 'Logística y Almacén',
    18, 40, 'preparatoria',
    ARRAY['Preparatoria', 'Técnico en Logística', 'Administración'],
    0.0, ARRAY['almacén', 'inventario', 'logística'],
    35, 35, 30,
    ARRAY['manejo de montacargas', 'SAP básico', 'Excel básico', 'PEPS', 'BPM'],
    ARRAY[]::TEXT[],
    8000, 12000,
    'Responsable del control de inventario, recepción, almacenamiento y despacho de insumos.',
    ARRAY['organización', 'responsabilidad', 'puntualidad', 'trabajo en equipo']
),
(
    'PRD-001', 'Mezclador de Producción', 'Producción',
    20, 45, 'secundaria',
    ARRAY['Secundaria', 'Preparatoria', 'Técnico en Alimentos'],
    0.0, ARRAY['producción', 'manufactura', 'mezclado', 'panadería'],
    30, 40, 30,
    ARRAY['BPM', 'NOM-251', 'pesaje y dosificación', 'higiene personal'],
    ARRAY[]::TEXT[],
    7500, 10000,
    'Operador responsable del mezclado, pesaje y preparación de masas conforme a recetas estándar.',
    ARRAY['disciplina', 'higiene', 'atención a recetas', 'trabajo físico']
)
ON CONFLICT (codigo_puesto) DO NOTHING;
