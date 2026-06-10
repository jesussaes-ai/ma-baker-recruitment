-- RLS para portal psicométrico del candidato (rol anon) + tabla candidato_documentos

-- candidato_documentos (si no existe)
create table if not exists public.candidato_documentos (
  id uuid primary key default gen_random_uuid(),
  candidato_id uuid null,
  candidato_email text not null,
  candidato_nombre text null,
  codigo_puesto text null,
  origen_postulacion text null,
  tipo_documento text not null,
  nombre_archivo text not null,
  mime_type text not null,
  storage_bucket text not null,
  storage_path text not null unique,
  tamano_bytes bigint not null default 0,
  estado_revision text not null default 'pendiente',
  fecha_carga timestamptz not null default now(),
  revisado_por text null,
  fecha_revision timestamptz null,
  comentario_revision text null
);

alter table public.candidato_documentos enable row level security;

-- evaluaciones: lectura/actualización por token (UUID no adivinable)
drop policy if exists anon_read_eval_psico on public.evaluaciones_psicometricas;
create policy anon_read_eval_psico on public.evaluaciones_psicometricas
  for select to anon
  using (token_acceso is not null);

drop policy if exists anon_update_eval_psico on public.evaluaciones_psicometricas;
create policy anon_update_eval_psico on public.evaluaciones_psicometricas
  for update to anon
  using (token_acceso is not null and estado in ('pendiente', 'en_proceso'))
  with check (token_acceso is not null and estado in ('pendiente', 'en_proceso', 'completado'));

-- candidatos: solo lectura si tienen evaluación activa con token
drop policy if exists anon_read_candidato_psico on public.candidatos_activos;
create policy anon_read_candidato_psico on public.candidatos_activos
  for select to anon
  using (
    exists (
      select 1 from public.evaluaciones_psicometricas e
      where e.id_candidato = candidatos_activos.id
        and e.token_acceso is not null
        and e.estado in ('pendiente', 'en_proceso', 'completado')
    )
  );

-- catálogo de pruebas y preguntas activas
drop policy if exists anon_read_pruebas_psico on public.pruebas_psicometricas;
create policy anon_read_pruebas_psico on public.pruebas_psicometricas
  for select to anon
  using (coalesce(activa, true) = true);

drop policy if exists anon_read_preguntas_psico on public.preguntas_psicometricas;
create policy anon_read_preguntas_psico on public.preguntas_psicometricas
  for select to anon
  using (coalesce(activa, true) = true);

drop policy if exists anon_read_puesto_prueba_config on public.puesto_prueba_config;
create policy anon_read_puesto_prueba_config on public.puesto_prueba_config
  for select to anon
  using (true);

-- candidato_documentos: solo service_role (upload vía Edge Function)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'candidato_documentos'
      and policyname = 'service_role_all_candidato_documentos'
  ) then
    create policy service_role_all_candidato_documentos
      on public.candidato_documentos
      for all to service_role
      using (true) with check (true);
  end if;
end $$;

create index if not exists idx_candidato_documentos_email on public.candidato_documentos(candidato_email);
create index if not exists idx_candidato_documentos_candidato_id on public.candidato_documentos(candidato_id);
create index if not exists idx_evaluaciones_token on public.evaluaciones_psicometricas(token_acceso);
