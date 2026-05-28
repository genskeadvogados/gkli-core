-- GKLI Core - Intr receitas e calculo de comissoes
-- Execute depois do P1 Intr/Colab.

create schema if not exists gkli_intr;
create extension if not exists pgcrypto;

do $$ begin
  create type gkli_intr.receita_status as enum ('prevista', 'recebida', 'conciliada', 'cancelada');
exception when duplicate_object then null;
end $$;

create table if not exists gkli_intr.receitas (
  id uuid default gen_random_uuid() not null,
  colaborador_id uuid,
  vendedor_nome text,
  cliente text not null,
  categoria text,
  descricao text,
  competencia date not null,
  data_recebimento date,
  valor_base numeric(14,2) default 0 not null,
  valor_recebido numeric(14,2) default 0 not null,
  status gkli_intr.receita_status default 'recebida'::gkli_intr.receita_status not null,
  origem text,
  origem_id uuid,
  observacao text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint receitas_pkey primary key (id),
  constraint receitas_cliente_len check (char_length(trim(cliente)) >= 2),
  constraint receitas_valores_check check (valor_base >= 0 and valor_recebido >= 0)
);

do $$ begin
  alter table gkli_intr.receitas
    add constraint receitas_colaborador_id_fkey foreign key (colaborador_id) references gkli_intr.colaboradores(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table gkli_intr.comissoes
    add constraint comissoes_receita_id_fkey foreign key (receita_id) references gkli_intr.receitas(id) on delete set null;
exception when duplicate_object then null;
end $$;

drop trigger if exists trg_receitas_updated_at on gkli_intr.receitas;
create trigger trg_receitas_updated_at before update on gkli_intr.receitas for each row execute function core.set_atualizado_em();

create index if not exists receitas_colaborador_id_idx on gkli_intr.receitas using btree (colaborador_id);
create index if not exists receitas_competencia_idx on gkli_intr.receitas using btree (competencia desc);
create index if not exists receitas_status_idx on gkli_intr.receitas using btree (status);
create index if not exists receitas_categoria_idx on gkli_intr.receitas using btree (categoria);
create index if not exists comissoes_receita_id_idx on gkli_intr.comissoes using btree (receita_id);

drop view if exists public.gkli_intr_cockpit_alertas cascade;
drop view if exists public.gkli_intr_cockpit_fluxo_mensal cascade;
drop view if exists public.gkli_intr_cockpit_ranking_vendedores cascade;
drop view if exists public.gkli_intr_cockpit_receitas_categoria cascade;
drop view if exists public.gkli_intr_receitas_resumo cascade;
drop view if exists public.gkli_intr_comissoes_resumo cascade;

create view public.gkli_intr_receitas_resumo
with (security_invoker = true) as
select
  r.id,
  r.colaborador_id,
  c.nome as colaborador_nome,
  t.nome as time_nome,
  coalesce(r.vendedor_nome, c.nome) as vendedor_nome,
  r.cliente,
  r.categoria,
  r.descricao,
  r.competencia,
  r.data_recebimento,
  r.valor_base,
  r.valor_recebido,
  r.status,
  r.origem,
  r.origem_id,
  r.observacao,
  r.criado_em,
  r.atualizado_em
from gkli_intr.receitas r
left join gkli_intr.colaboradores c on c.id = r.colaborador_id
left join gkli_intr.times t on t.id = c.time_id;

create view public.gkli_intr_comissoes_resumo
with (security_invoker = true) as
select
  cm.id,
  cm.receita_id,
  cm.colaborador_id,
  c.nome as colaborador_nome,
  t.nome as time_nome,
  cm.comissao_tipo_id,
  cm.receita_categoria_id,
  coalesce(cm.vendedor_snapshot, cm.vendedor_nome, r.vendedor_nome) as vendedor_snapshot,
  coalesce(cm.vendedor_nome, cm.vendedor_snapshot, r.vendedor_nome) as vendedor_nome,
  coalesce(cm.cliente, r.cliente) as cliente,
  coalesce(cm.categoria_snapshot, cm.categoria, r.categoria) as categoria_snapshot,
  coalesce(cm.categoria, cm.categoria_snapshot, r.categoria) as categoria,
  coalesce(cm.tipo_comissao_snapshot, cm.tipo_comissao_nome) as tipo_comissao_snapshot,
  coalesce(cm.tipo_comissao_nome, cm.tipo_comissao_snapshot) as tipo_comissao_nome,
  cm.percentual,
  cm.valor_base,
  cm.valor_comissao,
  cm.competencia,
  cm.data_recebimento,
  cm.status,
  cm.observacao,
  cm.origem,
  cm.origem_id,
  cm.aprovado_em,
  cm.pago_em,
  cm.criado_em,
  cm.atualizado_em
from gkli_intr.comissoes cm
join gkli_intr.colaboradores c on c.id = cm.colaborador_id
left join gkli_intr.times t on t.id = c.time_id
left join gkli_intr.receitas r on r.id = cm.receita_id;

create view public.gkli_intr_cockpit_receitas_categoria
with (security_invoker = true) as
select
  coalesce(categoria, 'Sem categoria') as categoria,
  coalesce(categoria, 'Sem categoria') as descricao,
  count(*) as quantidade,
  sum(valor_recebido) as valor_total
from gkli_intr.receitas
where status <> 'cancelada'
group by coalesce(categoria, 'Sem categoria')
order by sum(valor_recebido) desc;

create view public.gkli_intr_cockpit_ranking_vendedores
with (security_invoker = true) as
select
  coalesce(vendedor_nome, colaborador_nome, 'Sem vendedor') as vendedor_nome,
  coalesce(time_nome, 'Sem time') as time_nome,
  count(*) as quantidade,
  sum(valor_recebido) as valor_total
from public.gkli_intr_receitas_resumo
where status <> 'cancelada'
group by coalesce(vendedor_nome, colaborador_nome, 'Sem vendedor'), coalesce(time_nome, 'Sem time')
order by sum(valor_recebido) desc;

create view public.gkli_intr_cockpit_fluxo_mensal
with (security_invoker = true) as
select
  date_trunc('month', competencia)::date as competencia,
  sum(valor_recebido) as receita_total,
  count(*) as total_receitas
from gkli_intr.receitas
where status <> 'cancelada'
group by date_trunc('month', competencia)::date
order by date_trunc('month', competencia)::date desc;

create view public.gkli_intr_cockpit_alertas
with (security_invoker = true) as
select
  'comissoes_conferencia' as tipo,
  'Comissoes em conferencia' as titulo,
  'Comissoes calculadas que ainda nao foram aprovadas.' as descricao,
  count(*) as quantidade
from gkli_intr.comissoes
where status in ('calculada', 'em_conferencia')
union all
select
  'receitas_previstas' as tipo,
  'Receitas previstas' as titulo,
  'Receitas ainda sem recebimento conciliado.' as descricao,
  count(*) as quantidade
from gkli_intr.receitas
where status = 'prevista';

alter table gkli_intr.receitas enable row level security;

drop policy if exists intr_service_receitas on gkli_intr.receitas;
create policy intr_service_receitas on gkli_intr.receitas for all to service_role using (true) with check (true);

drop policy if exists intr_authenticated_read_receitas on gkli_intr.receitas;
create policy intr_authenticated_read_receitas on gkli_intr.receitas for select to authenticated using (true);

grant usage on schema gkli_intr to authenticated, service_role;
grant select on all tables in schema gkli_intr to authenticated, service_role;
grant insert, update, delete on all tables in schema gkli_intr to service_role;
grant select on public.gkli_intr_receitas_resumo to authenticated, service_role;
grant select on public.gkli_intr_comissoes_resumo to authenticated, service_role;
grant select on public.gkli_intr_cockpit_receitas_categoria to authenticated, service_role;
grant select on public.gkli_intr_cockpit_ranking_vendedores to authenticated, service_role;
grant select on public.gkli_intr_cockpit_fluxo_mensal to authenticated, service_role;
grant select on public.gkli_intr_cockpit_alertas to authenticated, service_role;
