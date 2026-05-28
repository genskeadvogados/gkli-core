import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { sendCrmOpportunityToCicloAction } from '@/features/crm/actions'
import { formatBRL, opportunityScore, riskLabel, riskTone, stageLabel, stageOrder } from '@/features/crm/scoring'
import type {
  CrmData,
  CrmContatoRecord,
  CrmAtividadeRecord,
  CrmEmpresa,
  CrmEmpresaRecord,
  CrmListRow,
  CrmOportunidade,
  CrmOpportunityFormData,
  CrmOpportunityRecord,
  CrmPropostaRecord,
  CrmStage,
} from '@/features/crm/types'
import type { PlatformUsuario } from '@/lib/auth/platform'

type CrmTab =
  | 'cockpit'
  | 'dashboard'
  | 'oportunidades'
  | 'propostas'
  | 'atividades'
  | 'interacoes'
  | 'importacoes'
  | 'empresas'
  | 'clientes'
  | 'contatos'
  | 'carteiras'

const activeHref: Record<CrmTab, string> = {
  cockpit: '/modulos/crm',
  dashboard: '/modulos/crm/dashboard',
  oportunidades: '/modulos/crm/oportunidades',
  propostas: '/modulos/crm/propostas',
  atividades: '/modulos/crm/atividades',
  interacoes: '/modulos/crm/interacoes',
  importacoes: '/modulos/crm/importacoes',
  empresas: '/modulos/crm/empresas',
  clientes: '/modulos/crm/clientes',
  contatos: '/modulos/crm/contatos',
  carteiras: '/modulos/crm/carteiras-usuarios',
}

const navGroups: ModuleNavGroup[] = [
  {
    title: 'Cockpit',
    items: [
      { href: '/modulos/crm', label: 'Cockpit' },
      { href: '/modulos/crm/dashboard', label: 'Dashboard' },
    ],
  },
  {
    title: 'Base operacional',
    items: [
      { href: '/modulos/crm/oportunidades', label: 'Pipeline' },
      { href: '/modulos/crm/propostas', label: 'Propostas' },
      { href: '/modulos/crm/atividades', label: 'Atividades' },
      { href: '/modulos/crm/interacoes', label: 'Interacoes' },
    ],
  },
  {
    title: 'Base cadastral',
    items: [
      { href: '/modulos/crm/empresas', label: 'Empresas' },
      { href: '/modulos/crm/clientes', label: 'Clientes' },
      { href: '/modulos/crm/contatos', label: 'Contatos' },
    ],
  },
]

export function CrmShell({
  active,
  actions,
  children,
  description,
  eyebrow,
  title,
  usuario,
}: {
  active: CrmTab
  actions?: ReactNode
  children: ReactNode
  description: string
  eyebrow: string
  title: string
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref={activeHref[active]}
      actions={actions}
      brand="CRM"
      description={description}
      eyebrow={eyebrow}
      navGroups={navGroups}
      product="GKLI CRM"
      title={title}
      usuario={usuario}
    >
      {children}
    </ModuleShell>
  )
}

export function CrmReadinessCard({ data }: { data: CrmData }) {
  if (data.databaseReady || data.oportunidades.length || data.empresas.length) return null

  return (
    <section className="crm-empty-card">
      <strong>CRM pronto para iniciar</strong>
      <span>Cadastre empresas, contatos e oportunidades para alimentar o cockpit comercial.</span>
    </section>
  )
}

export function CrmKpis({ data }: { data: CrmData }) {
  const abertas = data.oportunidades.filter((oportunidade) => !['fechado', 'perdido'].includes(oportunidade.etapa))
  const pipeline = abertas.reduce((sum, oportunidade) => sum + oportunidade.valor, 0)
  const receitaProvavel = abertas.reduce((sum, oportunidade) => sum + oportunidade.valor * (oportunidade.probabilidade / 100), 0)
  const followUps = abertas.filter((oportunidade) => oportunidade.diasSemInteracao >= 3).length
  const conversao = data.oportunidades.length
    ? Math.round((data.oportunidades.filter((oportunidade) => oportunidade.etapa === 'fechado').length / data.oportunidades.length) * 100)
    : 0

  const items = [
    { label: 'Pipeline total', value: formatBRL(pipeline), hint: 'oportunidades abertas' },
    { label: 'Receita provável', value: formatBRL(receitaProvavel), hint: 'ponderada por probabilidade' },
    { label: 'Conversão', value: `${conversao}%`, hint: 'fechados sobre a base' },
    { label: 'Follow-ups', value: String(followUps), hint: 'ações pendentes' },
    { label: 'Empresas', value: String(data.empresas.length), hint: 'contas cadastradas' },
    { label: 'Propostas', value: String(data.propostas.total), hint: `${formatBRL(data.propostas.valorTotal)} em valor` },
  ]

  return (
    <section className="crm-kpi-grid">
      {items.map((item) => (
        <article className="card metric-card" key={item.label}>
          <p className="metric-label">{item.label}</p>
          <p className="metric-value">{item.value}</p>
          <p className="metric-hint">{item.hint}</p>
        </article>
      ))}
    </section>
  )
}

