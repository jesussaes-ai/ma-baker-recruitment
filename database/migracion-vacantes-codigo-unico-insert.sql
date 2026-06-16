-- Garantiza codigo_puesto único al insertar (evita choque por plantillas Word repetidas)

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
  v_codigo text;
  v_try int := 0;
begin
  select * into v_user from public.usuarios_sistema
  where token_sesion = p_token and token_expira > now() and activo = true;
  if not found then return jsonb_build_object('ok', false, 'error', 'sesion_invalida'); end if;
  if v_user.rol not in ('admin', 'rrhh', 'sgi') then
    return jsonb_build_object('ok', false, 'error', 'rol_sin_permiso');
  end if;

  v_codigo := upper(coalesce(nullif(trim(p_payload->>'codigo_puesto'), ''), 'GEN-' || left(replace(gen_random_uuid()::text, '-', ''), 8)));

  while exists (select 1 from public.catalogo_puestos cp where cp.codigo_puesto = v_codigo) and v_try < 8 loop
    v_try := v_try + 1;
    v_codigo := left(v_codigo, 36) || '-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 4));
  end loop;

  insert into public.catalogo_puestos (
    codigo_puesto, nombre_puesto, departamento, escolaridad_minima,
    experiencia_minima_anios, edad_minima, edad_maxima,
    sueldo_minimo, sueldo_maximo, descripcion_completa, descripcion_puesto,
    conocimientos_tecnicos, competencias_clave, nombre_archivo_fuente,
    fuente_pdf, activo, portal_campos_visibles
  ) values (
    v_codigo,
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

  return jsonb_build_object('ok', true, 'id', v_id, 'codigo_puesto', v_codigo);
end;
$$;
