-- Eliminar vacante de biblioteca (admin/rrhh). Bloquea si hay candidatos ligados.

create or replace function public.fn_catalogo_puesto_delete(
  p_token text,
  p_id uuid
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
  if not found then
    return jsonb_build_object('ok', false, 'error', 'sesion_invalida');
  end if;
  if v_user.rol not in ('admin', 'rrhh') then
    return jsonb_build_object('ok', false, 'error', 'rol_sin_permiso');
  end if;

  if not exists (select 1 from public.catalogo_puestos where id = p_id) then
    return jsonb_build_object('ok', false, 'error', 'vacante_no_encontrada');
  end if;

  if exists (select 1 from public.candidatos_activos where id_puesto = p_id limit 1)
     or exists (select 1 from public.prospectos_rechazados where id_puesto = p_id limit 1) then
    return jsonb_build_object(
      'ok', false,
      'error', 'vacante_con_candidatos',
      'message', 'No se puede eliminar: hay postulaciones ligadas a esta descripción.'
    );
  end if;

  delete from public.catalogo_puestos where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.fn_catalogo_puesto_delete(text, uuid) to anon, authenticated;
