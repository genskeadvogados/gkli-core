-- GKLI Core - adiciona percentual e tipo padronizado para agenda de pagamentos.
-- Execute depois do sql/14_fix_intr_atualizado_em_triggers.sql em bases existentes.

alter table gkli_intr.pagamento_agendas
  add column if not exists percentual numeric(8,4) default 0 not null;

do $$ begin
  alter table gkli_intr.pagamento_agendas
    add constraint pagamento_agendas_percentual_check check (percentual >= 0 and percentual <= 100);
exception when duplicate_object then null;
end $$;

drop view if exists public.gkli_intr_pagamento_agendas_resumo cascade;

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

grant select on public.gkli_intr_pagamento_agendas_resumo to authenticated, service_role;
