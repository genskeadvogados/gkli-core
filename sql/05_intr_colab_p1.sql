-- GKLI Core - P1 Intr/Colab
-- Estrutura minima do Intr na base unica para alimentar o GKLI-Colab.
-- Execute depois do bootstrap do Core.

create schema if not exists gkli_intr;
create extension if not exists pgcrypto;

do $$ begin
  create type gkli_intr.colaborador_status as enum ('ativo', 'afastado', 'desligado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type gkli_intr.pagamento_status as enum ('previsto', 'em_processamento', 'pago', 'cancelado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type gkli_intr.comissao_status as enum ('calculada', 'em_conferencia', 'aprovada', 'rejeitada', 'paga', 'cancelada');
exception when duplicate_object then null;
end $$;

create table if not exists gkli_intr.times (
  id uuid default gen_random_uuid() not null,
  nome text not null,
  descricao text,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint times_pkey primary key (id),
  constraint times_nome_key unique (nome)
);

create table if not exists gkli_intr.colaboradores (
  id uuid default gen_random_uuid() not null,
  nome text not null,
  cpf_cnpj text,
  email text not null,
  telefone text,
  status gkli_intr.colaborador_status default 'ativo'::gkli_intr.colaborador_status not null,
  time_id uuid,
  cargo text,
  gestor_id uuid,
  salario numeric(14,2) default 0 not null,
  pro_labore numeric(14,2) default 0 not null,
  ajuda_custo numeric(14,2) default 0 not null,
  participacao_honorarios numeric(14,2) default 0 not null,
  outros_vencimentos numeric(14,2) default 0 not null,
  beneficio_descricao text,
  beneficio_valor numeric(14,2) default 0 not null,
  observacoes text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint colaboradores_pkey primary key (id),
  constraint colaboradores_email_key unique (email),
  constraint colaboradores_nome_len check (char_length(trim(nome)) >= 3),
  constraint colaboradores_valores_check check (
    salario >= 0
    and pro_labore >= 0
    and ajuda_custo >= 0
    and participacao_honorarios >= 0
    and outros_vencimentos >= 0
    and beneficio_valor >= 0
  )
);

create table if not exists gkli_intr.comissoes (
  id uuid default gen_random_uuid() not null,
  colaborador_id uuid not null,
  receita_id uuid,
  comissao_tipo_id uuid,
  receita_categoria_id uuid,
  vendedor_nome text,
  vendedor_snapshot text,
  cliente text,
  categoria text,
  categoria_snapshot text,
  tipo_comissao_nome text,
  tipo_comissao_snapshot text,
  percentual numeric(8,4) default 0 not null,
  valor_base numeric(14,2) default 0 not null,
  valor_comissao numeric(14,2) default 0 not null,
  competencia date,
  data_recebimento date,
  status gkli_intr.comissao_status default 'calculada'::gkli_intr.comissao_status not null,
  observacao text,
  origem text,
  origem_id uuid,
  aprovado_em timestamp with time zone,
  pago_em timestamp with time zone,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint comissoes_pkey primary key (id),
  constraint comissoes_valores_check check (
    percentual >= 0
    and percentual <= 100
    and valor_base >= 0
    and valor_comissao >= 0
  )
);

create table if not exists gkli_intr.pagamentos (
  id uuid default gen_random_uuid() not null,
  colaborador_id uuid not null,
  tipo text,
  pagamento_tipo_id uuid,
  pagamento_tipo_codigo text,
  pagamento_tipo_nome text,
  pagamento_tipo_categoria text,
  descricao text,
  competencia date not null,
  data_prevista date,
  data_pagamento date,
  valor_bruto numeric(14,2) default 0 not null,
  valor_descontos numeric(14,2) default 0 not null,
  valor_liquido numeric(14,2) generated always as (greatest(valor_bruto - valor_descontos, 0)) stored,
  status gkli_intr.pagamento_status default 'previsto'::gkli_intr.pagamento_status not null,
  comissao_id uuid,
  origem text,
  origem_id uuid,
  observacao text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint pagamentos_pkey primary key (id),
  constraint pagamentos_valores_check check (valor_bruto >= 0 and valor_descontos >= 0)
);

do $$ begin
  alter table gkli_intr.colaboradores
    add constraint colaboradores_time_id_fkey foreign key (time_id) references gkli_intr.times(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table gkli_intr.colaboradores
    add constraint colaboradores_gestor_id_fkey foreign key (gestor_id) references gkli_intr.colaboradores(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table gkli_intr.comissoes
    add constraint comissoes_colaborador_id_fkey foreign key (colaborador_id) references gkli_intr.colaboradores(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table gkli_intr.pagamentos
    add constraint pagamentos_colaborador_id_fkey foreign key (colaborador_id) references gkli_intr.colaboradores(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table gkli_intr.pagamentos
    add constraint pagamentos_comissao_id_fkey foreign key (comissao_id) references gkli_intr.comissoes(id) on delete set null;
exception when duplicate_object then null;
end $$;

create or replace function core.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_times_updated_at on gkli_intr.times;
create trigger trg_times_updated_at before update on gkli_intr.times for each row execute function core.set_atualizado_em();

drop trigger if exists trg_colaboradores_updated_at on gkli_intr.colaboradores;
create trigger trg_colaboradores_updated_at before update on gkli_intr.colaboradores for each row execute function core.set_atualizado_em();

drop trigger if exists trg_comissoes_updated_at on gkli_intr.comissoes;
create trigger trg_comissoes_updated_at before update on gkli_intr.comissoes for each row execute function core.set_atualizado_em();

drop trigger if exists trg_pagamentos_updated_at on gkli_intr.pagamentos;
create trigger trg_pagamentos_updated_at before update on gkli_intr.pagamentos for each row execute function core.set_atualizado_em();

create index if not exists colaboradores_email_idx on gkli_intr.colaboradores using btree (email);
create index if not exists colaboradores_status_idx on gkli_intr.colaboradores using btree (status);
create index if not exists colaboradores_time_id_idx on gkli_intr.colaboradores using btree (time_id);
create index if not exists comissoes_colaborador_id_idx on gkli_intr.comissoes using btree (colaborador_id);
create index if not exists comissoes_competencia_idx on gkli_intr.comissoes using btree (competencia desc);
create index if not exists comissoes_status_idx on gkli_intr.comissoes using btree (status);
create index if not exists pagamentos_colaborador_id_idx on gkli_intr.pagamentos using btree (colaborador_id);
create index if not exists pagamentos_competencia_idx on gkli_intr.pagamentos using btree (competencia desc);
create index if not exists pagamentos_status_idx on gkli_intr.pagamentos using btree (status);

drop view if exists public.gkli_intr_colaborador_detalhe cascade;
drop view if exists public.gkli_intr_colaboradores_resumo cascade;
drop view if exists public.gkli_intr_pagamentos_resumo cascade;
drop view if exists public.gkli_intr_comissoes_resumo cascade;

create view public.gkli_intr_colaboradores_resumo
with (security_invoker = true) as
select
  c.id,
  c.nome,
  c.cpf_cnpj,
  c.email,
  c.telefone,
  c.status,
  c.time_id,
  t.nome as time_nome,
  c.cargo,
  c.gestor_id,
  g.nome as gestor_nome,
  c.salario,
  c.pro_labore,
  c.ajuda_custo,
  c.participacao_honorarios,
  c.outros_vencimentos,
  (
    c.salario + c.pro_labore + c.ajuda_custo + c.participacao_honorarios + c.outros_vencimentos
  ) as total_vencimentos,
  c.beneficio_descricao,
  c.beneficio_valor,
  (
    c.salario + c.pro_labore + c.ajuda_custo + c.participacao_honorarios + c.outros_vencimentos + c.beneficio_valor
  ) as custo_mensal_estimado,
  c.criado_em,
  c.atualizado_em
from gkli_intr.colaboradores c
left join gkli_intr.times t on t.id = c.time_id
left join gkli_intr.colaboradores g on g.id = c.gestor_id;

create view public.gkli_intr_colaborador_detalhe
with (security_invoker = true) as
select *
from public.gkli_intr_colaboradores_resumo;

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
  coalesce(cm.vendedor_snapshot, cm.vendedor_nome) as vendedor_snapshot,
  coalesce(cm.vendedor_nome, cm.vendedor_snapshot) as vendedor_nome,
  cm.cliente,
  coalesce(cm.categoria_snapshot, cm.categoria) as categoria_snapshot,
  coalesce(cm.categoria, cm.categoria_snapshot) as categoria,
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
left join gkli_intr.comissoes cm on cm.id = p.comissao_id;

alter table gkli_intr.times enable row level security;
alter table gkli_intr.colaboradores enable row level security;
alter table gkli_intr.comissoes enable row level security;
alter table gkli_intr.pagamentos enable row level security;

drop policy if exists intr_service_times on gkli_intr.times;
create policy intr_service_times on gkli_intr.times for all to service_role using (true) with check (true);

drop policy if exists intr_service_colaboradores on gkli_intr.colaboradores;
create policy intr_service_colaboradores on gkli_intr.colaboradores for all to service_role using (true) with check (true);

drop policy if exists intr_service_comissoes on gkli_intr.comissoes;
create policy intr_service_comissoes on gkli_intr.comissoes for all to service_role using (true) with check (true);

drop policy if exists intr_service_pagamentos on gkli_intr.pagamentos;
create policy intr_service_pagamentos on gkli_intr.pagamentos for all to service_role using (true) with check (true);

-- Leitura do portal: o app filtra por e-mail/colaborador autenticado no servidor.
drop policy if exists intr_authenticated_read_times on gkli_intr.times;
create policy intr_authenticated_read_times on gkli_intr.times for select to authenticated using (true);

drop policy if exists intr_authenticated_read_colaboradores on gkli_intr.colaboradores;
create policy intr_authenticated_read_colaboradores on gkli_intr.colaboradores for select to authenticated using (true);

drop policy if exists intr_authenticated_read_comissoes on gkli_intr.comissoes;
create policy intr_authenticated_read_comissoes on gkli_intr.comissoes for select to authenticated using (true);

drop policy if exists intr_authenticated_read_pagamentos on gkli_intr.pagamentos;
create policy intr_authenticated_read_pagamentos on gkli_intr.pagamentos for select to authenticated using (true);

grant usage on schema gkli_intr to authenticated, service_role;
grant select on all tables in schema gkli_intr to authenticated, service_role;
grant insert, update, delete on all tables in schema gkli_intr to service_role;
grant select on public.gkli_intr_colaboradores_resumo to authenticated, service_role;
grant select on public.gkli_intr_colaborador_detalhe to authenticated, service_role;
grant select on public.gkli_intr_comissoes_resumo to authenticated, service_role;
grant select on public.gkli_intr_pagamentos_resumo to authenticated, service_role;
