-- Listado completo de catalogo_puestos para admin/rrhh (incluye biblioteca no publicada).

create or replace function public.fn_catalogo_puestos_list(p_token text)
returns setof public.catalogo_puestos
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

  if v_user.rol not in ('admin', 'rrhh', 'sgi') then
    raise exception 'rol_sin_permiso';
  end if;

  return query
    select *
    from public.catalogo_puestos
    order by creado_en desc nulls last, nombre_puesto asc;
end;
$$;

grant execute on function public.fn_catalogo_puestos_list(text) to anon, authenticated;
