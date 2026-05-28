-- GKLI Core - Intr fechamentos mensais e fluxo de comissoes
-- Execute depois de 07_intr_receitas_comissoes.sql e 08_intr_agenda_pagamentos.sql.

create schema if not exists gkli_intr;
create extension if not exists pgcrypto;

do $$ begin
  create type gkli_intr.fechamento_status as enum ('aberto', 'em_conferencia', 'fechado', 'reaberto', 'cancelado');
exception when duplicate_object then null;
end $$;

create table if not exists gkli_intr.fechamentos (
  id uuid default gen_random_uuid() not null,
  competencia date not null,
  competencia_label text,
  status gkli_intr.fechamento_status default 'aberto'::gkli_intr.fechamento_status not null,
  receita_total numeric(14,2) default 0 not null,
  comissao_total numeric(14,2) default 0 not null,
  pagamentos_previstos_total numeric(14,2) default 0 not null,
  pagamentos_pagos_total numeric(14,2) default 0 not null,
  saldo_operacional numeric(14,2) default 0 not null,
  pendencias_total integer default 0 not null,
  observacao text,
  fechado_em timestamp with time zone,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint fechamentos_pkey primary key (id),
  constraint fechamentos_competencia_key unique (competencia),
  constraint fechamentos_pendencias_check check (pendencias_total >= 0)
);

alter table gkli_intr.comissoes
  add column if not exists fechamento_id uuid;

alter table gkli_intr.pagamentos
  add column if not exists fechamento_id uuid;

do $$ begin
  alter table gkli_intr.comissoes
    add constraint comissoes_fechamento_id_fkey foreign key (fechamento_id) references gkli_intr.fechamentos(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table gkli_intr.pagamentos
    add constraint pagamentos_fechamento_id_fkey foreign key (fechamento_id) references gkli_intr.fechamentos(id) on delete set null;
exception when duplicate_object then null;
end $$;

drop trigger if exists trg_fechamentos_updated_at on gkli_intr.fechamentos;
create trigger trg_fechamentos_updated_at before update on gkli_intr.fechamentos for each row execute function core.set_atualizado_em();

create index if not exists fechamentos_competencia_idx on gkli_intr.fechamentos using btree (competencia desc);
create index if not exists fechamentos_status_idx on gkli_intr.fechamentos using btree (status);
create index if not exists comissoes_fechamento_id_idx on gkli_intr.comissoes using btree (fechamento_id);
create index if not exists pagamentos_fechamento_id_idx on gkli_intr.pagamentos using btree (fechamento_id);
create unique index if not exists pagamentos_comissao_uidx
  on gkli_intr.pagamentos (comissao_id)
  where comissao_id is not null;

drop view if exists public.gkli_intr_fechamentos_resumo cascade;
drop view if exists public.gkli_intr_comissoes_resumo cascade;
drop view if exists public.gkli_intr_pagamentos_resumo cascade;

create view public.gkli_intr_fechamentos_resumo
with (security_invoker = true) as
select
  f.id,
  f.competencia,
  coalesce(f.competencia_label, to_char(f.competencia, 'MM/YYYY')) as competencia_label,
  f.status,
  f.receita_total,
  f.comissao_total,
  f.pagamentos_previstos_total,
  f.pagamentos_pagos_total,
  f.saldo_operacional,
  f.pendencias_total,
  f.observacao,
  f.fechado_em,
  f.criado_em,
  f.atualizado_em
from gkli_intr.fechamentos f;

create view public.gkli_intr_comissoes_resumo
with (security_invoker = true) as
select
  cm.id,
  cm.receita_id,
  cm.fechamento_id,
  f.competencia_label as fechamento_competencia_label,
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
left join gkli_intr.receitas r on r.id = cm.receita_id
left join gkli_intr.fechamentos f on f.id = cm.fechamento_id;

create view public.gkli_intr_pagamentos_resumo
with (security_invoker = true) as
select
  p.id,
  p.colaborador_id,
  c.nome as colaborador_nome,
  t.nome as time_nome,
  p.tipo,
  p.pagamento_tipo_id,
  p.pagamento_tipo_codigo,
  p.pagamento_tipo_nome,
  p.pagamento_tipo_categoria,
  p.descricao,
  p.competencia,
  p.data_prevista,
  p.data_pagamento,
  p.valor_bruto,
  p.valor_descontos,
  p.valor_liquido,
  p.status,
  p.comissao_id,
  p.agenda_id,
  p.fechamento_id,
  f.competencia_label as fechamento_competencia_label,
  a.tipo as agenda_tipo,
  cm.cliente as comissao_cliente,
  coalesce(cm.categoria_snapshot, cm.categoria) as comissao_categoria,
  p.origem,
  p.origem_id,
  p.observacao,
  p.criado_em,
  p.atualizado_em
from gkli_intr.pagamentos p
join gkli_intr.colaboradores c on c.id = p.colaborador_id
left join gkli_intr.times t on t.id = c.time_id
left join gkli_intr.comissoes cm on cm.id = p.comissao_id
left join gkli_intr.pagamento_agendas a on a.id = p.agenda_id
left join gkli_intr.fechamentos f on f.id = p.fechamento_id;

alter table gkli_intr.fechamentos enable row level security;

drop policy if exists intr_service_fechamentos on gkli_intr.fechamentos;
create policy intr_service_fechamentos on gkli_intr.fechamentos for all to service_role using (true) with check (true);

drop policy if exists intr_authenticated_read_fechamentos on gkli_intr.fechamentos;
create policy intr_authenticated_read_fechamentos on gkli_intr.fechamentos for select to authenticated using (true);

grant usage on schema gkli_intr to authenticated, service_role;
grant select on all tables in schema gkli_intr to authenticated, service_role;
grant insert, update, delete on all tables in schema gkli_intr to service_role;
grant select on public.gkli_intr_fechamentos_resumo to authenticated, service_role;
grant select on public.gkli_intr_comissoes_resumo to authenticated, service_role;
grant select on public.gkli_intr_pagamentos_resumo to authenticated, service_role;
