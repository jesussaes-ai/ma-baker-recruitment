-- Campos opcionales visibles en portal de postulación (independiente del descriptivo interno)

alter table public.catalogo_puestos
  add column if not exists portal_campos_visibles jsonb not null default '{
    "nombre": true,
    "departamento": true,
    "descripcion": true,
    "escolaridad": true,
    "experiencia": true,
    "edad": true,
    "sueldo": false,
    "conocimientos": false,
    "competencias": false
  }'::jsonb;

create or replace function public.fn_catalogo_puesto_update(
  p_token text,
  p_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.usuarios_sistema%rowtype;
begin
  select * into v_user from public.usuarios_sistema
  where token_sesion = p_token and token_expira > now() and activo = true;
  if not found then return jsonb_build_object('ok', false, 'error', 'sesion_invalida'); end if;
  if v_user.rol not in ('admin', 'rrhh', 'sgi') then
    return jsonb_build_object('ok', false, 'error', 'rol_sin_permiso');
  end if;

  update public.catalogo_puestos set
    codigo_puesto = coalesce(nullif(trim(p_payload->>'codigo_puesto'), ''), codigo_puesto),
    nombre_puesto = coalesce(nullif(trim(p_payload->>'nombre_puesto'), ''), nombre_puesto),
    departamento = coalesce(nullif(trim(p_payload->>'departamento'), ''), departamento),
    sueldo_minimo = coalesce((p_payload->>'sueldo_minimo')::numeric, sueldo_minimo),
    sueldo_maximo = coalesce((p_payload->>'sueldo_maximo')::numeric, sueldo_maximo),
    escolaridad_minima = coalesce(nullif(trim(p_payload->>'escolaridad_minima'), ''), escolaridad_minima),
    experiencia_minima_anios = coalesce((p_payload->>'experiencia_minima_anios')::numeric, experiencia_minima_anios),
    edad_minima = coalesce((p_payload->>'edad_minima')::int, edad_minima),
    edad_maxima = coalesce((p_payload->>'edad_maxima')::int, edad_maxima),
    descripcion_completa = coalesce(nullif(trim(p_payload->>'descripcion_completa'), ''), descripcion_completa),
    descripcion_puesto = coalesce(nullif(trim(p_payload->>'descripcion_puesto'), ''), descripcion_puesto),
    conocimientos_tecnicos = coalesce(
      public.fn_texto_a_text_array(p_payload->>'conocimientos_tecnicos'),
      conocimientos_tecnicos
    ),
    competencias_clave = coalesce(
      public.fn_texto_a_text_array(p_payload->>'competencias_clave'),
      competencias_clave
    ),
    nombre_archivo_fuente = coalesce(nullif(trim(p_payload->>'nombre_archivo_fuente'), ''), nombre_archivo_fuente),
    activo = coalesce((p_payload->>'activo')::boolean, activo),
    portal_campos_visibles = coalesce(
      p_payload->'portal_campos_visibles',
      portal_campos_visibles
    ),
    actualizado_en = now()
  where id = p_id;

  if not found then return jsonb_build_object('ok', false, 'error', 'vacante_no_encontrada'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.fn_catalogo_puesto_insert(
  p_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.usuarios_sistema%rowtype;
  v_id uuid;
begin
  select * into v_user from public.usuarios_sistema
  where token_sesion = p_token and token_expira > now() and activo = true;
  if not found then return jsonb_build_object('ok', false, 'error', 'sesion_invalida'); end if;
  if v_user.rol not in ('admin', 'rrhh', 'sgi') then
    return jsonb_build_object('ok', false, 'error', 'rol_sin_permiso');
  end if;

  insert into public.catalogo_puestos (
    codigo_puesto, nombre_puesto, departamento, escolaridad_minima,
    experiencia_minima_anios, edad_minima, edad_maxima,
    sueldo_minimo, sueldo_maximo, descripcion_completa, descripcion_puesto,
    conocimientos_tecnicos, competencias_clave, nombre_archivo_fuente,
    fuente_pdf, activo, portal_campos_visibles
  ) values (
    coalesce(nullif(trim(p_payload->>'codigo_puesto'), ''), 'GEN-' || left(replace(gen_random_uuid()::text, '-', ''), 8)),
    coalesce(nullif(trim(p_payload->>'nombre_puesto'), ''), 'Puesto sin nombre'),
    coalesce(nullif(trim(p_payload->>'departamento'), ''), 'General'),
    coalesce(nullif(trim(p_payload->>'escolaridad_minima'), ''), 'Sin especificar'),
    coalesce((p_payload->>'experiencia_minima_anios')::numeric, 0),
    coalesce((p_payload->>'edad_minima')::int, 18),
    coalesce((p_payload->>'edad_maxima')::int, 55),
    coalesce((p_payload->>'sueldo_minimo')::numeric, 0),
    coalesce((p_payload->>'sueldo_maximo')::numeric, 0),
    coalesce(p_payload->>'descripcion_completa', ''),
    coalesce(p_payload->>'descripcion_puesto', p_payload->>'descripcion_completa', ''),
    coalesce(public.fn_texto_a_text_array(p_payload->>'conocimientos_tecnicos'), '{}'::text[]),
    coalesce(public.fn_texto_a_text_array(p_payload->>'competencias_clave'), '{}'::text[]),
    coalesce(p_payload->>'nombre_archivo_fuente', 'Manual'),
    coalesce((p_payload->>'fuente_pdf')::boolean, false),
    coalesce((p_payload->>'activo')::boolean, false),
    coalesce(
      p_payload->'portal_campos_visibles',
      '{
        "nombre": true,
        "departamento": true,
        "descripcion": true,
        "escolaridad": true,
        "experiencia": true,
        "edad": true,
        "sueldo": false,
        "conocimientos": false,
        "competencias": false
      }'::jsonb
    )
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