export function CrmSemaforo({ oportunidades }: { oportunidades: CrmOportunidade[] }) {
  const abertas = oportunidades.filter((oportunidade) => !['fechado', 'perdido'].includes(oportunidade.etapa))
  const groups = [
    { title: 'Quentes', tone: 'success', desc: 'alta chance de fechamento', rows: abertas.filter((oportunidade) => riskTone(oportunidade) === 'success') },
    { title: 'Atenção', tone: 'warning', desc: 'precisam de condução', rows: abertas.filter((oportunidade) => riskTone(oportunidade) === 'warning') },
    { title: 'Risco', tone: 'danger', desc: 'follow-up vencido ou baixa chance', rows: abertas.filter((oportunidade) => riskTone(oportunidade) === 'danger') },
  ]

  return (
    <section className="crm-signal-grid">
      {groups.map((group) => (
        <article className="card crm-signal-card" key={group.title}>
          <span className={`crm-pill ${group.tone}`}>{group.title}</span>
          <strong>{group.rows.length}</strong>
          <p>{group.desc}</p>
          <small>{formatBRL(group.rows.reduce((sum, oportunidade) => sum + oportunidade.valor, 0))}</small>
        </article>
      ))}
    </section>
  )
}

export function CrmFunnel({ oportunidades }: { oportunidades: CrmOportunidade[] }) {
  const max = Math.max(...stageOrder.map((stage) => oportunidades.filter((oportunidade) => oportunidade.etapa === stage).length), 1)

  return (
    <section className="card crm-panel">
      <div className="crm-panel-heading">
        <div>
          <h2>Funil comercial</h2>
          <p>Volume, valor e distribuição por etapa.</p>
        </div>
        <span className="crm-pill primary">pipeline</span>
      </div>

      <div className="crm-funnel-list">
        {stageOrder.map((stage) => {
          const rows = oportunidades.filter((oportunidade) => oportunidade.etapa === stage)
          const width = Math.max(8, Math.round((rows.length / max) * 100))

          return (
            <div className="crm-funnel-row" key={stage}>
              <div>
                <strong>{stageLabel[stage]}</strong>
                <span>{rows.length} oportunidades</span>
              </div>
              <div className="crm-progress">
                <span style={{ width: `${width}%` }} />
              </div>
              <strong>{formatBRL(rows.reduce((sum, oportunidade) => sum + oportunidade.valor, 0))}</strong>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function CrmActions({ oportunidades }: { oportunidades: CrmOportunidade[] }) {
  const actions = [...oportunidades]
    .filter((oportunidade) => !['fechado', 'perdido'].includes(oportunidade.etapa))
    .sort((a, b) => b.diasSemInteracao - a.diasSemInteracao || opportunityScore(b) - opportunityScore(a))
    .slice(0, 5)

  return (
    <section className="card crm-panel">
      <div className="crm-panel-heading">
        <div>
          <h2>Ações recomendadas</h2>
          <p>Próximos movimentos comerciais.</p>
        </div>
      </div>

      {actions.length ? (
        <div className="crm-action-list">
          {actions.map((oportunidade) => (
            <article key={oportunidade.id}>
              <span>{oportunidade.proximaAcao}</span>
              <strong>{oportunidade.empresa}</strong>
              <small>{oportunidade.ultimaInteracao}</small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhuma ação pendente." />
      )}
    </section>
  )
}

export function CrmRanking({ oportunidades }: { oportunidades: CrmOportunidade[] }) {
  const ranking = [...oportunidades]
    .filter((oportunidade) => !['fechado', 'perdido'].includes(oportunidade.etapa))
    .sort((a, b) => opportunityScore(b) - opportunityScore(a))
    .slice(0, 8)

  return (
    <section className="card crm-panel">
      <div className="crm-panel-heading">
        <div>
          <h2>Ranking de oportunidades</h2>
          <p>Priorização por valor, probabilidade, etapa e tempo parado.</p>
        </div>
        <Link className="button secondary" href="/modulos/crm/oportunidades">Ver pipeline</Link>
      </div>

      {ranking.length ? (
        <div className="crm-ranking-list">
          {ranking.map((oportunidade, index) => (
            <article key={oportunidade.id}>
              <span className="crm-rank-number">{index + 1}</span>
              <div>
                <h3>{oportunidade.empresa}</h3>
                <p>{oportunidade.titulo} · {stageLabel[oportunidade.etapa]} · {oportunidade.contato}</p>
              </div>
              <div className="crm-ranking-meta">
                <strong>{formatBRL(oportunidade.valor)}</strong>
                <span>{oportunidade.probabilidade}% · score {opportunityScore(oportunidade)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhuma oportunidade cadastrada." />
      )}
    </section>
  )
}

export function CrmBoard({ canWrite = false, oportunidades }: { canWrite?: boolean; oportunidades: CrmOportunidade[] }) {
  const grouped = stageOrder.reduce<Record<CrmStage, CrmOportunidade[]>>((acc, stage) => {
    acc[stage] = oportunidades
      .filter((oportunidade) => oportunidade.etapa === stage)
      .sort((a, b) => opportunityScore(b) - opportunityScore(a))
    return acc
  }, {} as Record<CrmStage, CrmOportunidade[]>)

  return (
    <section className="crm-board">
      {stageOrder.map((stage) => {
        const rows = grouped[stage] ?? []

        return (
          <div className="crm-stage-card" key={stage}>
            <header>
              <div>
                <strong>{stageLabel[stage]}</strong>
                <span>{rows.length} cards</span>
              </div>
              <small>{formatBRL(rows.reduce((sum, oportunidade) => sum + oportunidade.valor, 0))}</small>
            </header>

            <div className="crm-stage-list">
              {rows.map((oportunidade) => (
                <article className="crm-opportunity-card" key={oportunidade.id}>
                  <h3>{oportunidade.empresa}</h3>
                  <p>{oportunidade.titulo}</p>
                  <div className="crm-card-pills">
                    <span className={`crm-pill ${riskTone(oportunidade)}`}>{riskLabel(oportunidade)}</span>
                    <span className="crm-pill primary">score {opportunityScore(oportunidade)}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Valor</dt>
                      <dd>{formatBRL(oportunidade.valor)}</dd>
                    </div>
                    <div>
                      <dt>Chance</dt>
                      <dd>{oportunidade.probabilidade}%</dd>
                    </div>
                  </dl>
                  <strong>{oportunidade.proximaAcao}</strong>
                  {canWrite ? (
                    <div className="form-actions">
                      <Link className="button secondary" href={`/modulos/crm/oportunidades/${oportunidade.id}`}>Editar</Link>
                      {oportunidade.etapa === 'fechado' || oportunidade.status === 'ganha' ? (
                        <form action={sendCrmOpportunityToCicloAction}>
                          <input type="hidden" name="id" value={oportunidade.id} />
                          <button className="button secondary" type="submit">Enviar para Ciclo</button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
              {!rows.length ? <EmptyBlock label="Sem cards nesta etapa." /> : null}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function dateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

function moneyInput(value?: number | null) {
  return value ? String(value) : '0'
}

export function CrmOpportunityForm({
  action,
  formData,
  opportunity,
}: {
  action: (formData: FormData) => Promise<void>
  formData: CrmOpportunityFormData
  opportunity?: CrmOpportunityRecord
}) {
  return (
    <form action={action} className="card crm-panel crm-form-grid">
      {opportunity ? <input type="hidden" name="id" value={opportunity.id} /> : null}
      <div>
        <label className="label" htmlFor="titulo">Titulo</label>
        <input className="input" id="titulo" name="titulo" required defaultValue={opportunity?.titulo ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="empresa_id">Empresa</label>
        <select className="select" id="empresa_id" name="empresa_id" required defaultValue={opportunity?.empresa_id ?? ''}>
          <option value="">Selecione</option>
          {formData.empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>{empresa.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="contato_id">Contato</label>
        <select className="select" id="contato_id" name="contato_id" defaultValue={opportunity?.contato_id ?? ''}>
          <option value="">Sem contato definido</option>
          {formData.contatos.map((contato) => (
            <option key={contato.id} value={contato.id}>{contato.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="carteira_id">Carteira</label>
        <select className="select" id="carteira_id" name="carteira_id" defaultValue={opportunity?.carteira_id ?? ''}>
          <option value="">Sem carteira</option>
          {formData.carteiras.map((carteira) => (
            <option key={carteira.id} value={carteira.id}>{carteira.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="etapa">Etapa</label>
        <select className="select" id="etapa" name="etapa" defaultValue={opportunity?.etapa ?? 'lead'}>
          {stageOrder.map((stage) => (
            <option key={stage} value={stage}>{stageLabel[stage]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={opportunity?.status ?? 'aberta'}>
          <option value="aberta">Aberta</option>
          <option value="ganha">Ganha</option>
          <option value="perdida">Perdida</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="valor">Valor</label>
        <input className="input" id="valor" name="valor" inputMode="decimal" defaultValue={moneyInput(opportunity?.valor)} />
      </div>

      <div>
        <label className="label" htmlFor="probabilidade">Probabilidade</label>
        <input className="input" id="probabilidade" name="probabilidade" type="number" min={0} max={100} defaultValue={opportunity?.probabilidade ?? 25} />
      </div>

      <div>
        <label className="label" htmlFor="origem">Origem</label>
        <input className="input" id="origem" name="origem" defaultValue={opportunity?.origem ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_ultima_interacao">Ultima interacao</label>
        <input className="input" id="data_ultima_interacao" name="data_ultima_interacao" type="datetime-local" defaultValue={dateTimeLocal(opportunity?.data_ultima_interacao)} />
      </div>

      <div>
        <label className="label" htmlFor="data_proxima_acao">Proxima acao em</label>
        <input className="input" id="data_proxima_acao" name="data_proxima_acao" type="datetime-local" defaultValue={dateTimeLocal(opportunity?.data_proxima_acao)} />
      </div>

      <div className="crm-form-wide">
        <label className="label" htmlFor="proxima_acao">Proxima acao</label>
        <input className="input" id="proxima_acao" name="proxima_acao" defaultValue={opportunity?.proxima_acao ?? ''} />
      </div>

      <div className="crm-form-wide">
        <label className="label" htmlFor="descricao">Descricao</label>
        <textarea className="textarea" id="descricao" name="descricao" defaultValue={opportunity?.descricao ?? ''} />
      </div>

      <div className="crm-form-wide">
        <label className="label" htmlFor="motivo_perda">Motivo de perda</label>
        <textarea className="textarea" id="motivo_perda" name="motivo_perda" defaultValue={opportunity?.motivo_perda ?? ''} />
      </div>

      <div className="form-actions crm-form-wide">
        <button className="button" type="submit">Salvar oportunidade</button>
        {opportunity ? (
          <button className="button secondary" formAction={sendCrmOpportunityToCicloAction} type="submit">
            Enviar para Ciclo
          </button>
        ) : null}
        <Link className="button secondary" href="/modulos/crm/oportunidades">Cancelar</Link>
      </div>
    </form>
  )
}

export function CrmEmpresaList({ empresas }: { empresas: CrmEmpresa[] }) {
  return (
    <section className="card crm-panel">
      <div className="crm-panel-heading">
        <div>
          <h2>Lista de empresas</h2>
          <p>Contas comerciais vinculadas ao pipeline.</p>
        </div>
      </div>

      {empresas.length ? (
        <div className="crm-table-list">
          {empresas.map((empresa) => (
            <article key={empresa.id}>
              <div>
                <h3>{empresa.nome}</h3>
                <p>{empresa.documento} · {empresa.segmento}</p>
              </div>
              <span className={`crm-pill ${empresa.status === 'ativo' ? 'success' : empresa.status === 'inativo' ? 'danger' : 'primary'}`}>
                {empresa.status}
              </span>
              <strong>{formatBRL(empresa.valorPipeline)}</strong>
              <small>{empresa.oportunidades} oportunidades · {empresa.contatos} contatos</small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhuma empresa cadastrada." />
      )}
    </section>
  )
}

export function CrmEmpresaEditableList({ canWrite = false, empresas }: { canWrite?: boolean; empresas: CrmEmpresa[] }) {
  return (
    <section className="card crm-panel">
      <div className="crm-panel-heading">
        <div>
          <h2>Lista de empresas</h2>
          <p>Contas comerciais vinculadas ao pipeline.</p>
        </div>
      </div>

      {empresas.length ? (
        <div className="crm-table-list">
          {empresas.map((empresa) => (
            <article key={empresa.id}>
              <div>
                <h3>{empresa.nome}</h3>
                <p>{empresa.documento} - {empresa.segmento}</p>
              </div>
              <span className={`crm-pill ${empresa.status === 'ativo' ? 'success' : empresa.status === 'inativo' ? 'danger' : 'primary'}`}>
                {empresa.status}
              </span>
              <strong>{formatBRL(empresa.valorPipeline)}</strong>
              <small>
                {empresa.oportunidades} oportunidades - {empresa.contatos} contatos
                {canWrite ? <Link className="button secondary" href={`/modulos/crm/empresas/${empresa.id}`}>Editar</Link> : null}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhuma empresa cadastrada." />
      )}
    </section>
  )
}

export function CrmEmpresaKpis({ empresas }: { empresas: CrmEmpresa[] }) {
  const totalPipeline = empresas.reduce((sum, empresa) => sum + empresa.valorPipeline, 0)
  const prospectos = empresas.filter((empresa) => empresa.status === 'prospecto').length
  const contatos = empresas.reduce((sum, empresa) => sum + empresa.contatos, 0)

  const items = [
    { label: 'Empresas', value: String(empresas.length), hint: 'base cadastrada' },
    { label: 'Prospectos', value: String(prospectos), hint: 'em relacionamento' },
    { label: 'Vínculos', value: String(contatos), hint: 'empresas x contatos' },
    { label: 'Pipeline', value: formatBRL(totalPipeline), hint: 'valor associado' },
  ]

  return (
    <section className="crm-kpi-grid compact">
      {items.map((item) => (
        <article className="card metric-card" key={item.label}>
          <p className="metric-label">{item.label}</p>
          <p className="metric-value">{item.value}</p>
          <p className="metric-hint">{item.hint}</p>
        </article>
      ))}
    </section>
  )
}

export function CrmListKpis({
  rows,
  secondaryLabel = 'Ativos',
}: {
  rows: CrmListRow[]
  secondaryLabel?: string
}) {
  const success = rows.filter((row) => row.tone === 'success').length
  const warning = rows.filter((row) => row.tone === 'warning').length
  const danger = rows.filter((row) => row.tone === 'danger').length

  return (
    <section className="crm-kpi-grid compact">
      <article className="card metric-card">
        <p className="metric-label">Total</p>
        <p className="metric-value">{rows.length}</p>
        <p className="metric-hint">registros carregados</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">{secondaryLabel}</p>
        <p className="metric-value">{success}</p>
        <p className="metric-hint">status positivo</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Atencao</p>
        <p className="metric-value">{warning}</p>
        <p className="metric-hint">acompanhamento</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Risco</p>
        <p className="metric-value">{danger}</p>
        <p className="metric-hint">corrigir ou revisar</p>
      </article>
    </section>
  )
}

export function CrmGenericList({
  description,
  editHrefBase,
  emptyLabel,
  rows,
  title,
}: {
  description: string
  editHrefBase?: string
  emptyLabel: string
  rows: CrmListRow[]
  title: string
}) {
  return (
    <section className="card crm-panel">
      <div className="crm-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {rows.length ? (
        <div className="crm-table-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <h3>{row.title}</h3>
                <p>{row.subtitle}</p>
              </div>
              <span className={`crm-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
              <strong>{row.value}</strong>
              <small>
                {row.meta}
                {editHrefBase ? <Link className="button secondary" href={`${editHrefBase}/${row.id}`}>Editar</Link> : null}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label={emptyLabel} />
      )}
    </section>
  )
}

export function CrmEmpresaForm({
  action,
  formData,
  empresa,
}: {
  action: (formData: FormData) => Promise<void>
  formData: CrmOpportunityFormData
  empresa?: CrmEmpresaRecord
}) {
  return (
    <form action={action} className="card crm-panel crm-form-grid">
      {empresa ? <input type="hidden" name="id" value={empresa.id} /> : null}

      <div>
        <label className="label" htmlFor="nome">Nome</label>
        <input className="input" id="nome" name="nome" required defaultValue={empresa?.nome ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="documento">Documento</label>
        <input className="input" id="documento" name="documento" defaultValue={empresa?.documento ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select className="select" id="tipo" name="tipo" defaultValue={empresa?.tipo ?? 'PJ'}>
          <option value="PJ">PJ</option>
          <option value="PF">PF</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={empresa?.status ?? 'prospecto'}>
          <option value="prospecto">Prospecto</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="carteira_id">Carteira</label>
        <select className="select" id="carteira_id" name="carteira_id" defaultValue={empresa?.carteira_id ?? ''}>
          <option value="">Sem carteira</option>
          {formData.carteiras.map((carteira) => (
            <option key={carteira.id} value={carteira.id}>{carteira.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="segmento">Segmento</label>
        <input className="input" id="segmento" name="segmento" defaultValue={empresa?.segmento ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="origem">Origem</label>
        <input className="input" id="origem" name="origem" defaultValue={empresa?.origem ?? ''} />
      </div>

      <div className="crm-form-wide">
        <label className="label" htmlFor="observacoes">Observacoes</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={empresa?.observacoes ?? ''} />
      </div>

      <div className="form-actions crm-form-wide">
        <button className="button" type="submit">Salvar empresa</button>
        <Link className="button secondary" href="/modulos/crm/empresas">Cancelar</Link>
      </div>
    </form>
  )
}

export function CrmContatoForm({
  action,
  contato,
}: {
  action: (formData: FormData) => Promise<void>
  contato?: CrmContatoRecord
}) {
  return (
    <form action={action} className="card crm-panel crm-form-grid">
      {contato ? <input type="hidden" name="id" value={contato.id} /> : null}

      <div>
        <label className="label" htmlFor="nome">Nome</label>
        <input className="input" id="nome" name="nome" required defaultValue={contato?.nome ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" defaultValue={contato?.email ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="telefone">Telefone</label>
        <input className="input" id="telefone" name="telefone" defaultValue={contato?.telefone ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="cargo">Cargo</label>
        <input className="input" id="cargo" name="cargo" defaultValue={contato?.cargo ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="origem">Origem</label>
        <input className="input" id="origem" name="origem" defaultValue={contato?.origem ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={contato?.status ?? 'ativo'}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </select>
      </div>

      <div className="form-actions crm-form-wide">
        <button className="button" type="submit">Salvar contato</button>
        <Link className="button secondary" href="/modulos/crm/contatos">Cancelar</Link>
      </div>
    </form>
  )
}

export function CrmPropostaForm({
  action,
  formData,
  proposta,
}: {
  action: (formData: FormData) => Promise<void>
  formData: CrmOpportunityFormData
  proposta?: CrmPropostaRecord
}) {
  return (
    <form action={action} className="card crm-panel crm-form-grid">
      {proposta ? <input type="hidden" name="id" value={proposta.id} /> : null}

      <div>
        <label className="label" htmlFor="titulo">Titulo</label>
        <input className="input" id="titulo" name="titulo" required defaultValue={proposta?.titulo ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="numero">Numero</label>
        <input className="input" id="numero" name="numero" defaultValue={proposta?.numero ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="oportunidade_id">Oportunidade</label>
        <select className="select" id="oportunidade_id" name="oportunidade_id" required defaultValue={proposta?.oportunidade_id ?? ''}>
          <option value="">Selecione</option>
          {formData.oportunidades.map((oportunidade) => (
            <option key={oportunidade.id} value={oportunidade.id}>{oportunidade.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="carteira_id">Carteira</label>
        <select className="select" id="carteira_id" name="carteira_id" defaultValue={proposta?.carteira_id ?? ''}>
          <option value="">Sem carteira</option>
          {formData.carteiras.map((carteira) => (
            <option key={carteira.id} value={carteira.id}>{carteira.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={proposta?.status ?? 'rascunho'}>
          <option value="rascunho">Rascunho</option>
          <option value="enviada">Enviada</option>
          <option value="aprovada">Aprovada</option>
          <option value="recusada">Recusada</option>
          <option value="expirada">Expirada</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="valor_total">Valor total</label>
        <input className="input" id="valor_total" name="valor_total" inputMode="decimal" defaultValue={moneyInput(proposta?.valor_total)} />
      </div>

      <div>
        <label className="label" htmlFor="enviada_em">Enviada em</label>
        <input className="input" id="enviada_em" name="enviada_em" type="datetime-local" defaultValue={dateTimeLocal(proposta?.enviada_em)} />
      </div>

      <div>
        <label className="label" htmlFor="validade_em">Validade</label>
        <input className="input" id="validade_em" name="validade_em" type="date" defaultValue={proposta?.validade_em?.slice(0, 10) ?? ''} />
      </div>

      <div className="crm-form-wide">
        <label className="label" htmlFor="observacoes">Observacoes</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={proposta?.observacoes ?? ''} />
      </div>

      <div className="form-actions crm-form-wide">
        <button className="button" type="submit">Salvar proposta</button>
        <Link className="button secondary" href="/modulos/crm/propostas">Cancelar</Link>
      </div>
    </form>
  )
}

export function CrmAtividadeForm({
  action,
  atividade,
  cancelHref = '/modulos/crm/atividades',
  formData,
  submitLabel = 'Salvar atividade',
}: {
  action: (formData: FormData) => Promise<void>
  atividade?: CrmAtividadeRecord
  cancelHref?: string
  formData: CrmOpportunityFormData
  submitLabel?: string
}) {
  return (
    <form action={action} className="card crm-panel crm-form-grid">
      {atividade ? <input type="hidden" name="id" value={atividade.id} /> : null}

      <div>
        <label className="label" htmlFor="titulo">Titulo</label>
        <input className="input" id="titulo" name="titulo" required defaultValue={atividade?.titulo ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select className="select" id="tipo" name="tipo" defaultValue={atividade?.tipo ?? 'tarefa'}>
          <option value="tarefa">Tarefa</option>
          <option value="ligacao">Ligacao</option>
          <option value="email">E-mail</option>
          <option value="reuniao">Reuniao</option>
          <option value="nota">Nota</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="oportunidade_id">Oportunidade</label>
        <select className="select" id="oportunidade_id" name="oportunidade_id" defaultValue={atividade?.oportunidade_id ?? ''}>
          <option value="">Sem oportunidade</option>
          {formData.oportunidades.map((oportunidade) => (
            <option key={oportunidade.id} value={oportunidade.id}>{oportunidade.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="empresa_id">Empresa</label>
        <select className="select" id="empresa_id" name="empresa_id" defaultValue={atividade?.empresa_id ?? ''}>
          <option value="">Sem empresa</option>
          {formData.empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>{empresa.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="contato_id">Contato</label>
        <select className="select" id="contato_id" name="contato_id" defaultValue={atividade?.contato_id ?? ''}>
          <option value="">Sem contato</option>
          {formData.contatos.map((contato) => (
            <option key={contato.id} value={contato.id}>{contato.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="carteira_id">Carteira</label>
        <select className="select" id="carteira_id" name="carteira_id" defaultValue={atividade?.carteira_id ?? ''}>
          <option value="">Sem carteira</option>
          {formData.carteiras.map((carteira) => (
            <option key={carteira.id} value={carteira.id}>{carteira.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="prazo_em">Prazo</label>
        <input className="input" id="prazo_em" name="prazo_em" type="datetime-local" defaultValue={dateTimeLocal(atividade?.prazo_em)} />
      </div>

      <div>
        <label className="label" htmlFor="realizada_em">Realizada em</label>
        <input className="input" id="realizada_em" name="realizada_em" type="datetime-local" defaultValue={dateTimeLocal(atividade?.realizada_em)} />
      </div>

      <label className="checkbox-row crm-form-wide">
        <input name="concluida" type="checkbox" defaultChecked={atividade?.concluida ?? false} />
        <span>Atividade concluida</span>
      </label>

      <div className="crm-form-wide">
        <label className="label" htmlFor="descricao">Descricao</label>
        <textarea className="textarea" id="descricao" name="descricao" defaultValue={atividade?.descricao ?? ''} />
      </div>

      <div className="form-actions crm-form-wide">
        <button className="button" type="submit">{submitLabel}</button>
        <Link className="button secondary" href={cancelHref}>Cancelar</Link>
      </div>
    </form>
  )
}

export function EmptyBlock({ label }: { label: string }) {
  return <div className="crm-empty-block">{label}</div>
}
