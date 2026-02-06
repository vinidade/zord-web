create table if not exists public.catalogo (
  sku text primary key,
  nome_derivacao text,
  codigo_pai text,
  id_derivacao bigint,
  url_imagem text,
  ativo boolean not null default true,
  preco numeric,
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalogo_nome on public.catalogo (nome_derivacao);

create or replace function public.set_catalogo_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_catalogo_updated_at on public.catalogo;
create trigger trg_catalogo_updated_at
before update on public.catalogo
for each row
execute function public.set_catalogo_updated_at();

alter table public.catalogo enable row level security;

create policy "catalogo_read" on public.catalogo
  for select using (auth.role() = 'authenticated');
