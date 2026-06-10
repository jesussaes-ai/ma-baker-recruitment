-- Tabla segura de documentos de candidatos
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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='candidato_documentos'
      and policyname='service_role_all_candidato_documentos'
  ) then
    create policy "service_role_all_candidato_documentos"
      on public.candidato_documentos
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_candidato_documentos_email on public.candidato_documentos(candidato_email);
create index if not exists idx_candidato_documentos_candidato_id on public.candidato_documentos(candidato_id);
create index if not exists idx_candidato_documentos_revision on public.candidato_documentos(estado_revision, fecha_carga desc);
