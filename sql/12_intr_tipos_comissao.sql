-- GKLI Core - Intr tipos de comissao
-- Execute depois de 07_intr_receitas_comissoes.sql.

create schema if not exists gkli_intr;
create extension if not exists pgcrypto;

create table if not exists gkli_intr.comissao_tipos (
  id uuid default gen_random_uuid() not null,
  nome text not null,
  categoria text,
  percentual numeric(8,4) default 0 not null,
  comissao_de_time boolean default false not null,
  ativo boolean default true not null,
  observacao text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint comissao_tipos_pkey primary key (id),
  constraint comissao_tipos_nome_key unique (nome),
  constraint comissao_tipos_percentual_check check (percentual >= 0 and percentual <= 100)
);

do $$ begin
  alter table gkli_intr.comissoes
    add constraint comissoes_comissao_tipo_id_fkey foreign key (comissao_tipo_id) references gkli_intr.comissao_tipos(id) on delete set null;
exception when duplicate_object then null;
end $$;

drop trigger if exists trg_comissao_tipos_updated_at on gkli_intr.comissao_tipos;
create trigger trg_comissao_tipos_updated_at before update on gkli_intr.comissao_tipos for each row execute function core.set_atualizado_em();

create index if not exists comissao_tipos_categoria_idx on gkli_intr.comissao_tipos using btree (categoria);
create index if not exists comissao_tipos_ativo_idx on gkli_intr.comissao_tipos using btree (ativo);

drop view if exists public.gkli_intr_comissao_tipos_resumo;
create view public.gkli_intr_comissao_tipos_resumo
with (security_invoker = true) as
select
  id,
  nome,
  categoria,
  percentual,
  comissao_de_time,
  ativo,
  observacao,
  criado_em,
  atualizado_em
from gkli_intr.comissao_tipos
order by nome;

drop view if exists public.gkli_intr_receita_categorias_resumo;
create view public.gkli_intr_receita_categorias_resumo
with (security_invoker = true) as
select
  md5(coalesce(categoria, 'Sem categoria'))::text as id,
  coalesce(categoria, 'Sem categoria') as nome,
  coalesce(categoria, 'Sem categoria') as categoria,
  count(*) as total_receitas,
  sum(valor_recebido) as valor_recebido_total
from gkli_intr.receitas
group by coalesce(categoria, 'Sem categoria')
order by coalesce(categoria, 'Sem categoria');

alter table gkli_intr.comissao_tipos enable row level security;

drop policy if exists intr_service_comissao_tipos on gkli_intr.comissao_tipos;
create policy intr_service_comissao_tipos on gkli_intr.comissao_tipos for all to service_role using (true) with check (true);

drop policy if exists intr_authenticated_read_comissao_tipos on gkli_intr.comissao_tipos;
create policy intr_authenticated_read_comissao_tipos on gkli_intr.comissao_tipos for select to authenticated using (true);

grant usage on schema gkli_intr to authenticated, service_role;
grant select on gkli_intr.comissao_tipos to authenticated, service_role;
grant insert, update, delete on gkli_intr.comissao_tipos to service_role;
grant select on public.gkli_intr_comissao_tipos_resumo to authenticated, service_role;
grant select on public.gkli_intr_receita_categorias_resumo to authenticated, service_role;
