-- Fase 6: Contratación (uniforme, EPP, firmas, fecha) vía RPC admin/rrhh

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
  v_decision jsonb;
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
  v_decision := coalesce(p_payload->'decision_agente', '{}'::jsonb);

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
      and fase_actual in ('espera_medico', 'rechazado_medico', 'espera_jefe')
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
      and fase_actual in ('espera_jefe', 'rechazado_jefe', 'induccion_sgi')
      and (
        v_fase is null
        or v_fase in ('induccion_sgi', 'rechazado_jefe')
      );
  elsif v_user.rol = 'sgi' then
    update public.candidatos_activos set
      fase_actual = coalesce(v_fase, fase_actual),
      decision_agente = coalesce(decision_agente, '{}'::jsonb) || v_decision,
      score_induccion = coalesce((p_payload->>'score_induccion')::numeric, score_induccion),
      induccion_completa = coalesce((p_payload->>'induccion_completa')::boolean, induccion_completa),
      auditor_sgi = coalesce(p_payload->>'auditor_sgi', auditor_sgi, v_user.nombre),
      fecha_induccion = coalesce((p_payload->>'fecha_induccion')::timestamptz, fecha_induccion, now()),
      updated_at = now()
    where id = p_id
      and fase_actual in ('induccion_sgi', 'induccion_seguridad')
      and (
        v_fase is null
        or v_fase in ('induccion_seguridad', 'induccion_sgi')
      );
  elsif v_user.rol = 'seguridad' then
    update public.candidatos_activos set
      fase_actual = coalesce(v_fase, fase_actual),
      decision_agente = coalesce(decision_agente, '{}'::jsonb) || v_decision,
      updated_at = now()
    where id = p_id
      and fase_actual in ('induccion_seguridad', 'listo_para_contrato')
      and (
        v_fase is null
        or v_fase in ('listo_para_contrato', 'induccion_seguridad')
      );
  elsif v_user.rol in ('admin', 'rrhh') then
    update public.candidatos_activos set
      fase_actual = coalesce(v_fase, fase_actual),
      decision_agente = case
        when p_payload ? 'decision_agente' then coalesce(decision_agente, '{}'::jsonb) || v_decision
        else decision_agente
      end,
      score_psicometrico = coalesce((p_payload->>'score_psicometrico')::numeric, score_psicometrico),
      resultado_psicometria = coalesce(p_payload->>'resultado_psicometria', resultado_psicometria),
      fecha_psicometria = coalesce((p_payload->>'fecha_psicometria')::timestamptz, fecha_psicometria),
      perfil_psicologico = coalesce(p_payload->'perfil_psicologico', perfil_psicologico),
      dictamen_medico = coalesce(p_payload->>'dictamen_medico', dictamen_medico),
      resultado_medico = coalesce(p_payload->>'resultado_medico', resultado_medico),
      veredicto_jefe = coalesce(v_veredicto, veredicto_jefe),
      score_induccion = coalesce((p_payload->>'score_induccion')::numeric, score_induccion),
      induccion_completa = coalesce((p_payload->>'induccion_completa')::boolean, induccion_completa),
      entrega_uniforme = case when p_payload ? 'entrega_uniforme'
        then (p_payload->>'entrega_uniforme')::boolean else entrega_uniforme end,
      entrega_epp = case when p_payload ? 'entrega_epp'
        then (p_payload->>'entrega_epp')::boolean else entrega_epp end,
      firma_reglamento = case when p_payload ? 'firma_reglamento'
        then (p_payload->>'firma_reglamento')::boolean else firma_reglamento end,
      firma_confidencialidad = case when p_payload ? 'firma_confidencialidad'
        then (p_payload->>'firma_confidencialidad')::boolean else firma_confidencialidad end,
      fecha_contratacion = coalesce((p_payload->>'fecha_contratacion')::date, fecha_contratacion),
      updated_at = now()
    where id = p_id
      and (
        v_fase is null
        or v_fase <> 'contratado'
        or (
          coalesce(entrega_uniforme, false)
          and coalesce(entrega_epp, false)
          and coalesce(firma_reglamento, false)
          and coalesce(firma_confidencialidad, false)
        )
        or (
          coalesce((p_payload->>'entrega_uniforme')::boolean, entrega_uniforme, false)
          and coalesce((p_payload->>'entrega_epp')::boolean, entrega_epp, false)
          and coalesce((p_payload->>'firma_reglamento')::boolean, firma_reglamento, false)
          and coalesce((p_payload->>'firma_confidencialidad')::boolean, firma_confidencialidad, false)
        )
      );
  else
    return jsonb_build_object('ok', false, 'error', 'rol_sin_permiso');
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'sin_cambios');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.fn_candidato_update(text, uuid, jsonb) to anon, authenticated;
