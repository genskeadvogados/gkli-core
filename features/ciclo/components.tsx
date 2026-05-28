import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { formatDate, priorityLabel, priorityScore, riskTone } from '@/features/ciclo/scoring'
import type {
  CicloAlerta,
  CicloAlertaRecord,
  CicloAdministradoraRecord,
  CicloAtaRecord,
  CicloCliente,
  CicloClienteFormData,
  CicloClienteIntegral,
  CicloClienteRecord,
  CicloContratoRecord,
  CicloData,
  CicloDocumento,
  CicloDocumentoFormData,
  CicloDocumentoRecord,
  CicloImportacaoItem,
  CicloImportacaoLote,
  CicloListRow,
  CicloOnboardingDetail,
  CicloOcorrenciaRecord,
} from '@/features/ciclo/types'
import {
  completeCicloOnboardingAction,
  resolveCicloAlertaAction,
  startCicloOnboardingAction,
  updateCicloOnboardingDocumentoAction,
} from '@/features/ciclo/actions'

const cicloDocumentoTipos = [
  ['contrato', 'Contrato'],
  ['cartao_cnpj', 'Cartao CNPJ'],
  ['ata_eleicao', 'Ata eleicao'],
  ['ata_previsao_orcamentaria', 'Ata previsao orcamentaria'],
  ['cpf_sindico', 'CPF sindico'],
  ['cnpj_empresa_sindico', 'CNPJ empresa sindico'],
  ['convencao', 'Convencao'],
  ['regulamento', 'Regulamento'],
  ['cadastro_unidade', 'Cadastro de unidade'],
]

const cicloAlertaSeveridades = [
  ['baixa', 'Baixa'],
  ['media', 'Media'],
  ['alta', 'Alta'],
  ['critica', 'Critica'],
]

function impactoTone(value: string) {
  if (value === 'critico' || value === 'alto') return 'danger'
  if (value === 'medio' || value === 'neutro') return 'warning'
  if (value === 'baixo') return 'success'
  return 'primary'
}
import type { PlatformUsuario } from '@/lib/auth/platform'

type CicloTab =
  | 'cockpit'
  | 'dashboard'
  | 'clientes'
  | 'administradoras'
  | 'importacoes'
  | 'documentos'
  | 'alertas'
  | 'onboarding'
  | 'regularidade'
  | 'timeline'
  | 'ocorrencias'
  | 'contratos'
  | 'atas'

const activeHref: Record<CicloTab, string> = {
  cockpit: '/modulos/ciclo',
  dashboard: '/modulos/ciclo/dashboard',
  clientes: '/modulos/ciclo/clientes',
  administradoras: '/modulos/ciclo/administradoras',
  importacoes: '/modulos/ciclo/importacoes',
  documentos: '/modulos/ciclo/documentos',
  alertas: '/modulos/ciclo/alertas',
  onboarding: '/modulos/ciclo/onboarding',
  regularidade: '/modulos/ciclo/regularidade',
  timeline: '/modulos/ciclo/timeline',
  ocorrencias: '/modulos/ciclo/ocorrencias',
  contratos: '/modulos/ciclo/contratos',
  atas: '/modulos/ciclo/atas',
}

const navGroups: ModuleNavGroup[] = [
  {
    title: 'Cockpit',
    items: [
      { href: '/modulos/ciclo', label: 'Cockpit' },
      { href: '/modulos/ciclo/dashboard', label: 'Dashboard' },
    ],
  },
  {
    title: 'Base cadastral',
    items: [
      { href: '/modulos/ciclo/clientes', label: 'Clientes' },
      { href: '/modulos/ciclo/administradoras', label: 'Administradoras' },
      { href: '/modulos/ciclo/importacoes', label: 'Importações' },
    ],
  },
  {
    title: 'Operacao',
    items: [
      { href: '/modulos/ciclo/documentos', label: 'Documentos' },
      { href: '/modulos/ciclo/alertas', label: 'Alertas' },
      { href: '/modulos/ciclo/onboarding', label: 'Onboarding' },
      { href: '/modulos/ciclo/regularidade', label: 'Regularidade' },
      { href: '/modulos/ciclo/timeline', label: 'Timeline' },
      { href: '/modulos/ciclo/ocorrencias', label: 'Ocorrencias' },
    ],
  },
  {
    title: 'Documentos juridicos',
    items: [
      { href: '/modulos/ciclo/contratos', label: 'Contratos' },
      { href: '/modulos/ciclo/atas', label: 'Atas' },
    ],
  },
]

export function CicloShell({
  active,
  actions,
  children,
  description,
  eyebrow,
  title,
  usuario,
}: {
  active: CicloTab
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
      brand="CI"
      description={description}
      eyebrow={eyebrow}
      navGroups={navGroups}
      product="GKLI Ciclo"
      title={title}
      usuario={usuario}
    >
      {children}
    </ModuleShell>
  )
}

export function CicloReadinessCard({ data }: { data: CicloData }) {
  if (data.databaseReady || data.clientes.length || data.documentos.length || data.alertas.length) return null

  return (
    <section className="ciclo-empty-card">
      <strong>Ciclo pronto para iniciar</strong>
      <span>Cadastre clientes e documentos para alimentar a regularidade, alertas e timeline operacional.</span>
    </section>
  )
}

