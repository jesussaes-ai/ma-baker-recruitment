-- Fase 4: transición psicométricos → médico → jefe + acceso dashboards vía RPC con sesión

-- Columna veredicto jefe (usada por dashboard-jefe.html)
alter table public.candidatos_activos
  add column if not exists veredicto_jefe text;

-- Portal psicométrico: candidato puede cerrar fase al terminar evaluación
drop policy if exists anon_update_candidato_psico_fase on public.candidatos_activos;
create policy anon_update_candidato_psico_fase on public.candidatos_activos
  for update to anon
  using (
    exists (
      select 1 from public.evaluaciones_psicometricas e
      where e.id_candidato = candidatos_activos.id
        and e.token_acceso is not null
        and e.estado in ('en_proceso', 'completado')
    )
  )
  with check (fase_actual in ('psicometricos_realizados', 'espera_medico'));

-- Listado de candidatos para dashboards internos (valida sesion_token)
create or replace function public.fn_candidatos_list(
  p_token text,
  p_incluir_medico boolean default false
)
returns setof public.candidatos_activos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.usuarios_sistema%rowtype;
begin
  select * into v_user
  from public.usuarios_sistema
  where token_sesion = p_token
    and token_expira > now()
    and activo = true;

  if not found then
    raise exception 'sesion_invalida';
  end if;

  if v_user.rol in ('admin', 'rrhh', 'sgi') then
    return query
      select * from public.candidatos_activos
      order by created_at desc;
  elsif v_user.rol = 'medico' then
    return query
      select * from public.candidatos_activos
      where fase_actual in ('espera_medico', 'rechazado_medico')
         or dictamen_medico is not null
         or resultado_medico is not null
      order by created_at desc;
  elsif v_user.rol = 'jefe' then
    return query
      select * from public.candidatos_activos
      where (
          v_user.departamento is null
          or lower(coalesce(departamento, '')) = lower(v_user.departamento)
          or lower(coalesce(nombre_puesto, '')) like '%' || lower(v_user.departamento) || '%'
        )
        and (
          fase_actual in ('espera_jefe', 'rechazado_jefe', 'induccion_sgi')
          or veredicto_jefe is not null
        )
      order by created_at desc;
  end if;
end;
$$;

-- Actualización de candidato con control por rol
create or replace function public.fn_candidato_update(
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
  v_fase text;
  v_veredicto text;
begin
  select * into v_user
  from public.usuarios_sistema
  where token_sesion = p_token
    and token_expira > now()
    and activo = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'sesion_invalida');
  end if;

  if not exists (select 1 from public.candidatos_activos where id = p_id) then
    return jsonb_build_object('ok', false, 'error', 'candidato_no_encontrado');
  end if;

  v_fase := nullif(trim(both from coalesce(p_payload->>'fase_actual', '')), '');
  v_veredicto := nullif(trim(both from coalesce(p_payload->>'veredicto_jefe', '')), '');

  if v_user.rol = 'medico' then
    update public.candidatos_activos set
      dictamen_medico = coalesce(p_payload->>'dictamen_medico', p_payload->>'resultado_medico', dictamen_medico),
      resultado_medico = coalesce(p_payload->>'resultado_medico', p_payload->>'dictamen_medico', resultado_medico),
      observaciones_medico = coalesce(p_payload->>'observaciones_medico', observaciones_medico),
      tension_arterial = coalesce(p_payload->>'tension_arterial', tension_arterial),
      peso = coalesce((p_payload->>'peso')::numeric, peso),
      talla = coalesce((p_payload->>'talla')::numeric, talla),
      glucosa = coalesce((p_payload->>'glucosa')::numeric, glucosa),
      temperatura = coalesce((p_payload->>'temperatura')::numeric, temperatura),
      fase_actual = coalesce(v_fase, fase_actual),
      updated_at = now()
    where id = p_id
      and (
        v_fase is null
        or v_fase in ('espera_jefe', 'rechazado_medico')
      );
  elsif v_user.rol = 'jefe' then
    update public.candidatos_activos set
      veredicto_jefe = coalesce(v_veredicto, veredicto_jefe),
      calificacion_tecnica = coalesce((p_payload->>'calificacion_tecnica')::numeric, calificacion_tecnica),
      fortalezas_tecnicas = coalesce(p_payload->>'fortalezas_tecnicas', fortalezas_tecnicas),
      areas_mejora = coalesce(p_payload->>'areas_mejora', areas_mejora),
      comentarios_jefe = coalesce(p_payload->>'comentarios_jefe', comentarios_jefe),
      fase_actual = coalesce(v_fase, fase_actual),
      updated_at = now()
    where id = p_id
      and (
        v_fase is null
        or v_fase in ('induccion_sgi', 'rechazado_jefe')
      );
  elsif v_user.rol in ('admin', 'rrhh', 'sgi') then
    update public.candidatos_activos set
      fase_actual = coalesce(v_fase, fase_actual),
      score_psicometrico = coalesce((p_payload->>'score_psicometrico')::numeric, score_psicometrico),
      resultado_psicometria = coalesce(p_payload->>'resultado_psicometria', resultado_psicometria),
      fecha_psicometria = coalesce((p_payload->>'fecha_psicometria')::timestamptz, fecha_psicometria),
      perfil_psicologico = coalesce(p_payload->'perfil_psicologico', perfil_psicologico),
      dictamen_medico = coalesce(p_payload->>'dictamen_medico', dictamen_medico),
      resultado_medico = coalesce(p_payload->>'resultado_medico', resultado_medico),
      veredicto_jefe = coalesce(v_veredicto, veredicto_jefe),
      updated_at = now()
    where id = p_id;
  else
    return jsonb_build_object('ok', false, 'error', 'rol_sin_permiso');
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'sin_cambios');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.fn_candidatos_list(text, boolean) to anon, authenticated;
grant execute on function public.fn_candidato_update(text, uuid, jsonb) to anon, authenticated;

-- Listado rechazados para RRHH (requiere sesión)
create or replace function public.fn_prospectos_rechazados_list(p_token text)
returns setof public.prospectos_rechazados
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.usuarios_sistema%rowtype;
begin
  select * into v_user from public.usuarios_sistema
  where token_sesion = p_token and token_expira > now() and activo = true;
  if not found then raise exception 'sesion_invalida'; end if;
  if v_user.rol not in ('admin', 'rrhh', 'sgi') then
    raise exception 'rol_sin_permiso';
  end if;
  return query select * from public.prospectos_rechazados order by created_at desc;
end;
$$;

grant execute on function public.fn_prospectos_rechazados_list(text) to anon, authenticated;
