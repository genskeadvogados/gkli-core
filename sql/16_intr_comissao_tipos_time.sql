-- GKLI Core - Intr flag de comissao de time
-- Execute depois de 12_intr_tipos_comissao.sql.

alter table gkli_intr.comissao_tipos
  add column if not exists comissao_de_time boolean default false not null;

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

grant select on public.gkli_intr_comissao_tipos_resumo to authenticated, service_role;
