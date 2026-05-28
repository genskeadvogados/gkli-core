import Link from 'next/link'
import type { ReactNode } from 'react'
import { ColaboradorCoreFields } from '@/features/intr/colaborador-core-fields'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type {
  IntrColaborador,
  IntrColaboradorRecord,
  IntrComissaoTipoRecord,
  IntrComissaoRecord,
  IntrData,
  IntrFechamentoRecord,
  IntrFormData,
  IntrListRow,
  IntrPagamentoAgendaRecord,
  IntrPagamentoRecord,
  IntrReceitaRecord,
  IntrTimeRecord,
} from '@/features/intr/types'
import type { PlatformUsuario } from '@/lib/auth/platform'

type IntrTab =
  | 'cockpit'
  | 'colaboradores'
  | 'times'
  | 'reembolsos'
  | 'documentos'
  | 'comunicados'
  | 'pagamentos'
  | 'comissoes'
  | 'tiposComissao'
  | 'receitas'
  | 'fechamentos'
  | 'cadastros'
  | 'importacoes'
  | 'integridade'

const activeHref: Record<IntrTab, string> = {
  cockpit: '/modulos/intr',
  colaboradores: '/modulos/intr/colaboradores',
  times: '/modulos/intr/times',
  reembolsos: '/modulos/intr/reembolsos',
  documentos: '/modulos/intr/documentos',
  comunicados: '/modulos/intr/comunicados',
  pagamentos: '/modulos/intr/pagamentos',
  comissoes: '/modulos/intr/comissoes',
  tiposComissao: '/modulos/intr/cadastros/tipos-comissao',
  receitas: '/modulos/intr/receitas',
  fechamentos: '/modulos/intr/fechamentos',
  cadastros: '/modulos/intr/cadastros',
  importacoes: '/modulos/intr/importacoes',
  integridade: '/modulos/intr/integridade',
}

const navGroups: ModuleNavGroup[] = [
  {
    title: 'Cockpit',
    href: '/modulos/intr',
  },
  {
    title: 'Base cadastral',
    items: [
      { href: '/modulos/intr/colaboradores', label: 'Colaboradores' },
      { href: '/modulos/intr/times', label: 'Times' },
      { href: '/modulos/intr/cadastros/tipos-comissao', label: 'Tipos de comissao' },
      { href: '/modulos/intr/importacoes', label: 'Importações' },
    ],
  },
  {
    title: 'Base operacional',
    items: [
      { href: '/modulos/intr/pagamentos', label: 'Pagamentos' },
      { href: '/modulos/intr/comissoes', label: 'Comissoes' },
      { href: '/modulos/intr/receitas', label: 'Receitas' },
      { href: '/modulos/intr/fechamentos', label: 'Fechamentos' },
    ],
  },
]

function currency(value: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(value)
}

export function IntrShell({
  active,
  actions,
  children,
  description,
  title,
  usuario,
}: {
  active: IntrTab
  actions?: ReactNode
  children: ReactNode
  description: string
  title: string
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref={activeHref[active]}
      actions={actions}
      brand="IN"
      description={description}
      eyebrow="GKLI Intr"
      navGroups={navGroups}
      product="GKLI Intr"
      title={title}
      usuario={usuario}
    >
      {children}
    </ModuleShell>
  )
}

export function IntrKpis({ data }: { data: IntrData }) {
  const ativos = data.colaboradores.filter((item) => item.status === 'ativo').length
  const afastados = data.colaboradores.filter((item) => item.status === 'afastado').length
  const custo = data.colaboradores.reduce((sum, item) => sum + item.vencimentos + item.beneficios, 0)
  const times = new Set(data.colaboradores.map((item) => item.time).filter(Boolean)).size

  const cards = [
    { label: 'Colaboradores', value: String(data.colaboradores.length), hint: 'base do Intr' },
    { label: 'Ativos', value: String(ativos), hint: 'status ativo' },
    { label: 'Afastados', value: String(afastados), hint: 'acompanhamento de RH' },
    { label: 'Times', value: String(times), hint: 'areas cadastradas' },
    { label: 'Custo mensal', value: currency(custo), hint: 'vencimentos e beneficios' },
  ]

  return (
    <section className="suite-kpi-grid">
      {cards.map((card) => (
        <article className="card metric-card" key={card.label}>
          <p className="metric-label">{card.label}</p>
          <p className="metric-value">{card.value}</p>
          <p className="metric-hint">{card.hint}</p>
        </article>
      ))}
    </section>
  )
}

