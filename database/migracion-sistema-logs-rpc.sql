-- Auditoría unificada para dashboard Admin/RRHH (log_agente + postulaciones + rechazos + vacantes)

create or replace function public.fn_sistema_logs_list(
  p_token text,
  p_limit integer default 50
)
returns table (
  id text,
  evento text,
  actor text,
  detalle text,
  created_at timestamptz,
  fuente text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.usuarios_sistema%rowtype;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  select * into v_user
  from public.usuarios_sistema
  where token_sesion = p_token
    and token_expira > now()
    and activo = true;

  if not found then
    raise exception 'sesion_invalida';
  end if;

  if v_user.rol not in ('admin', 'rrhh') then
    raise exception 'sin_permiso';
  end if;

  return query
  select * from (
    select
      l.id::text,
      coalesce(nullif(trim(l.decision), ''), 'DECISION_IA') as evento,
      coalesce(nullif(trim(l.nombre_candidato), ''), coalesce(nullif(trim(l.skill_usada), ''), 'Agente IA')) as actor,
      trim(both ' · ' from concat_ws(
        ' · ',
        nullif(trim(l.codigo_puesto), ''),
        nullif(trim(l.skill_usada), ''),
        case when l.score is not null then 'Score ' || l.score::text else null end,
        nullif(left(trim(l.reasoning), 120), '')
      )) as detalle,
      l.created_at,
      'log_agente'::text as fuente
    from public.log_agente l

    union all

    select
      c.id::text,
      'POSTULACION'::text,
      coalesce(nullif(trim(c.nombre_completo), ''), 'Candidato') as actor,
      trim(both ' · ' from concat_ws(
        ' · ',
        nullif(trim(c.nombre_puesto), ''),
        nullif(trim(c.codigo_puesto), ''),
        nullif(trim(c.fase_actual), ''),
        case when c.match_score is not null then 'Score ' || c.match_score::text else null end
      )) as detalle,
      c.created_at,
      'candidatos'::text
    from public.candidatos_activos c

    union all

    select
      r.id::text,
      'RECHAZO'::text,
      coalesce(nullif(trim(r.nombre_completo), ''), 'Candidato') as actor,
      trim(both ' · ' from concat_ws(
        ' · ',
        nullif(trim(r.nombre_puesto), ''),
        nullif(trim(r.filtro_fallido), '')
      )) as detalle,
      r.created_at,
      'rechazados'::text
    from public.prospectos_rechazados r

    union all

    select
      v.id::text,
      case when coalesce(v.activo, false) then 'VACANTE_PUBLICADA' else 'VACANTE_BIBLIOTECA' end as evento,
      coalesce(nullif(trim(v.nombre_archivo_fuente), ''), 'RRHH') as actor,
      trim(both ' · ' from concat_ws(
        ' · ',
        nullif(trim(v.nombre_puesto), ''),
        nullif(trim(v.codigo_puesto), ''),
        nullif(trim(v.departamento), '')
      )) as detalle,
      coalesce(v.creado_en, v.actualizado_en, now()) as created_at,
      'vacantes'::text
    from public.catalogo_puestos v
  ) audit
  order by audit.created_at desc
  limit v_limit;
end;
$$;

grant execute on function public.fn_sistema_logs_list(text, integer) to anon, authenticated;
