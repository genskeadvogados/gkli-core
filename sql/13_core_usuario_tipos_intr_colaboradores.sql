-- GKLI Core - tipos de usuario e vinculo de colaboradores Intr

create table if not exists core.usuario_tipos (
  id uuid default gen_random_uuid() not null,
  codigo text not null,
  nome text not null,
  descricao text,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint usuario_tipos_pkey primary key (id),
  constraint usuario_tipos_codigo_key unique (codigo),
  constraint usuario_tipos_codigo_check check (codigo ~ '^[a-z0-9_]+$'::text)
);

insert into core.usuario_tipos (codigo, nome, descricao, ativo)
values
  ('colaborador', 'Colaborador', 'Pessoa interna vinculada a rotinas operacionais e financeiras.', true),
  ('cliente', 'Cliente', 'Pessoa ou empresa atendida pela GKLI.', true),
  ('prestador', 'Prestador', 'Parceiro ou fornecedor externo com acesso controlado.', true),
  ('outros', 'Outros', 'Tipo complementar para usuarios sem classificacao operacional.', true)
on conflict (codigo) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ativo = excluded.ativo,
  atualizado_em = now();

alter table security.usuarios
  add column if not exists tipo_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_tipo_id_fkey'
      and conrelid = 'security.usuarios'::regclass
  ) then
    alter table security.usuarios
      add constraint usuarios_tipo_id_fkey foreign key (tipo_id) references core.usuario_tipos(id) on delete set null;
  end if;
end $$;

update security.usuarios u
set tipo_id = ut.id
from core.usuario_tipos ut
where ut.codigo = 'outros'
  and u.tipo_id is null;

alter table gkli_intr.colaboradores
  add column if not exists usuario_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'colaboradores_usuario_id_fkey'
      and conrelid = 'gkli_intr.colaboradores'::regclass
  ) then
    alter table gkli_intr.colaboradores
      add constraint colaboradores_usuario_id_fkey foreign key (usuario_id) references security.usuarios(id) on delete set null;
  end if;
end $$;

create unique index if not exists colaboradores_usuario_id_uidx
  on gkli_intr.colaboradores using btree (usuario_id)
  where usuario_id is not null;

create index if not exists usuarios_tipo_id_idx on security.usuarios using btree (tipo_id);
create index if not exists usuario_tipos_ativo_idx on core.usuario_tipos using btree (ativo);
create index if not exists colaboradores_usuario_id_idx on gkli_intr.colaboradores using btree (usuario_id);

create or replace function core.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_usuario_tipos_updated_at on core.usuario_tipos;
create trigger trg_usuario_tipos_updated_at before update on core.usuario_tipos for each row execute function core.set_atualizado_em();

create or replace function security.is_admin_global()
returns boolean
language sql
security definer
set search_path = security, public
stable
as $$
  select exists (
    select 1
    from security.usuarios u
    where u.id = auth.uid()
      and u.status = 'ativo'
      and u.tipo = 'admin_global'
  )
  or exists (
    select 1
    from security.usuario_perfis up
    join security.perfis p on p.id = up.perfil_id
    join security.usuarios u on u.id = up.usuario_id
    where up.usuario_id = auth.uid()
      and up.ativo = true
      and p.codigo = 'admin_global'
      and p.status = 'ativo'
      and u.status = 'ativo'
  );
$$;

create or replace view security.v_usuarios_admin as
select
  u.id,
  u.nome,
  u.email,
  u.tipo,
  u.status,
  u.avatar_url,
  u.ultimo_login_em,
  u.created_at,
  u.updated_at,
  coalesce(jsonb_agg(distinct jsonb_build_object('carteira_id', c.id, 'carteira_nome', c.nome, 'principal', uc.principal, 'ativo', uc.ativo)) filter (where c.id is not null), '[]'::jsonb) as carteiras,
  coalesce(jsonb_agg(distinct jsonb_build_object('app_id', a.id, 'app_codigo', a.codigo, 'app_nome', a.nome, 'ativo', uaa.ativo)) filter (where a.id is not null), '[]'::jsonb) as apps,
  u.tipo_id,
  ut.codigo as tipo_codigo,
  ut.nome as tipo_nome
from security.usuarios u
left join core.usuario_tipos ut on ut.id = u.tipo_id
left join security.usuario_carteiras uc on uc.usuario_id = u.id
left join core.carteiras c on c.id = uc.carteira_id
left join security.usuario_app_acessos uaa on uaa.usuario_id = u.id
left join core.apps a on a.id = uaa.app_id
group by u.id, ut.id;

create or replace view public.gkli_intr_colaboradores_resumo
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
  (c.salario + c.pro_labore + c.ajuda_custo + c.participacao_honorarios + c.outros_vencimentos) as total_vencimentos,
  c.beneficio_descricao,
  c.beneficio_valor,
  (
    c.salario + c.pro_labore + c.ajuda_custo + c.participacao_honorarios + c.outros_vencimentos + c.beneficio_valor
  ) as custo_mensal_estimado,
  c.criado_em,
  c.atualizado_em,
  c.usuario_id
from gkli_intr.colaboradores c
left join gkli_intr.times t on t.id = c.time_id
left join gkli_intr.colaboradores g on g.id = c.gestor_id;

grant select on core.usuario_tipos to authenticated, service_role;
grant insert, update, delete on core.usuario_tipos to service_role;
grant select on public.gkli_intr_colaboradores_resumo to authenticated, service_role;
