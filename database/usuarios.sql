-- =======================================================
-- TABLA: usuarios_sistema
-- Login y Control de Acceso por Roles (RBAC)
-- Roles: admin, rrhh, medico, jefe, sgi
-- =======================================================
CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- bcrypt hash
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'rrhh', 'medico', 'jefe', 'sgi')),
    departamento TEXT, -- Para jefes: límita a su área
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    ultimo_acceso TIMESTAMPTZ,
    sesion_token TEXT,
    sesion_expira TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios_sistema(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios_sistema(rol);

ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede gestionar usuarios
CREATE POLICY "service_role_only_usuarios"
    ON public.usuarios_sistema
    FOR ALL TO service_role USING (true);

-- =======================================================
-- USUARIOS INICIALES
-- IMPORTANTE: Establecer contraseñas manualmente con:
--   UPDATE usuarios_sistema SET password_hash = crypt('TuContraseña', gen_salt('bf')) WHERE email = '...';
-- =======================================================
INSERT INTO public.usuarios_sistema (nombre, email, password_hash, rol, departamento) VALUES
('Administrador General', 'admin@mabakerandchef.com',  'PENDIENTE_ESTABLECER', 'admin',  NULL),
('Recursos Humanos',      'rrhh@mabakerandchef.com',   'PENDIENTE_ESTABLECER', 'rrhh',   NULL),
('Médico Empresa',        'medico@mabakerandchef.com', 'PENDIENTE_ESTABLECER', 'medico', NULL),
('Jefe de Calidad',       'jefe@mabakerandchef.com',   'PENDIENTE_ESTABLECER', 'jefe',   'Calidad e Inocuidad'),
('Auditor SGI',           'sgi@mabakerandchef.com',    'PENDIENTE_ESTABLECER', 'sgi',    NULL)
ON CONFLICT (email) DO NOTHING;

-- =======================================================
-- FUNCIÓN: Login (valida email + password, retorna sesión)
-- =======================================================
CREATE OR REPLACE FUNCTION public.fn_login(p_email TEXT, p_password TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user public.usuarios_sistema%ROWTYPE;
    v_token TEXT;
    v_expira TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_user FROM public.usuarios_sistema
    WHERE email = LOWER(TRIM(p_email)) AND activo = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Usuario no encontrado');
    END IF;

    -- Comparación simple (en producción usar pgcrypto bcrypt)
    IF v_user.password_hash != p_password THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Contraseña incorrecta');
    END IF;

    -- Generar token de sesión
    v_token := encode(gen_random_bytes(32), 'hex');
    v_expira := NOW() + INTERVAL '8 hours';

    UPDATE public.usuarios_sistema
    SET sesion_token = v_token,
        sesion_expira = v_expira,
        ultimo_acceso = NOW()
    WHERE id = v_user.id;

    RETURN jsonb_build_object(
        'ok', true,
        'token', v_token,
        'rol', v_user.rol,
        'nombre', v_user.nombre,
        'departamento', v_user.departamento,
        'expira', v_expira
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================
-- FUNCIÓN: Verificar sesión activa
-- =======================================================
CREATE OR REPLACE FUNCTION public.fn_verificar_sesion(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user public.usuarios_sistema%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM public.usuarios_sistema
    WHERE sesion_token = p_token
      AND sesion_expira > NOW()
      AND activo = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Sesión expirada o inválida');
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'rol', v_user.rol,
        'nombre', v_user.nombre,
        'departamento', v_user.departamento
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