export function IntrSignals({ data }: { data: IntrData }) {
  return (
    <section className="suite-split-grid">
      <article className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Receitas por categoria</h2>
            <p>Leitura executiva do schema da intranet.</p>
          </div>
        </div>
        <SimpleRows rows={data.receitasCategoria} primary="categoria" secondary="descricao" value="valor_total" />
      </article>

      <article className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Ranking comercial</h2>
            <p>Vendedores e resultados vinculados ao Intr.</p>
          </div>
        </div>
        <SimpleRows rows={data.rankingVendedores} primary="vendedor_nome" secondary="time_nome" value="valor_total" />
      </article>
    </section>
  )
}

export function IntrColaboradorList({ canWrite = false, colaboradores }: { canWrite?: boolean; colaboradores: IntrColaborador[] }) {
  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Colaboradores</h2>
          <p>Cadastro executivo de pessoas, times, gestor e custo mensal.</p>
        </div>
      </div>

      {colaboradores.length ? (
        <div className="suite-table-list">
          {colaboradores.map((colaborador) => (
            <article key={colaborador.id}>
              <div>
                <h3>{colaborador.nome}</h3>
                <p>{colaborador.email || colaborador.cargo} - {colaborador.time}</p>
              </div>
              <span className={`suite-pill ${colaborador.status === 'ativo' ? 'success' : 'warning'}`}>{colaborador.status}</span>
              <strong>{currency(colaborador.vencimentos + colaborador.beneficios)}</strong>
              <small>
                {colaborador.gestor}
                {canWrite ? <Link className="button secondary" href={`/modulos/intr/colaboradores/${colaborador.id}`}>Editar</Link> : null}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum colaborador encontrado nas views do Intr." />
      )}
    </section>
  )
}

export function IntrListKpis({
  rows,
  totalLabel = 'Itens',
}: {
  rows: IntrListRow[]
  totalLabel?: string
}) {
  const total = rows.length
  const success = rows.filter((row) => row.tone === 'success').length
  const warnings = rows.filter((row) => row.tone === 'warning' || row.tone === 'danger').length
  const connected = rows.filter((row) => row.status !== 'sem dados').length

  const cards = [
    { label: totalLabel, value: String(total), hint: 'registros exibidos' },
    { label: 'Conectados', value: String(connected), hint: 'com leitura publicada' },
    { label: 'Ok', value: String(success), hint: 'sem alerta na lista' },
    { label: 'Atencao', value: String(warnings), hint: 'pontos para revisao' },
  ]

  return (
    <section className="suite-kpi-grid">
      {cards.map((card) => (
        <article className="card metric-card" key={card.label}>
          <p className="metric-label">{card.label}</p>
          <p className="metric-value">{card.value}</p>
          <p className="metric-hint">{card.hint}</p>
        </article>
      ))}
    </section>
  )
}

export function IntrGenericList({
  description,
  editHrefBase,
  empty,
  rows,
  title,
}: {
  description: string
  editHrefBase?: string
  empty: string
  rows: IntrListRow[]
  title: string
}) {
  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {rows.length ? (
        <div className="suite-table-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <h3>{row.title}</h3>
                <p>{row.subtitle}</p>
              </div>
              <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
              <strong>{row.value}</strong>
              <small>
                {row.meta}
                {editHrefBase ? <Link className="button secondary" href={`${editHrefBase}/${row.id}`}>Editar</Link> : null}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label={empty} />
      )}
    </section>
  )
}

function SimpleRows({
  primary,
  rows,
  secondary,
  value,
}: {
  primary: string
  rows: Array<Record<string, unknown>>
  secondary: string
  value: string
}) {
  if (!rows.length) return <EmptyBlock label="Sem dados disponiveis." />

  return (
    <div className="suite-table-list compact">
      {rows.map((row, index) => (
        <article key={`${primary}-${index}`}>
          <div>
            <h3>{String(row[primary] ?? row.nome ?? row.titulo ?? 'Item')}</h3>
            <p>{String(row[secondary] ?? row.status ?? '')}</p>
          </div>
          <strong>{currency(Number(row[value] ?? row.valor ?? row.total ?? 0))}</strong>
        </article>
      ))}
    </div>
  )
}

function moneyInput(value?: number | null) {
  return value ? String(value) : '0'
}

const pagamentoTipos = [
  'Salarios',
  'Pro-labore',
  'Participacao em honorarios fixos',
  'Beneficios',
  'Comissoes',
  'Ajuda de custo',
  'Reembolso',
  'Outros',
]

export function IntrTimeForm({
  action,
  time,
}: {
  action: (formData: FormData) => Promise<void>
  time?: IntrTimeRecord
}) {
  return (
    <form action={action} className="card suite-panel module-form-grid">
      {time ? <input type="hidden" name="id" value={time.id} /> : null}
      <div className="module-form-wide">
        <label className="label" htmlFor="nome">Nome</label>
        <input className="input" id="nome" name="nome" required defaultValue={time?.nome ?? ''} />
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="descricao">Descricao</label>
        <textarea className="textarea" id="descricao" name="descricao" defaultValue={time?.descricao ?? ''} />
      </div>
      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" value="on" defaultChecked={time?.ativo ?? true} />
        <span>Time ativo</span>
      </label>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar time</button>
        <Link className="button secondary" href="/modulos/intr/times">Cancelar</Link>
      </div>
    </form>
  )
}

export function IntrColaboradorForm({
  action,
  colaborador,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  colaborador?: IntrColaboradorRecord
  formData: IntrFormData
}) {
  return (
    <form action={action} className="card suite-panel module-form-grid">
      {colaborador ? <input type="hidden" name="id" value={colaborador.id} /> : null}
      <ColaboradorCoreFields
        coreUsuarios={formData.coreUsuarios}
        email={colaborador?.email}
        nome={colaborador?.nome}
        usuarioId={colaborador?.usuario_id}
      />
      <div>
        <label className="label" htmlFor="cpf_cnpj">CPF/CNPJ</label>
        <input className="input" id="cpf_cnpj" name="cpf_cnpj" defaultValue={colaborador?.cpf_cnpj ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="telefone">Telefone</label>
        <input className="input" id="telefone" name="telefone" defaultValue={colaborador?.telefone ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={colaborador?.status ?? 'ativo'}>
          <option value="ativo">Ativo</option>
          <option value="afastado">Afastado</option>
          <option value="desligado">Desligado</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="time_id">Time</label>
        <select className="select" id="time_id" name="time_id" defaultValue={colaborador?.time_id ?? ''}>
          <option value="">Sem time</option>
          {formData.times.map((time) => <option key={time.id} value={time.id}>{time.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="gestor_id">Gestor</label>
        <select className="select" id="gestor_id" name="gestor_id" defaultValue={colaborador?.gestor_id ?? ''}>
          <option value="">Sem gestor</option>
          {formData.colaboradores.filter((item) => item.id !== colaborador?.id).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="cargo">Cargo</label>
        <input className="input" id="cargo" name="cargo" defaultValue={colaborador?.cargo ?? ''} />
      </div>
      {[
        ['salario', 'Salario'],
        ['pro_labore', 'Pro-labore'],
        ['ajuda_custo', 'Ajuda de custo'],
        ['participacao_honorarios', 'Participacao em honorarios fixos'],
        ['outros_vencimentos', 'Outros vencimentos'],
        ['beneficio_valor', 'Valor beneficio'],
      ].map(([name, label]) => (
        <div key={name}>
          <label className="label" htmlFor={name}>{label}</label>
          <input className="input" id={name} name={name} inputMode="decimal" defaultValue={moneyInput((colaborador as any)?.[name])} />
        </div>
      ))}
      <div className="module-form-wide">
        <label className="label" htmlFor="beneficio_descricao">Beneficio</label>
        <input className="input" id="beneficio_descricao" name="beneficio_descricao" defaultValue={colaborador?.beneficio_descricao ?? ''} />
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observacoes</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={colaborador?.observacoes ?? ''} />
      </div>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar colaborador</button>
        <Link className="button secondary" href="/modulos/intr/colaboradores">Cancelar</Link>
      </div>
    </form>
  )
}

export function IntrComissaoForm({
  action,
  comissao,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  comissao?: IntrComissaoRecord
  formData: IntrFormData
}) {
  return (
    <form action={action} className="card suite-panel module-form-grid">
      {comissao ? <input type="hidden" name="id" value={comissao.id} /> : null}
      {comissao?.fechamento_id ? <input type="hidden" name="fechamento_id" value={comissao.fechamento_id} /> : null}
      <div className="module-form-wide">
        <label className="label" htmlFor="receita_id">Receita vinculada</label>
        <select className="select" id="receita_id" name="receita_id" defaultValue={comissao?.receita_id ?? ''}>
          <option value="">Sem receita vinculada</option>
          {formData.receitas.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="colaborador_id">Colaborador</label>
        <select className="select" id="colaborador_id" name="colaborador_id" required defaultValue={comissao?.colaborador_id ?? ''}>
          <option value="">Selecione</option>
          {formData.colaboradores.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      {[
        ['vendedor_nome', 'Vendedor'],
        ['cliente', 'Cliente'],
        ['categoria', 'Categoria'],
        ['tipo_comissao_nome', 'Tipo de comissao'],
        ['origem', 'Origem'],
      ].map(([name, label]) => (
        <div key={name}>
          <label className="label" htmlFor={name}>{label}</label>
          <input className="input" id={name} name={name} defaultValue={(comissao as any)?.[name] ?? ''} />
        </div>
      ))}
      <div>
        <label className="label" htmlFor="percentual">Percentual</label>
        <input className="input" id="percentual" name="percentual" type="number" min={0} max={100} step="0.0001" defaultValue={comissao?.percentual ?? 0} />
      </div>
      <div>
        <label className="label" htmlFor="valor_base">Valor base</label>
        <input className="input" id="valor_base" name="valor_base" inputMode="decimal" defaultValue={moneyInput(comissao?.valor_base)} />
      </div>
      <div>
        <label className="label" htmlFor="valor_comissao">Valor comissao</label>
        <input className="input" id="valor_comissao" name="valor_comissao" inputMode="decimal" defaultValue={moneyInput(comissao?.valor_comissao)} />
      </div>
      <label className="checkbox-row">
        <input name="calcular_automatico" type="checkbox" value="on" defaultChecked />
        <span>Calcular pelo valor base e percentual</span>
      </label>
      <div>
        <label className="label" htmlFor="competencia">Competencia</label>
        <input className="input" id="competencia" name="competencia" type="date" defaultValue={comissao?.competencia ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="data_recebimento">Recebimento</label>
        <input className="input" id="data_recebimento" name="data_recebimento" type="date" defaultValue={comissao?.data_recebimento ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={comissao?.status ?? 'calculada'}>
          <option value="calculada">Calculada</option>
          <option value="em_conferencia">Em conferencia</option>
          <option value="aprovada">Aprovada</option>
          <option value="rejeitada">Rejeitada</option>
          <option value="paga">Paga</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="observacao">Observacao</label>
        <textarea className="textarea" id="observacao" name="observacao" defaultValue={comissao?.observacao ?? ''} />
      </div>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar comissao</button>
        <Link className="button secondary" href="/modulos/intr/comissoes">Cancelar</Link>
      </div>
    </form>
  )
}

export function IntrComissaoTipoForm({
  action,
  tipo,
}: {
  action: (formData: FormData) => Promise<void>
  tipo?: IntrComissaoTipoRecord
}) {
  return (
    <form action={action} className="card suite-panel module-form-grid">
      {tipo ? <input type="hidden" name="id" value={tipo.id} /> : null}
      <div>
        <label className="label" htmlFor="nome">Nome</label>
        <input className="input" id="nome" name="nome" required defaultValue={tipo?.nome ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="categoria">Categoria da receita</label>
        <input className="input" id="categoria" name="categoria" defaultValue={tipo?.categoria ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="percentual">Percentual</label>
        <input className="input" id="percentual" name="percentual" type="number" min={0} max={100} step="0.0001" required defaultValue={tipo?.percentual ?? 0} />
      </div>
      <label className="checkbox-row">
        <input name="comissao_de_time" type="checkbox" value="on" defaultChecked={tipo?.comissao_de_time ?? false} />
        <span>Comissao de time</span>
      </label>
      <label className="checkbox-row">
        <input name="ativo" type="checkbox" value="on" defaultChecked={tipo?.ativo ?? true} />
        <span>Tipo ativo</span>
      </label>
      <div className="module-form-wide">
        <label className="label" htmlFor="observacao">Observacao</label>
        <textarea className="textarea" id="observacao" name="observacao" defaultValue={tipo?.observacao ?? ''} />
      </div>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar tipo</button>
        <Link className="button secondary" href="/modulos/intr/cadastros/tipos-comissao">Cancelar</Link>
      </div>
    </form>
  )
}

export function IntrReceitaForm({
  action,
  formData,
  receita,
}: {
  action: (formData: FormData) => Promise<void>
  formData: IntrFormData
  receita?: IntrReceitaRecord
}) {
  return (
    <form action={action} className="card suite-panel module-form-grid">
      {receita ? <input type="hidden" name="id" value={receita.id} /> : null}
      <div className="module-form-wide">
        <label className="label" htmlFor="cliente">Cliente</label>
        <input className="input" id="cliente" name="cliente" required defaultValue={receita?.cliente ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="colaborador_id">Responsavel comercial</label>
        <select className="select" id="colaborador_id" name="colaborador_id" defaultValue={receita?.colaborador_id ?? ''}>
          <option value="">Sem responsavel</option>
          {formData.colaboradores.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="vendedor_nome">Vendedor</label>
        <input className="input" id="vendedor_nome" name="vendedor_nome" defaultValue={receita?.vendedor_nome ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="categoria">Categoria</label>
        <input className="input" id="categoria" name="categoria" defaultValue={receita?.categoria ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={receita?.status ?? 'recebida'}>
          <option value="prevista">Prevista</option>
          <option value="recebida">Recebida</option>
          <option value="conciliada">Conciliada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="competencia">Competencia</label>
        <input className="input" id="competencia" name="competencia" type="date" required defaultValue={receita?.competencia ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="data_recebimento">Recebimento</label>
        <input className="input" id="data_recebimento" name="data_recebimento" type="date" defaultValue={receita?.data_recebimento ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="valor_base">Valor base</label>
        <input className="input" id="valor_base" name="valor_base" inputMode="decimal" defaultValue={moneyInput(receita?.valor_base)} />
      </div>
      <div>
        <label className="label" htmlFor="valor_recebido">Valor recebido</label>
        <input className="input" id="valor_recebido" name="valor_recebido" inputMode="decimal" defaultValue={moneyInput(receita?.valor_recebido)} />
      </div>
      <div>
        <label className="label" htmlFor="origem">Origem</label>
        <input className="input" id="origem" name="origem" defaultValue={receita?.origem ?? ''} />
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="descricao">Descricao</label>
        <input className="input" id="descricao" name="descricao" defaultValue={receita?.descricao ?? ''} />
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="observacao">Observacao</label>
        <textarea className="textarea" id="observacao" name="observacao" defaultValue={receita?.observacao ?? ''} />
      </div>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar receita</button>
        <Link className="button secondary" href="/modulos/intr/receitas">Cancelar</Link>
      </div>
    </form>
  )
}

export function IntrFechamentoForm({
  action,
  fechamento,
}: {
  action: (formData: FormData) => Promise<void>
  fechamento?: IntrFechamentoRecord
}) {
  return (
    <form action={action} className="card suite-panel module-form-grid">
      {fechamento ? <input type="hidden" name="id" value={fechamento.id} /> : null}
      <div>
        <label className="label" htmlFor="competencia">Competencia</label>
        <input className="input" id="competencia" name="competencia" type="date" required defaultValue={fechamento?.competencia ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={fechamento?.status ?? 'aberto'}>
          <option value="aberto">Aberto</option>
          <option value="em_conferencia">Em conferencia</option>
          <option value="fechado">Fechado</option>
          <option value="reaberto">Reaberto</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="observacao">Observacao</label>
        <textarea className="textarea" id="observacao" name="observacao" defaultValue={fechamento?.observacao ?? ''} />
      </div>
      {fechamento ? (
        <section className="suite-kpi-grid compact module-form-wide">
          <article className="card metric-card">
            <p className="metric-label">Receitas</p>
            <p className="metric-value">{currency(fechamento.receita_total)}</p>
            <p className="metric-hint">competencia</p>
          </article>
          <article className="card metric-card">
            <p className="metric-label">Comissoes</p>
            <p className="metric-value">{currency(fechamento.comissao_total)}</p>
            <p className="metric-hint">calculadas</p>
          </article>
          <article className="card metric-card">
            <p className="metric-label">Pagamentos</p>
            <p className="metric-value">{currency(fechamento.pagamentos_previstos_total)}</p>
            <p className="metric-hint">previstos totais</p>
          </article>
          <article className="card metric-card">
            <p className="metric-label">Pendencias</p>
            <p className="metric-value">{String(fechamento.pendencias_total)}</p>
            <p className="metric-hint">antes de fechar</p>
          </article>
        </section>
      ) : null}
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Recalcular fechamento</button>
        <Link className="button secondary" href="/modulos/intr/fechamentos">Cancelar</Link>
      </div>
    </form>
  )
}

export function IntrComissaoWorkflowActions({
  gerarPagamentosAction,
}: {
  gerarPagamentosAction: (formData: FormData) => Promise<void>
}) {
  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Pagamentos de comissoes</h2>
          <p>Gere pagamentos previstos para comissoes aprovadas em uma competencia.</p>
        </div>
      </div>
      <form action={gerarPagamentosAction} className="module-form-grid">
        <div>
          <label className="label" htmlFor="competencia">Competencia</label>
          <input className="input" id="competencia" name="competencia" type="date" required />
        </div>
        <div>
          <label className="label" htmlFor="data_prevista">Data prevista</label>
          <input className="input" id="data_prevista" name="data_prevista" type="date" />
        </div>
        <div className="form-actions module-form-wide">
          <button className="button" type="submit">Gerar pagamentos aprovados</button>
        </div>
      </form>
    </section>
  )
}

export function IntrComissaoOperationalList({
  rows,
}: {
  rows: IntrListRow[]
}) {
  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Comissoes por colaborador e tipo</h2>
          <p>Consolide os lancamentos e abra a conferencia para ver a relacao detalhada.</p>
        </div>
      </div>
      {rows.length ? (
        <div className="suite-table-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <h3>{row.title}</h3>
                <p>{row.subtitle}</p>
              </div>
              <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
              <strong>{row.value}</strong>
              <small>
                {row.meta}
                {row.detailHref ? <Link className="button secondary" href={row.detailHref}>Conferir</Link> : null}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhuma comissao encontrada nas views do Intr." />
      )}
    </section>
  )
}

export function IntrComissaoDetailList({
  canWrite,
  rows,
  statusAction,
}: {
  canWrite?: boolean
  rows: IntrListRow[]
  statusAction: (formData: FormData) => Promise<void>
}) {
  const transitions = [
    { label: 'Marcar conferencia', status: 'em_conferencia' },
    { label: 'Aprovar', status: 'aprovada' },
    { label: 'Rejeitar', status: 'rejeitada' },
    { label: 'Pagar', status: 'paga' },
    { label: 'Cancelar', status: 'cancelada' },
  ]

  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Relacao detalhada</h2>
          <p>Lancamentos individuais do grupo selecionado para conferencia e aprovacao.</p>
        </div>
      </div>
      {rows.length ? (
        <div className="suite-table-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <h3>{row.title}</h3>
                <p>{row.subtitle}</p>
              </div>
              <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
              <strong>{row.value}</strong>
              <small>
                {row.meta}
                {canWrite ? <Link className="button secondary" href={`/modulos/intr/comissoes/${row.id}`}>Editar</Link> : null}
              </small>
              {canWrite ? (
                <div className="module-inline-actions">
                  {transitions.map((item) => (
                    <form action={statusAction} key={`${row.id}-${item.status}`}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="status" value={item.status} />
                      <button className="button secondary" type="submit">{item.label}</button>
                    </form>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum lancamento encontrado para esta conferencia." />
      )}
    </section>
  )
}

export function IntrPagamentoForm({
  action,
  formData,
  pagamento,
}: {
  action: (formData: FormData) => Promise<void>
  formData: IntrFormData
  pagamento?: IntrPagamentoRecord
}) {
  return (
    <form action={action} className="card suite-panel module-form-grid">
      {pagamento ? <input type="hidden" name="id" value={pagamento.id} /> : null}
      {pagamento?.agenda_id ? <input type="hidden" name="agenda_id" value={pagamento.agenda_id} /> : null}
      {pagamento?.fechamento_id ? <input type="hidden" name="fechamento_id" value={pagamento.fechamento_id} /> : null}
      <div className="module-form-wide">
        <label className="label" htmlFor="colaborador_id">Colaborador</label>
        <select className="select" id="colaborador_id" name="colaborador_id" required defaultValue={pagamento?.colaborador_id ?? ''}>
          <option value="">Selecione</option>
          {formData.colaboradores.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <input className="input" id="tipo" name="tipo" defaultValue={pagamento?.tipo ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={pagamento?.status ?? 'previsto'}>
          <option value="previsto">Previsto</option>
          <option value="em_processamento">Em processamento</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="competencia">Competencia</label>
        <input className="input" id="competencia" name="competencia" type="date" required defaultValue={pagamento?.competencia ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="data_prevista">Data prevista</label>
        <input className="input" id="data_prevista" name="data_prevista" type="date" defaultValue={pagamento?.data_prevista ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="data_pagamento">Data pagamento</label>
        <input className="input" id="data_pagamento" name="data_pagamento" type="date" defaultValue={pagamento?.data_pagamento ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="valor_bruto">Valor bruto</label>
        <input className="input" id="valor_bruto" name="valor_bruto" inputMode="decimal" defaultValue={moneyInput(pagamento?.valor_bruto)} />
      </div>
      <div>
        <label className="label" htmlFor="valor_descontos">Descontos</label>
        <input className="input" id="valor_descontos" name="valor_descontos" inputMode="decimal" defaultValue={moneyInput(pagamento?.valor_descontos)} />
      </div>
      <div>
        <label className="label" htmlFor="comissao_id">Comissao vinculada</label>
        <select className="select" id="comissao_id" name="comissao_id" defaultValue={pagamento?.comissao_id ?? ''}>
          <option value="">Sem comissao</option>
          {formData.comissoes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="origem">Origem</label>
        <input className="input" id="origem" name="origem" defaultValue={pagamento?.origem ?? ''} />
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="descricao">Descricao</label>
        <input className="input" id="descricao" name="descricao" defaultValue={pagamento?.descricao ?? ''} />
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="observacao">Observacao</label>
        <textarea className="textarea" id="observacao" name="observacao" defaultValue={pagamento?.observacao ?? ''} />
      </div>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar pagamento</button>
        <Link className="button secondary" href="/modulos/intr/pagamentos">Cancelar</Link>
      </div>
    </form>
  )
}

export function IntrPagamentoAgendaForm({
  action,
  agenda,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  agenda?: IntrPagamentoAgendaRecord
  formData: IntrFormData
}) {
  return (
    <form action={action} className="card suite-panel module-form-grid">
      {agenda ? <input type="hidden" name="id" value={agenda.id} /> : null}
      <div className="module-form-wide">
        <label className="label" htmlFor="colaborador_id">Colaborador</label>
        <select className="select" id="colaborador_id" name="colaborador_id" required defaultValue={agenda?.colaborador_id ?? ''}>
          <option value="">Selecione</option>
          {formData.colaboradores.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="tipo">Tipo de pagamento</label>
        <select className="select" id="tipo" name="tipo" required defaultValue={agenda?.tipo ?? 'Salarios'}>
          {pagamentoTipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="dia_previsto">Dia previsto</label>
        <input className="input" id="dia_previsto" name="dia_previsto" type="number" min={1} max={31} required defaultValue={agenda?.dia_previsto ?? 5} />
      </div>
      <div>
        <label className="label" htmlFor="percentual">Percentual</label>
        <input className="input" id="percentual" name="percentual" type="number" min={0} max={100} step="0.0001" defaultValue={agenda?.percentual ?? 0} />
      </div>
      <div>
        <label className="label" htmlFor="inicio_competencia">Inicio</label>
        <input className="input" id="inicio_competencia" name="inicio_competencia" type="date" required defaultValue={agenda?.inicio_competencia ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="fim_competencia">Fim</label>
        <input className="input" id="fim_competencia" name="fim_competencia" type="date" defaultValue={agenda?.fim_competencia ?? ''} />
      </div>
      <div>
        <label className="label" htmlFor="valor_bruto">Valor bruto</label>
        <input className="input" id="valor_bruto" name="valor_bruto" inputMode="decimal" defaultValue={moneyInput(agenda?.valor_bruto)} />
      </div>
      <div>
        <label className="label" htmlFor="valor_descontos">Descontos</label>
        <input className="input" id="valor_descontos" name="valor_descontos" inputMode="decimal" defaultValue={moneyInput(agenda?.valor_descontos)} />
      </div>
      <div>
        <label className="label" htmlFor="origem">Origem</label>
        <input className="input" id="origem" name="origem" defaultValue={agenda?.origem ?? 'agenda_pagamento'} />
      </div>
      <label className="checkbox-row">
        <input name="ativo" type="checkbox" value="on" defaultChecked={agenda?.ativo ?? true} />
        <span>Agenda ativa</span>
      </label>
      <div className="module-form-wide">
        <label className="label" htmlFor="descricao">Descricao</label>
        <input className="input" id="descricao" name="descricao" defaultValue={agenda?.descricao ?? ''} />
      </div>
      <div className="module-form-wide">
        <label className="label" htmlFor="observacao">Observacao</label>
        <textarea className="textarea" id="observacao" name="observacao" defaultValue={agenda?.observacao ?? ''} />
      </div>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar agenda</button>
        <Link className="button secondary" href="/modulos/intr/pagamentos/agenda">Cancelar</Link>
      </div>
    </form>
  )
}

export function IntrGerarPagamentosForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="card suite-panel module-form-grid">
      <div>
        <label className="label" htmlFor="competencia">Competencia</label>
        <input className="input" id="competencia" name="competencia" type="date" required />
      </div>
      <div className="form-actions">
        <button className="button" type="submit">Gerar previstos</button>
      </div>
    </form>
  )
}

export function EmptyBlock({ label }: { label: string }) {
  return <div className="suite-empty-block">{label}</div>
}
