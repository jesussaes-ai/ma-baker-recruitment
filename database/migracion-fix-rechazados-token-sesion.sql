-- Fix: fn_prospectos_rechazados_list usaba columnas obsoletas sesion_token/sesion_expira.
-- En producción usuarios_sistema usa token_sesion / token_expira (igual que fn_catalogo_puestos_list).
-- Auditoría 2026-07-25: RPC devolvía 42703 y el dashboard ocultaba el error (.catch → []).

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