export function CicloKpis({ data }: { data: CicloData }) {
  const ativos = data.clientes.filter((cliente) => cliente.status === 'ativo').length
  const implantacao = data.clientes.filter((cliente) => cliente.status === 'novo' || cliente.status === 'implantacao').length
  const altoRisco = data.clientes.filter((cliente) => cliente.risco === 'alto' || cliente.risco === 'critico').length
  const alertasAbertos = data.alertas.filter((alerta) => alerta.status !== 'resolvido' && alerta.status !== 'cancelado').length
  const scoreMedio = data.clientes.length
    ? Math.round(data.clientes.reduce((sum, cliente) => sum + cliente.score, 0) / data.clientes.length)
    : 0
  const regularidadeMedia = data.clientes.length
    ? Math.round(data.clientes.reduce((sum, cliente) => sum + cliente.regularidade, 0) / data.clientes.length)
    : 0

  const items = [
    { label: 'Clientes ativos', value: String(ativos), hint: 'base operacional' },
    { label: 'Em implantação', value: String(implantacao), hint: 'onboarding e novos' },
    { label: 'Risco alto', value: String(altoRisco), hint: 'atenção imediata' },
    { label: 'Alertas abertos', value: String(alertasAbertos), hint: 'fila operacional' },
    { label: 'Score médio', value: String(scoreMedio), hint: '0 a 100' },
    { label: 'Regularidade', value: `${regularidadeMedia}%`, hint: 'documental média' },
  ]

  return (
    <section className="ciclo-kpi-grid">
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

export function CicloPriorityList({ clientes }: { clientes: CicloCliente[] }) {
  const rows = [...clientes].sort((a, b) => priorityScore(b) - priorityScore(a)).slice(0, 8)

  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>Clientes prioritários</h2>
          <p>Fila por risco, score, regularidade, alertas e temperatura.</p>
        </div>
        <Link className="button secondary" href="/modulos/ciclo/clientes">Ver clientes</Link>
      </div>

      {rows.length ? (
        <div className="ciclo-ranking-list">
          {rows.map((cliente, index) => (
            <article key={cliente.id}>
              <span className="ciclo-rank-number">{index + 1}</span>
              <div>
                <h3>{cliente.nome}</h3>
                <p>{cliente.documento} · {cliente.carteira} · {cliente.administradora}</p>
              </div>
              <span className={`ciclo-pill ${riskTone(cliente.risco)}`}>{priorityLabel(cliente)}</span>
              <div className="ciclo-ranking-meta">
                <strong>{cliente.regularidade}%</strong>
                <span>score {cliente.score} · {cliente.alertasAbertos} alerta(s)</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum cliente cadastrado." />
      )}
    </section>
  )
}

export function CicloDocumentSignal({ documentos }: { documentos: CicloDocumento[] }) {
  const pendentes = documentos.filter((doc) => doc.status === 'pendente' || doc.status === 'vencido')
  const obrigatorios = documentos.filter((doc) => doc.obrigatorio)
  const validos = documentos.filter((doc) => doc.status === 'validado' || doc.validado)
  const cards = [
    { title: 'Pendentes', value: pendentes.length, tone: 'warning', desc: 'exigem regularização' },
    { title: 'Obrigatórios', value: obrigatorios.length, tone: 'primary', desc: 'na matriz documental' },
    { title: 'Validados', value: validos.length, tone: 'success', desc: 'prontos para operação' },
  ]

  return (
    <section className="ciclo-signal-grid">
      {cards.map((card) => (
        <article className="card ciclo-signal-card" key={card.title}>
          <span className={`ciclo-pill ${card.tone}`}>{card.title}</span>
          <strong>{card.value}</strong>
          <p>{card.desc}</p>
        </article>
      ))}
    </section>
  )
}

export function CicloAlertList({ alertas, canWrite = false }: { alertas: CicloAlerta[]; canWrite?: boolean }) {
  const rows = alertas.filter((alerta) => alerta.status !== 'resolvido' && alerta.status !== 'cancelado').slice(0, 8)

  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>Alertas recentes</h2>
          <p>Fila de risco operacional, documentação e acompanhamento.</p>
        </div>
        <Link className="button secondary" href="/modulos/ciclo/alertas">Ver alertas</Link>
      </div>

      {rows.length ? (
        <div className="ciclo-alert-list">
          {rows.map((alerta) => (
            <article key={alerta.id}>
              <span className={`ciclo-pill ${riskTone(alerta.severidade)}`}>{alerta.severidade}</span>
              <div>
                <h3>{alerta.titulo}</h3>
                <p>{alerta.cliente} · {alerta.descricao || alerta.tipo}</p>
              </div>
              <small>{formatDate(alerta.vencimentoEm)}</small>
              {canWrite ? (
                <form action={resolveCicloAlertaAction}>
                  <input type="hidden" name="id" value={alerta.id} />
                  <input type="hidden" name="titulo" value={alerta.titulo} />
                  <button className="button secondary" type="submit">Resolver</button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum alerta aberto." />
      )}
    </section>
  )
}

export function CicloClienteList({ canWrite = false, clientes }: { canWrite?: boolean; clientes: CicloCliente[] }) {
  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>Lista de clientes</h2>
          <p>Cadastro mestre com carteira, administradora, risco e regularidade.</p>
        </div>
      </div>

      {clientes.length ? (
        <div className="ciclo-table-list">
          {clientes.map((cliente) => (
            <article key={cliente.id}>
              <div>
                <h3>{cliente.nome}</h3>
                <p>{cliente.documento} · {cliente.razaoSocial || 'Cadastro mestre'}</p>
              </div>
              <span className={`ciclo-pill ${riskTone(cliente.risco)}`}>{cliente.risco}</span>
              <strong>{cliente.regularidade}%</strong>
              <small>
                {cliente.carteira} - {cliente.administradora}
                <Link className="button secondary" href={`/modulos/ciclo/clientes/${cliente.id}/cockpit`}>Cockpit</Link>
                {canWrite ? <Link className="button secondary" href={`/modulos/ciclo/clientes/${cliente.id}`}>Editar</Link> : null}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum cliente cadastrado." />
      )}
    </section>
  )
}

export function CicloDocumentoList({ canWrite = false, documentos }: { canWrite?: boolean; documentos: CicloDocumento[] }) {
  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>Documentos operacionais</h2>
          <p>Checklist documental por cliente, status e vencimento.</p>
        </div>
      </div>

      {documentos.length ? (
        <div className="ciclo-table-list docs">
          {documentos.map((documento) => (
            <article key={documento.id}>
              <div>
                <h3>{documento.titulo}</h3>
                <p>{documento.cliente} · {documento.tipo}</p>
              </div>
              <span className={`ciclo-pill ${riskTone(documento.status)}`}>{documento.status}</span>
              <strong>{documento.obrigatorio ? 'Obrigatório' : 'Opcional'}</strong>
              <small>
                {formatDate(documento.dataRenovacao)}
                {canWrite ? <Link className="button secondary" href={`/modulos/ciclo/documentos/${documento.id}`}>Editar</Link> : null}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum documento cadastrado." />
      )}
    </section>
  )
}

export function CicloClienteForm({
  action,
  cliente,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  cliente?: CicloClienteRecord
  formData: CicloClienteFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}

      <div>
        <label className="label" htmlFor="nome">Nome operacional</label>
        <input className="input" id="nome" name="nome" required defaultValue={cliente?.nome ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="nome_fantasia">Nome fantasia</label>
        <input className="input" id="nome_fantasia" name="nome_fantasia" defaultValue={cliente?.nome_fantasia ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="razao_social">Razao social</label>
        <input className="input" id="razao_social" name="razao_social" defaultValue={cliente?.razao_social ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="documento">Documento</label>
        <input className="input" id="documento" name="documento" defaultValue={cliente?.documento ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="carteira_id">Carteira</label>
        <select className="select" id="carteira_id" name="carteira_id" defaultValue={cliente?.carteira_id ?? ''}>
          <option value="">Sem carteira</option>
          {formData.carteiras.map((carteira) => (
            <option key={carteira.id} value={carteira.id}>{carteira.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="administradora_id">Administradora</label>
        <select className="select" id="administradora_id" name="administradora_id" defaultValue={cliente?.administradora_id ?? ''}>
          <option value="">Sem administradora</option>
          {formData.administradoras.map((administradora) => (
            <option key={administradora.id} value={administradora.id}>{administradora.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status_operacional">Status operacional</label>
        <select className="select" id="status_operacional" name="status_operacional" defaultValue={cliente?.status_operacional ?? 'novo'}>
          <option value="novo">Novo</option>
          <option value="implantacao">Implantacao</option>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="encerrado">Encerrado</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="score_atual">Score</label>
        <input className="input" id="score_atual" name="score_atual" type="number" min={0} max={100} defaultValue={cliente?.score_atual ?? 75} />
      </div>

      <div>
        <label className="label" htmlFor="risco_atual">Risco</label>
        <select className="select" id="risco_atual" name="risco_atual" defaultValue={cliente?.risco_atual ?? 'medio'}>
          <option value="baixo">Baixo</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
          <option value="critico">Critico</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="temperatura">Temperatura</label>
        <select className="select" id="temperatura" name="temperatura" defaultValue={cliente?.temperatura ?? 'neutro'}>
          <option value="quente">Quente</option>
          <option value="neutro">Neutro</option>
          <option value="frio">Frio</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" defaultValue={cliente?.email ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="telefone">Telefone</label>
        <input className="input" id="telefone" name="telefone" defaultValue={cliente?.telefone ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="cidade">Cidade</label>
        <input className="input" id="cidade" name="cidade" defaultValue={cliente?.cidade ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="estado">Estado</label>
        <input className="input" id="estado" name="estado" maxLength={2} defaultValue={cliente?.estado ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="pasta_url">Pasta operacional</label>
        <input className="input" id="pasta_url" name="pasta_url" defaultValue={cliente?.pasta_url ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observacoes</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={cliente?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" value="on" defaultChecked={cliente?.ativo ?? true} />
        <span>Cliente ativo no Ciclo</span>
      </label>

      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar cliente</button>
        <Link className="button secondary" href="/modulos/ciclo/clientes">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloAdministradoraForm({
  action,
  administradora,
}: {
  action: (formData: FormData) => Promise<void>
  administradora?: CicloAdministradoraRecord
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {administradora ? <input type="hidden" name="id" value={administradora.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="nome">Nome</label>
        <input className="input" id="nome" name="nome" required defaultValue={administradora?.nome ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="documento">Documento</label>
        <input className="input" id="documento" name="documento" defaultValue={administradora?.documento ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" defaultValue={administradora?.email ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="telefone">Telefone</label>
        <input className="input" id="telefone" name="telefone" defaultValue={administradora?.telefone ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="site">Site</label>
        <input className="input" id="site" name="site" defaultValue={administradora?.site ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observacoes</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={administradora?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" value="on" defaultChecked={administradora?.ativo ?? true} />
        <span>Administradora ativa</span>
      </label>

      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar administradora</button>
        <Link className="button secondary" href="/modulos/ciclo/administradoras">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloDocumentoForm({
  action,
  documento,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  documento?: CicloDocumentoRecord
  formData: CicloDocumentoFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {documento ? <input type="hidden" name="id" value={documento.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" required defaultValue={documento?.cliente_id ?? ''}>
          <option value="">Selecione</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tipo_documento">Tipo</label>
        <select className="select" id="tipo_documento" name="tipo_documento" required defaultValue={documento?.tipo_documento ?? ''}>
          <option value="">Selecione</option>
          {cicloDocumentoTipos.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="titulo">Titulo</label>
        <input className="input" id="titulo" name="titulo" defaultValue={documento?.titulo ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={documento?.status ?? 'pendente'}>
          <option value="pendente">Pendente</option>
          <option value="recebido">Recebido</option>
          <option value="validado">Validado</option>
          <option value="vencido">Vencido</option>
          <option value="dispensado">Dispensado</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="data_assinatura">Data assinatura</label>
        <input className="input" id="data_assinatura" name="data_assinatura" type="date" defaultValue={documento?.data_assinatura ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_realizacao">Data realizacao</label>
        <input className="input" id="data_realizacao" name="data_realizacao" type="date" defaultValue={documento?.data_realizacao ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_renovacao">Data vencimento</label>
        <input className="input" id="data_renovacao" name="data_renovacao" type="date" defaultValue={documento?.data_renovacao ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="arquivo_url">Link do arquivo</label>
        <input className="input" id="arquivo_url" name="arquivo_url" defaultValue={documento?.arquivo_url ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observacoes</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={documento?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row">
        <input name="obrigatorio" type="checkbox" value="on" defaultChecked={documento?.obrigatorio ?? true} />
        <span>Obrigatorio</span>
      </label>

      <label className="checkbox-row">
        <input name="aplicavel" type="checkbox" value="on" defaultChecked={documento?.aplicavel ?? true} />
        <span>Aplicavel</span>
      </label>

      <label className="checkbox-row">
        <input name="validado" type="checkbox" value="on" defaultChecked={documento?.validado ?? false} />
        <span>Validado</span>
      </label>

      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar documento</button>
        <Link className="button secondary" href="/modulos/ciclo/documentos">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloAlertaForm({
  action,
  alerta,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  alerta?: CicloAlertaRecord
  formData: CicloDocumentoFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {alerta ? <input type="hidden" name="id" value={alerta.id} /> : null}
      <input type="hidden" name="origem" value={alerta?.origem ?? 'manual'} />
      <input type="hidden" name="referencia_id" value={alerta?.referencia_id ?? ''} />

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" defaultValue={alerta?.cliente_id ?? ''}>
          <option value="">Sem cliente vinculado</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select className="select" id="tipo" name="tipo" defaultValue={alerta?.tipo ?? 'operacional'}>
          <option value="operacional">Operacional</option>
          <option value="documental">Documental</option>
          <option value="prazo">Prazo</option>
          <option value="risco">Risco</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="severidade">Severidade</label>
        <select className="select" id="severidade" name="severidade" defaultValue={alerta?.severidade ?? 'media'}>
          {cicloAlertaSeveridades.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={alerta?.status ?? 'aberto'}>
          <option value="aberto">Aberto</option>
          <option value="em_tratamento">Em tratamento</option>
          <option value="resolvido">Resolvido</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="vencimento_em">Vencimento</label>
        <input className="input" id="vencimento_em" name="vencimento_em" type="datetime-local" defaultValue={alerta?.vencimento_em ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="titulo">Titulo</label>
        <input className="input" id="titulo" name="titulo" required defaultValue={alerta?.titulo ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="descricao">Descricao</label>
        <textarea className="textarea" id="descricao" name="descricao" defaultValue={alerta?.descricao ?? ''} />
      </div>

      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar alerta</button>
        <Link className="button secondary" href="/modulos/ciclo/alertas">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloOcorrenciaForm({
  action,
  formData,
  ocorrencia,
}: {
  action: (formData: FormData) => Promise<void>
  formData: CicloDocumentoFormData
  ocorrencia?: CicloOcorrenciaRecord
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {ocorrencia ? <input type="hidden" name="id" value={ocorrencia.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" defaultValue={ocorrencia?.cliente_id ?? ''}>
          <option value="">Sem cliente vinculado</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select className="select" id="tipo" name="tipo" defaultValue={ocorrencia?.tipo ?? 'operacional'}>
          <option value="operacional">Operacional</option>
          <option value="documental">Documental</option>
          <option value="financeiro">Financeiro</option>
          <option value="relacionamento">Relacionamento</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="impacto">Impacto</label>
        <select className="select" id="impacto" name="impacto" defaultValue={ocorrencia?.impacto ?? 'neutro'}>
          <option value="baixo">Baixo</option>
          <option value="neutro">Neutro</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
          <option value="critico">Critico</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={ocorrencia?.status ?? 'aberta'}>
          <option value="aberta">Aberta</option>
          <option value="em_tratamento">Em tratamento</option>
          <option value="resolvida">Resolvida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="data_ocorrencia">Data</label>
        <input className="input" id="data_ocorrencia" name="data_ocorrencia" type="date" defaultValue={ocorrencia?.data_ocorrencia ?? new Date().toISOString().slice(0, 10)} />
      </div>

      <div>
        <label className="label" htmlFor="prazo">Prazo</label>
        <input className="input" id="prazo" name="prazo" type="date" defaultValue={ocorrencia?.prazo ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="responsavel">Responsavel</label>
        <input className="input" id="responsavel" name="responsavel" defaultValue={ocorrencia?.responsavel ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="peso">Peso</label>
        <input className="input" id="peso" name="peso" type="number" min={1} max={10} defaultValue={ocorrencia?.peso ?? 1} />
      </div>

      <div>
        <label className="label" htmlFor="impacto_score">Impacto score</label>
        <input className="input" id="impacto_score" name="impacto_score" type="number" min={-100} max={100} defaultValue={ocorrencia?.impacto_score ?? 0} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="titulo">Titulo</label>
        <input className="input" id="titulo" name="titulo" required defaultValue={ocorrencia?.titulo ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="descricao">Descricao</label>
        <textarea className="textarea" id="descricao" name="descricao" defaultValue={ocorrencia?.descricao ?? ''} />
      </div>

      {!ocorrencia ? (
        <label className="checkbox-row module-form-wide">
          <input name="criar_alerta" type="checkbox" value="on" defaultChecked />
          <span>Criar alerta para acompanhamento</span>
        </label>
      ) : null}

      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar ocorrencia</button>
        <Link className="button secondary" href="/modulos/ciclo/ocorrencias">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloContratoForm({
  action,
  contrato,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  contrato?: CicloContratoRecord
  formData: CicloDocumentoFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {contrato ? <input type="hidden" name="id" value={contrato.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" defaultValue={contrato?.cliente_id ?? ''}>
          <option value="">Sem cliente vinculado</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="numero_contrato">Numero</label>
        <input className="input" id="numero_contrato" name="numero_contrato" defaultValue={contrato?.numero_contrato ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={contrato?.status ?? 'ativo'}>
          <option value="ativo">Ativo</option>
          <option value="vigente">Vigente</option>
          <option value="renovacao">Renovacao</option>
          <option value="encerrado">Encerrado</option>
          <option value="suspenso">Suspenso</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="data_assinatura">Assinatura</label>
        <input className="input" id="data_assinatura" name="data_assinatura" type="date" defaultValue={contrato?.data_assinatura ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_inicio">Inicio</label>
        <input className="input" id="data_inicio" name="data_inicio" type="date" defaultValue={contrato?.data_inicio ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_fim">Fim</label>
        <input className="input" id="data_fim" name="data_fim" type="date" defaultValue={contrato?.data_fim ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="valor">Valor</label>
        <input className="input" id="valor" name="valor" inputMode="decimal" defaultValue={contrato?.valor ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="indice_reajuste">Indice reajuste</label>
        <input className="input" id="indice_reajuste" name="indice_reajuste" defaultValue={contrato?.indice_reajuste ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="proximo_reajuste">Proximo reajuste</label>
        <input className="input" id="proximo_reajuste" name="proximo_reajuste" type="date" defaultValue={contrato?.proximo_reajuste ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observacoes</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={contrato?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" value="on" defaultChecked={contrato?.ativo ?? true} />
        <span>Contrato ativo</span>
      </label>

      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar contrato</button>
        <Link className="button secondary" href="/modulos/ciclo/contratos">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloAtaForm({
  action,
  ata,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  ata?: CicloAtaRecord
  formData: CicloDocumentoFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {ata ? <input type="hidden" name="id" value={ata.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" defaultValue={ata?.cliente_id ?? ''}>
          <option value="">Sem cliente vinculado</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select className="select" id="tipo" name="tipo" required defaultValue={ata?.tipo ?? 'ata_eleicao'}>
          <option value="ata_eleicao">Ata eleicao</option>
          <option value="ata_previsao_orcamentaria">Ata previsao orcamentaria</option>
          <option value="assembleia_ordinaria">Assembleia ordinaria</option>
          <option value="assembleia_extraordinaria">Assembleia extraordinaria</option>
          <option value="outra">Outra</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={ata?.status ?? 'vigente'}>
          <option value="vigente">Vigente</option>
          <option value="pendente">Pendente</option>
          <option value="vencida">Vencida</option>
          <option value="substituida">Substituida</option>
          <option value="dispensada">Dispensada</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="data_ata">Data da ata</label>
        <input className="input" id="data_ata" name="data_ata" type="date" defaultValue={ata?.data_ata ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_validade">Validade</label>
        <input className="input" id="data_validade" name="data_validade" type="date" defaultValue={ata?.data_validade ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observacoes</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={ata?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" value="on" defaultChecked={ata?.ativo ?? true} />
        <span>Ata ativa</span>
      </label>

      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar ata</button>
        <Link className="button secondary" href="/modulos/ciclo/atas">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloClienteIntegralCockpit({ detail }: { detail: CicloClienteIntegral }) {
  const { alertas, atas, cliente, contratos, documentos, ocorrencias, pendencias, regularidade, timeline } = detail
  const alertasAbertos = alertas.filter((alerta) => alerta.status !== 'resolvido' && alerta.status !== 'cancelado')
  const ocorrenciasAbertas = ocorrencias.filter((ocorrencia) => !['resolvida', 'cancelada'].includes(ocorrencia.status))
  const documentosPendentes = documentos.filter((documento) => documento.status === 'pendente' || documento.status === 'vencido')
  const contratosAtivos = contratos.filter((contrato) => contrato.ativo && !['encerrado', 'suspenso'].includes(contrato.status))
  const atasVigentes = atas.filter((ata) => ata.ativo && ata.status === 'vigente')

  const kpis = [
    { label: 'Regularidade', value: `${regularidade}%`, hint: `${pendencias.length} pendencia(s)` },
    { label: 'Score', value: String(cliente.score_atual), hint: `risco ${cliente.risco_atual}` },
    { label: 'Alertas', value: String(alertasAbertos.length), hint: 'em aberto' },
    { label: 'Ocorrencias', value: String(ocorrenciasAbertas.length), hint: 'em acompanhamento' },
    { label: 'Contratos', value: String(contratosAtivos.length), hint: 'ativos' },
    { label: 'Atas', value: String(atasVigentes.length), hint: 'vigentes' },
  ]

  return (
    <>
      <section className="card ciclo-panel ciclo-integral-hero">
        <div>
          <span className={`ciclo-pill ${riskTone(cliente.risco_atual)}`}>{cliente.risco_atual}</span>
          <h2>{cliente.nome}</h2>
          <p>{cliente.documento ?? 'Sem documento'} - {detail.carteira} - {detail.administradora}</p>
        </div>
        <div className="ciclo-quick-actions">
          <Link className="button secondary" href={`/modulos/ciclo/clientes/${cliente.id}`}>Editar cliente</Link>
          <Link className="button secondary" href="/modulos/ciclo/documentos/novo">Novo documento</Link>
          <Link className="button secondary" href="/modulos/ciclo/ocorrencias/nova">Nova ocorrencia</Link>
          <Link className="button secondary" href="/modulos/ciclo/alertas/novo">Novo alerta</Link>
        </div>
      </section>

      <section className="ciclo-kpi-grid">
        {kpis.map((item) => (
          <article className="card metric-card" key={item.label}>
            <p className="metric-label">{item.label}</p>
            <p className="metric-value">{item.value}</p>
            <p className="metric-hint">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="ciclo-split-grid">
        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Pendencias acionaveis</h2>
              <p>Itens que pedem acompanhamento imediato.</p>
            </div>
          </div>
          {pendencias.length || documentosPendentes.length || alertasAbertos.length ? (
            <div className="ciclo-table-list compact">
              {pendencias.slice(0, 5).map((pendencia) => (
                <article key={pendencia}>
                  <div>
                    <h3>{pendencia}</h3>
                    <p>Regularidade documental</p>
                  </div>
                  <span className="ciclo-pill warning">pendente</span>
                  <strong>Doc</strong>
                  <small>regularidade</small>
                </article>
              ))}
              {alertasAbertos.slice(0, 5).map((alerta) => (
                <article key={alerta.id}>
                  <div>
                    <h3>{alerta.titulo}</h3>
                    <p>{alerta.descricao ?? alerta.tipo}</p>
                  </div>
                  <span className={`ciclo-pill ${riskTone(alerta.severidade)}`}>{alerta.severidade}</span>
                  <strong>{alerta.status}</strong>
                  <small>{formatDate(alerta.vencimento_em ?? '')}</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyBlock label="Nenhuma pendencia aberta para este cliente." />
          )}
        </section>

        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Timeline recente</h2>
              <p>Movimentos operacionais registrados.</p>
            </div>
          </div>
          {timeline.length ? (
            <div className="ciclo-table-list compact">
              {timeline.slice(0, 8).map((item) => (
                <article key={item.id}>
                  <div>
                    <h3>{item.titulo}</h3>
                    <p>{item.descricao || item.cliente}</p>
                  </div>
                  <span className="ciclo-pill primary">{item.tipo}</span>
                  <strong>{formatDate(item.createdAt)}</strong>
                  <small>evento</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyBlock label="Nenhum evento registrado." />
          )}
        </section>
      </section>

      <section className="ciclo-integral-grid">
        <CicloIntegralList
          empty="Nenhum documento cadastrado."
          items={documentos.slice(0, 8).map((documento) => ({
            href: `/modulos/ciclo/documentos/${documento.id}`,
            meta: formatDate(documento.data_renovacao ?? ''),
            status: documento.status,
            title: documento.titulo ?? documento.tipo_documento,
            tone: riskTone(documento.status),
            value: documento.obrigatorio ? 'Obrigatorio' : 'Opcional',
          }))}
          title="Documentos"
        />
        <CicloIntegralList
          empty="Nenhuma ocorrencia registrada."
          items={ocorrencias.slice(0, 8).map((ocorrencia) => ({
            href: `/modulos/ciclo/ocorrencias/${ocorrencia.id}`,
            meta: ocorrencia.responsavel ?? 'Sem responsavel',
            status: ocorrencia.status,
            title: ocorrencia.titulo,
            tone: impactoTone(ocorrencia.impacto),
            value: formatDate(ocorrencia.data_ocorrencia),
          }))}
          title="Ocorrencias"
        />
        <CicloIntegralList
          empty="Nenhum contrato cadastrado."
          items={contratos.slice(0, 8).map((contrato) => ({
            href: `/modulos/ciclo/contratos/${contrato.id}`,
            meta: `Reajuste ${formatDate(contrato.proximo_reajuste ?? '')}`,
            status: contrato.status,
            title: contrato.numero_contrato ?? 'Contrato',
            tone: contrato.ativo ? 'success' : 'warning',
            value: formatDate(contrato.data_fim ?? ''),
          }))}
          title="Contratos"
        />
        <CicloIntegralList
          empty="Nenhuma ata cadastrada."
          items={atas.slice(0, 8).map((ata) => ({
            href: `/modulos/ciclo/atas/${ata.id}`,
            meta: formatDate(ata.data_ata ?? ''),
            status: ata.status,
            title: ata.tipo ?? 'Ata',
            tone: ata.status === 'vigente' ? 'success' : 'warning',
            value: formatDate(ata.data_validade ?? ''),
          }))}
          title="Atas"
        />
      </section>
    </>
  )
}

function CicloIntegralList({
  empty,
  items,
  title,
}: {
  empty: string
  items: Array<{ href: string; meta: string; status: string; title: string; tone?: string; value: string }>
  title: string
}) {
  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>Resumo vinculado ao cliente.</p>
        </div>
      </div>
      {items.length ? (
        <div className="ciclo-table-list compact">
          {items.map((item) => (
            <article key={item.href}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.meta}</p>
              </div>
              <span className={`ciclo-pill ${item.tone ?? 'primary'}`}>{item.status}</span>
              <strong>{item.value}</strong>
              <small><Link className="button secondary" href={item.href}>Abrir</Link></small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label={empty} />
      )}
    </section>
  )
}

export function CicloOnboardingDetalhe({ detail }: { detail: CicloOnboardingDetail }) {
  const { cliente, documentos, progresso, timeline } = detail
  const canConcluir = progresso.total > 0 && progresso.pendentes === 0

  return (
    <>
      <section className="ciclo-kpi-grid">
        <article className="card metric-card">
          <p className="metric-label">Progresso</p>
          <p className="metric-value">{progresso.percentual}%</p>
          <p className="metric-hint">{progresso.concluidos}/{progresso.total} documentos</p>
        </article>
        <article className="card metric-card">
          <p className="metric-label">Status</p>
          <p className="metric-value">{cliente.status_operacional}</p>
          <p className="metric-hint">etapa operacional</p>
        </article>
        <article className="card metric-card">
          <p className="metric-label">Pendencias</p>
          <p className="metric-value">{progresso.pendentes}</p>
          <p className="metric-hint">obrigatorias abertas</p>
        </article>
        <article className="card metric-card">
          <p className="metric-label">Risco</p>
          <p className="metric-value">{cliente.risco_atual}</p>
          <p className="metric-hint">score {cliente.score_atual}</p>
        </article>
      </section>

      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Checklist operacional</h2>
            <p>{cliente.nome} - {cliente.documento ?? 'sem documento'}</p>
          </div>
          <div className="form-actions">
            <form action={startCicloOnboardingAction}>
              <input type="hidden" name="cliente_id" value={cliente.id} />
              <button className="button secondary" type="submit">Iniciar checklist</button>
            </form>
            <form action={completeCicloOnboardingAction}>
              <input type="hidden" name="cliente_id" value={cliente.id} />
              <button className="button" disabled={!canConcluir} type="submit">Concluir onboarding</button>
            </form>
          </div>
        </div>

        {documentos.length ? (
          <div className="ciclo-document-form-list">
            {documentos.map((documento) => (
              <form action={updateCicloOnboardingDocumentoAction} className="ciclo-document-form" key={documento.id}>
                <input type="hidden" name="id" value={documento.id} />
                <input type="hidden" name="cliente_id" value={cliente.id} />
                <div>
                  <h3>{documento.titulo ?? documento.tipo_documento}</h3>
                  <p>{documento.tipo_documento}</p>
                </div>
                <select className="select" name="status" defaultValue={documento.status}>
                  <option value="pendente">Pendente</option>
                  <option value="recebido">Recebido</option>
                  <option value="validado">Validado</option>
                  <option value="vencido">Vencido</option>
                  <option value="dispensado">Dispensado</option>
                </select>
                <input className="input" name="data_renovacao" type="date" defaultValue={documento.data_renovacao ?? ''} />
                <input className="input" name="arquivo_url" placeholder="Link do arquivo" defaultValue={documento.arquivo_url ?? ''} />
                <textarea className="textarea" name="observacoes" placeholder="Observacoes" defaultValue={documento.observacoes ?? ''} />
                <label className="checkbox-row">
                  <input name="validado" type="checkbox" defaultChecked={documento.validado} />
                  <span>Validado</span>
                </label>
                <button className="button secondary" type="submit">Atualizar</button>
              </form>
            ))}
          </div>
        ) : (
          <EmptyBlock label="Checklist ainda nao iniciado." />
        )}
      </section>

      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Timeline</h2>
            <p>Eventos recentes do onboarding.</p>
          </div>
          <Link className="button secondary" href="/modulos/ciclo/onboarding">Voltar</Link>
        </div>
        {timeline.length ? (
          <div className="ciclo-table-list">
            {timeline.map((item) => (
              <article key={item.id}>
                <div>
                  <h3>{item.titulo}</h3>
                  <p>{item.descricao || item.cliente}</p>
                </div>
                <span className="ciclo-pill primary">{item.tipo}</span>
                <strong>{formatDate(item.createdAt)}</strong>
                <small>{item.cliente}</small>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock label="Nenhum evento registrado." />
        )}
      </section>
    </>
  )
}

export function CicloListKpis({
  rows,
  secondaryLabel = 'Ativos',
}: {
  rows: CicloListRow[]
  secondaryLabel?: string
}) {
  const success = rows.filter((row) => row.tone === 'success').length
  const warning = rows.filter((row) => row.tone === 'warning').length
  const danger = rows.filter((row) => row.tone === 'danger').length

  return (
    <section className="ciclo-kpi-grid">
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

export function CicloGenericList({
  description,
  detailHrefBase,
  emptyLabel,
  rows,
  title,
}: {
  description: string
  detailHrefBase?: string
  emptyLabel: string
  rows: CicloListRow[]
  title: string
}) {
  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {rows.length ? (
        <div className="ciclo-table-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <h3>{row.title}</h3>
                <p>{row.subtitle}</p>
              </div>
              <span className={`ciclo-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
              <strong>{row.value}</strong>
              <small>
                {row.meta}
                {detailHrefBase ? <Link className="button secondary" href={`${detailHrefBase}/${row.id}`}>Detalhes</Link> : null}
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

export function CicloImportacaoDetalhe({
  itens,
  lote,
}: {
  itens: CicloImportacaoItem[]
  lote: CicloImportacaoLote
}) {
  const clientes = (lote.clientes_criados ?? 0) + (lote.clientes_atualizados ?? 0)

  return (
    <>
      <section className="ciclo-kpi-grid">
        <article className="card metric-card">
          <p className="metric-label">Linhas</p>
          <p className="metric-value">{lote.total_linhas ?? 0}</p>
          <p className="metric-hint">arquivo recebido</p>
        </article>
        <article className="card metric-card">
          <p className="metric-label">Validas</p>
          <p className="metric-value">{lote.linhas_validas ?? 0}</p>
          <p className="metric-hint">aptas para carga</p>
        </article>
        <article className="card metric-card">
          <p className="metric-label">Clientes</p>
          <p className="metric-value">{clientes}</p>
          <p className="metric-hint">{lote.clientes_criados ?? 0} novos</p>
        </article>
        <article className="card metric-card">
          <p className="metric-label">Ignoradas</p>
          <p className="metric-value">{lote.linhas_ignoradas ?? 0}</p>
          <p className="metric-hint">com erro ou duplicadas</p>
        </article>
      </section>

      {lote.erro ? <div className="suite-empty-block danger">{lote.erro}</div> : null}

      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Itens do lote</h2>
            <p>Resultado linha a linha da importação.</p>
          </div>
          <Link className="button secondary" href="/modulos/ciclo/importacoes">Voltar</Link>
        </div>

        {itens.length ? (
          <div className="ciclo-table-list">
            {itens.map((item) => (
              <article key={item.id}>
                <div>
                  <h3>{item.cliente_nome ?? `Linha ${item.linha}`}</h3>
                  <p>{item.cnpj_normalizado ?? 'Sem CNPJ'} - {item.mensagem ?? item.acao}</p>
                </div>
                <span className={`ciclo-pill ${item.status === 'sucesso' ? 'success' : item.status === 'erro' ? 'danger' : 'warning'}`}>{item.status}</span>
                <strong>Linha {item.linha}</strong>
                <small>{formatDate(item.created_at)}</small>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock label="Nenhum item registrado para este lote." />
        )}
      </section>
    </>
  )
}

export function EmptyBlock({ label }: { label: string }) {
  return <div className="ciclo-empty-block">{label}</div>
}
