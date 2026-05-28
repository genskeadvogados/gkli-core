-- GKLI Core - corrige triggers do Intr para tabelas com coluna atualizado_em.
-- Execute em bases que receberam os scripts anteriores com core.set_updated_at().

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

drop trigger if exists trg_receitas_updated_at on gkli_intr.receitas;
create trigger trg_receitas_updated_at before update on gkli_intr.receitas for each row execute function core.set_atualizado_em();

drop trigger if exists trg_pagamento_agendas_updated_at on gkli_intr.pagamento_agendas;
create trigger trg_pagamento_agendas_updated_at before update on gkli_intr.pagamento_agendas for each row execute function core.set_atualizado_em();

drop trigger if exists trg_fechamentos_updated_at on gkli_intr.fechamentos;
create trigger trg_fechamentos_updated_at before update on gkli_intr.fechamentos for each row execute function core.set_atualizado_em();

drop trigger if exists trg_comissao_tipos_updated_at on gkli_intr.comissao_tipos;
create trigger trg_comissao_tipos_updated_at before update on gkli_intr.comissao_tipos for each row execute function core.set_atualizado_em();
