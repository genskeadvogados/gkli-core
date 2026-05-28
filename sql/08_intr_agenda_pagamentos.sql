-- GKLI Core - Intr agenda de pagamentos
-- Execute depois do P1 Intr/Colab.

create schema if not exists gkli_intr;
create extension if not exists pgcrypto;

create table if not exists gkli_intr.pagamento_agendas (
  id uuid default gen_random_uuid() not null,
  colaborador_id uuid not null,
  tipo text not null,
  descricao text,
  dia_previsto integer not null,
  percentual numeric(8,4) default 0 not null,
  valor_bruto numeric(14,2) default 0 not null,
  valor_descontos numeric(14,2) default 0 not null,
  valor_liquido numeric(14,2) generated always as (greatest(valor_bruto - valor_descontos, 0)) stored,
  inicio_competencia date not null,
  fim_competencia date,
  ativo boolean default true not null,
  origem text,
  observacao text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint pagamento_agendas_pkey primary key (id),
  constraint pagamento_agendas_dia_check check (dia_previsto between 1 and 31),
  constraint pagamento_agendas_percentual_check check (percentual >= 0 and percentual <= 100),
  constraint pagamento_agendas_valores_check check (valor_bruto >= 0 and valor_descontos >= 0),
  constraint pagamento_agendas_vigencia_check check (fim_competencia is null or fim_competencia >= inicio_competencia)
);

alter table gkli_intr.pagamento_agendas
  add column if not exists percentual numeric(8,4) default 0 not null;

do $$ begin
  alter table gkli_intr.pagamento_agendas
    add constraint pagamento_agendas_percentual_check check (percentual >= 0 and percentual <= 100);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table gkli_intr.pagamento_agendas
    add constraint pagamento_agendas_colaborador_id_fkey foreign key (colaborador_id) references gkli_intr.colaboradores(id) on delete cascade;
exception when duplicate_object then null;
end $$;

alter table gkli_intr.pagamentos
  add column if not exists agenda_id uuid;

do $$ begin
  alter table gkli_intr.pagamentos
    add constraint pagamentos_agenda_id_fkey foreign key (agenda_id) references gkli_intr.pagamento_agendas(id) on delete set null;
exception when duplicate_object then null;
end $$;

create unique index if not exists pagamentos_agenda_competencia_uidx
  on gkli_intr.pagamentos (agenda_id, competencia)
  where agenda_id is not null;

drop trigger if exists trg_pagamento_agendas_updated_at on gkli_intr.pagamento_agendas;
create trigger trg_pagamento_agendas_updated_at before update on gkli_intr.pagamento_agendas for each row execute function core.set_atualizado_em();

create index if not exists pagamento_agendas_colaborador_id_idx on gkli_intr.pagamento_agendas using btree (colaborador_id);
create index if not exists pagamento_agendas_ativo_idx on gkli_intr.pagamento_agendas using btree (ativo);
create index if not exists pagamento_agendas_vigencia_idx on gkli_intr.pagamento_agendas using btree (inicio_competencia, fim_competencia);
create index if not exists pagamentos_agenda_id_idx on gkli_intr.pagamentos using btree (agenda_id);

drop view if exists public.gkli_intr_pagamento_agendas_resumo cascade;
drop view if exists public.gkli_intr_pagamentos_resumo cascade;

create view public.gkli_intr_pagamento_agendas_resumo
with (security_invoker = true) as
select
  a.id,
  a.colaborador_id,
  c.nome as colaborador_nome,
  t.nome as time_nome,
  a.tipo,
  a.descricao,
  a.dia_previsto,
  a.percentual,
  a.valor_bruto,
  a.valor_descontos,
  a.valor_liquido,
  a.inicio_competencia,
  a.fim_competencia,
  a.ativo,
  a.origem,
  a.observacao,
  a.criado_em,
  a.atualizado_em
from gkli_intr.pagamento_agendas a
join gkli_intr.colaboradores c on c.id = a.colaborador_id
left join gkli_intr.times t on t.id = c.time_id;

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
left join gkli_intr.pagamento_agendas a on a.id = p.agenda_id;

alter table gkli_intr.pagamento_agendas enable row level security;

drop policy if exists intr_service_pagamento_agendas on gkli_intr.pagamento_agendas;
create policy intr_service_pagamento_agendas on gkli_intr.pagamento_agendas for all to service_role using (true) with check (true);

drop policy if exists intr_authenticated_read_pagamento_agendas on gkli_intr.pagamento_agendas;
create policy intr_authenticated_read_pagamento_agendas on gkli_intr.pagamento_agendas for select to authenticated using (true);

grant usage on schema gkli_intr to authenticated, service_role;
grant select on all tables in schema gkli_intr to authenticated, service_role;
grant insert, update, delete on all tables in schema gkli_intr to service_role;
grant select on public.gkli_intr_pagamento_agendas_resumo to authenticated, service_role;
grant select on public.gkli_intr_pagamentos_resumo to authenticated, service_role;
