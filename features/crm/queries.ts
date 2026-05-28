import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isCrmStage, recommendedAction } from '@/features/crm/scoring'
import type {
  CrmData,
  CrmEmpresa,
  CrmEmpresaRecord,
  CrmContatoRecord,
  CrmAtividadeRecord,
  CrmListRow,
  CrmOportunidade,
  CrmOpportunityFormData,
  CrmOpportunityRecord,
  CrmPropostaRecord,
  CrmPropostaResumo,
} from '@/features/crm/types'

type CrmContext = Awaited<ReturnType<typeof requireModuleAccess>>

function admin() {
  return createSupabaseAdminClient() as any
}

function text(value: unknown, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function dateLabel(value: unknown) {
  const raw = text(value)
  if (!raw) return 'Sem data'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(value)
}

function listTone(status: string): CrmListRow['tone'] {
  if (['ativo', 'aprovada', 'concluida', 'concluída', 'processada', 'pago'].includes(status)) return 'success'
  if (['vencida', 'rejeitada', 'perdido', 'falha', 'erro', 'cancelada'].includes(status)) return 'danger'
  if (['pendente', 'enviada', 'em andamento', 'negociacao'].includes(status)) return 'warning'
  return 'primary'
}

async function getAllowedCarteiraIds(context: CrmContext): Promise<Set<string> | null> {
  if (context.usuario.tipo === 'admin_global') return null

  const { data, error } = await admin()
    .schema('security')
    .from('usuario_carteiras')
    .select('carteira_id')
    .eq('usuario_id', context.usuario.id)
    .eq('ativo', true)

  if (error) throw new Error(error.message)
  return new Set<string>((data ?? []).map((row: any) => text(row.carteira_id)).filter(Boolean))
}

function rowInCarteiraScope(row: Record<string, any>, allowedCarteiraIds: Set<string> | null) {
  if (allowedCarteiraIds === null) return true
  const carteiraId = text(row.carteira_id)
  return !carteiraId || allowedCarteiraIds.has(carteiraId)
}

function filterByCarteiraScope(rows: Array<Record<string, any>>, allowedCarteiraIds: Set<string> | null) {
  return rows.filter((row) => rowInCarteiraScope(row, allowedCarteiraIds))
}

async function safeCrmList(context: CrmContext, table: string, orderColumn = 'created_at') {
  const { data, error } = await admin()
    .schema('crm')
    .from(table)
    .select('*')
    .order(orderColumn, { ascending: false })
    .limit(300)

  if (error) return [] as Array<Record<string, any>>
  const rows = (data ?? []) as Array<Record<string, any>>
  if (!rows.length || !('carteira_id' in rows[0])) return rows
  return filterByCarteiraScope(rows, await getAllowedCarteiraIds(context))
}

function emptyCrmData(databaseReady = false): CrmData {
  return {
    empresas: [],
    contatos: [],
    oportunidades: [],
    propostas: { total: 0, valorTotal: 0, enviadas: 0 },
    databaseReady,
  }
}

function onlyDigits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '')
}

function formatDocumento(value: unknown) {
  const digits = onlyDigits(value)
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  return String(value ?? 'Sem documento')
}

function daysSince(value: unknown) {
  if (!value) return 0
  const time = new Date(String(value)).getTime()
  if (Number.isNaN(time)) return 0
  return Math.max(0, Math.floor((Date.now() - time) / 86400000))
}

function relativeLastInteraction(days: number) {
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `Há ${days} dias`
}

function normalizeStatus(value: unknown): CrmEmpresa['status'] {
  if (value === 'ativo' || value === 'inativo' || value === 'prospecto') return value
  return 'prospecto'
}

function normalizeOpportunityStatus(value: unknown): CrmOportunidade['status'] {
  if (value === 'ganha' || value === 'perdida') return value
  return 'aberta'
}

function propostaResumo(rows: any[]): CrmPropostaResumo {
  return {
    total: rows.length,
    valorTotal: rows.reduce((sum, row) => sum + Number(row.valor_total ?? row.valor ?? 0), 0),
    enviadas: rows.filter((row) => row.status === 'enviada').length,
  }
}

export async function requireCrmContext() {
  const context = await requireModuleAccess('crm')
  const hasCrmAccess =
    canAccess(context.permissions, 'crm.dashboard.read') ||
    canAccess(context.permissions, 'crm.oportunidades.read') ||
    canAccess(context.permissions, 'crm.propostas.read')

  if (!hasCrmAccess) {
    redirect('/plataforma')
  }

  return context
}

export async function getCrmData(context: CrmContext): Promise<CrmData> {
  const supabase = admin()

  const [empresasResult, contatosResult, vinculosResult, oportunidadesResult, propostasResult] = await Promise.all([
    supabase
      .schema('crm')
      .from('empresas')
      .select('id,nome,documento,tipo,segmento,status,carteira_id,created_at')
      .order('nome', { ascending: true })
      .limit(300),
    supabase
      .schema('crm')
      .from('contatos')
      .select('id,nome,email,telefone,cargo,created_at')
      .order('nome', { ascending: true })
      .limit(300),
    supabase
      .schema('crm')
      .from('empresas_contatos')
      .select('empresa_id,contato_id')
      .limit(1000),
    supabase
      .schema('crm')
      .from('oportunidades')
      .select('id,titulo,empresa_id,contato_id,carteira_id,etapa,status,valor,probabilidade,origem,responsavel_id,proxima_acao,data_ultima_interacao,created_at')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .schema('crm')
      .from('propostas')
      .select('id,status,valor_total,oportunidade_id,created_at')
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  if (empresasResult.error || contatosResult.error || vinculosResult.error || oportunidadesResult.error || propostasResult.error) {
    return emptyCrmData(false)
  }

  const allowedCarteiraIds = await getAllowedCarteiraIds(context)
  const empresaRows = filterByCarteiraScope((empresasResult.data ?? []) as Array<Record<string, any>>, allowedCarteiraIds)
  const oportunidadeRows = filterByCarteiraScope((oportunidadesResult.data ?? []) as Array<Record<string, any>>, allowedCarteiraIds)
  const propostaRows = filterByCarteiraScope((propostasResult.data ?? []) as Array<Record<string, any>>, allowedCarteiraIds)
  const filteredEmpresaIds = new Set(empresaRows.map((row) => text(row.id)))
  const vinculoRows = ((vinculosResult.data ?? []) as Array<Record<string, any>>).filter((row) => filteredEmpresaIds.has(text(row.empresa_id)))
  const contatoIdsInScope = new Set([
    ...vinculoRows.map((row) => text(row.contato_id)).filter(Boolean),
    ...oportunidadeRows.map((row) => text(row.contato_id)).filter(Boolean),
  ])
  const contatoRows = allowedCarteiraIds === null
    ? (contatosResult.data ?? []) as Array<Record<string, any>>
    : ((contatosResult.data ?? []) as Array<Record<string, any>>).filter((row) => contatoIdsInScope.has(text(row.id)))

  const carteiraIds = [
    ...new Set([
      ...empresaRows.map((row: any) => row.carteira_id).filter(Boolean),
      ...oportunidadeRows.map((row: any) => row.carteira_id).filter(Boolean),
    ]),
  ]

  const carteirasResult = carteiraIds.length
    ? await supabase.schema('core').from('carteiras').select('id,nome').in('id', carteiraIds)
    : { data: [], error: null }

  const carteiraMap = new Map<string, string>((carteirasResult.data ?? []).map((row: any) => [String(row.id), String(row.nome)]))
  const empresaMap = new Map<string, Record<string, any>>(empresaRows.map((row) => [String(row.id), row]))
  const contatoMap = new Map<string, Record<string, any>>(contatoRows.map((row) => [String(row.id), row]))
  const contatosPorEmpresa = vinculoRows.reduce((acc: Record<string, number>, row) => {
    if (row.empresa_id) {
      const empresaId = String(row.empresa_id)
      acc[empresaId] = (acc[empresaId] ?? 0) + 1
    }
    return acc
  }, {})

  const oportunidades: CrmOportunidade[] = oportunidadeRows.map((row: any) => {
    const etapa = isCrmStage(row.etapa) ? row.etapa : 'lead'
    const diasSemInteracao = daysSince(row.data_ultima_interacao ?? row.created_at)
    const oportunidade = {
      id: String(row.id),
      titulo: String(row.titulo ?? 'Oportunidade sem título'),
      empresa: String(empresaMap.get(String(row.empresa_id))?.nome ?? 'Empresa não vinculada'),
      contato: String(contatoMap.get(String(row.contato_id))?.nome ?? 'Contato não definido'),
      etapa,
      status: normalizeOpportunityStatus(row.status),
      valor: Number(row.valor ?? 0),
      probabilidade: Number(row.probabilidade ?? 0),
      diasSemInteracao,
      responsavel: 'Equipe comercial',
      carteira: String(carteiraMap.get(String(row.carteira_id)) ?? 'Sem carteira'),
      origem: String(row.origem ?? 'Não informada'),
      ultimaInteracao: relativeLastInteraction(diasSemInteracao),
      proximaAcao: String(row.proxima_acao ?? ''),
    }

    return {
      ...oportunidade,
      proximaAcao: oportunidade.proximaAcao || recommendedAction(oportunidade),
    }
  })

  const oportunidadesPorEmpresa = oportunidades.reduce<Record<string, CrmOportunidade[]>>((acc, oportunidade) => {
    acc[oportunidade.empresa] = [...(acc[oportunidade.empresa] ?? []), oportunidade]
    return acc
  }, {})

  const empresas: CrmEmpresa[] = empresaRows.map((row: any) => {
    const nome = String(row.nome ?? 'Empresa sem nome')
    const oportunidadesDaEmpresa = oportunidadesPorEmpresa[nome] ?? []

    return {
      id: String(row.id),
      nome,
      documento: formatDocumento(row.documento),
      tipo: row.tipo === 'PF' ? 'PF' : 'PJ',
      segmento: String(row.segmento ?? 'Sem segmento'),
      status: normalizeStatus(row.status),
      carteira: String(carteiraMap.get(String(row.carteira_id)) ?? 'Sem carteira'),
      contatos: contatosPorEmpresa[String(row.id)] ?? 0,
      oportunidades: oportunidadesDaEmpresa.length,
      valorPipeline: oportunidadesDaEmpresa.reduce((sum, oportunidade) => sum + oportunidade.valor, 0),
    }
  })

  return {
    empresas,
    contatos: contatoRows.map((row: any) => ({
      id: String(row.id),
      nome: String(row.nome ?? 'Contato sem nome'),
      email: String(row.email ?? ''),
      telefone: String(row.telefone ?? ''),
      cargo: String(row.cargo ?? ''),
    })),
    oportunidades,
    propostas: propostaResumo(propostaRows),
    databaseReady: true,
  }
}

export async function listCrmClienteRows(context: CrmContext): Promise<CrmListRow[]> {
  const data = await getCrmData(context)
  return data.empresas.map((empresa) => ({
    id: empresa.id,
    title: empresa.nome,
    subtitle: `${empresa.documento} · ${empresa.tipo} · ${empresa.segmento}`,
    status: empresa.status,
    value: empresa.carteira,
    meta: `${empresa.contatos} contato(s) · ${empresa.oportunidades} oportunidade(s)`,
    tone: listTone(empresa.status),
  }))
}

export async function listCrmContatoRows(context: CrmContext): Promise<CrmListRow[]> {
  const data = await getCrmData(context)
  return data.contatos.map((contato) => ({
    id: contato.id,
    title: contato.nome,
    subtitle: `${contato.email || 'Sem e-mail'} · ${contato.telefone || 'Sem telefone'}`,
    status: contato.cargo || 'contato',
    value: contato.cargo || 'Sem cargo',
    meta: 'Cadastro de relacionamento',
    tone: 'primary',
  }))
}

export async function listCrmPropostaRows(context: CrmContext): Promise<CrmListRow[]> {
  const rows = await safeCrmList(context, 'propostas', 'created_at')
  return rows.map((row) => {
    const status = text(row.status, 'rascunho')
    return {
      id: text(row.id),
      title: text(row.titulo ?? row.nome, 'Proposta comercial'),
      subtitle: text(row.descricao ?? row.escopo, 'Sem descricao cadastrada'),
      status,
      value: formatBRL(numberValue(row.valor_total ?? row.valor)),
      meta: dateLabel(row.created_at ?? row.criado_em),
      tone: listTone(status),
    }
  })
}

export async function listCrmAtividadeRows(context: CrmContext): Promise<CrmListRow[]> {
  const rows = await safeCrmList(context, 'atividades', 'created_at')
  return rows.map((row) => {
    const status = row.concluida ? 'concluida' : 'pendente'
    return {
      id: text(row.id),
      title: text(row.titulo ?? row.nome, 'Atividade comercial'),
      subtitle: text(row.descricao ?? row.observacao, 'Sem descricao cadastrada'),
      status,
      value: dateLabel(row.prazo_em ?? row.data_prevista ?? row.vencimento ?? row.created_at),
      meta: text(row.tipo, 'follow-up'),
      tone: listTone(status),
    }
  })
}

export async function listCrmInteracaoRows(context: CrmContext): Promise<CrmListRow[]> {
  const rows = (await safeCrmList(context, 'atividades', 'created_at')).filter((row) => ['ligacao', 'email', 'reuniao', 'nota'].includes(text(row.tipo)))
  return rows.map((row) => {
    const tipo = text(row.tipo, 'interacao')
    return {
      id: text(row.id),
      title: text(row.titulo ?? row.assunto, 'Interacao registrada'),
      subtitle: text(row.descricao ?? row.observacao, 'Sem descricao cadastrada'),
      status: tipo,
      value: dateLabel(row.realizada_em ?? row.created_at),
      meta: text(row.canal, 'historico'),
      tone: 'primary',
    }
  })
}

export async function listCrmImportacaoRows(context: CrmContext): Promise<CrmListRow[]> {
  const rows = await safeCrmList(context, 'importacoes', 'created_at')
  return rows.map((row) => {
    const status = text(row.status, 'processada')
    return {
      id: text(row.id),
      title: text(row.arquivo ?? row.nome_arquivo, 'Importação de dados'),
      subtitle: text(row.descricao ?? row.observacao, 'Sem descricao cadastrada'),
      status,
      value: `${numberValue(row.total_linhas ?? row.linhas_processadas ?? row.linhas).toLocaleString('pt-BR')} linhas`,
      meta: dateLabel(row.created_at ?? row.criado_em),
      tone: listTone(status),
    }
  })
}

export async function listCrmCarteiraUsuarioRows(): Promise<CrmListRow[]> {
  const supabase = admin()
  const { data, error } = await supabase
    .schema('security')
    .from('usuario_carteiras')
    .select('id,usuario_id,carteira_id,ativo')
    .limit(500)

  if (error) return []

  const rows = (data ?? []) as Array<Record<string, any>>
  const usuarioIds = [...new Set(rows.map((row) => text(row.usuario_id)).filter(Boolean))]
  const carteiraIds = [...new Set(rows.map((row) => text(row.carteira_id)).filter(Boolean))]

  const [usuariosResult, carteirasResult] = await Promise.all([
    usuarioIds.length
      ? supabase.schema('security').from('usuarios').select('id,nome,email,tipo').in('id', usuarioIds)
      : { data: [] },
    carteiraIds.length
      ? supabase.schema('core').from('carteiras').select('id,nome').in('id', carteiraIds)
      : { data: [] },
  ])

  const usuarios = new Map(((usuariosResult.data ?? []) as Array<Record<string, any>>).map((row) => [text(row.id), row]))
  const carteiras = new Map(((carteirasResult.data ?? []) as Array<Record<string, any>>).map((row) => [text(row.id), row]))

  return rows.map((row) => {
    const usuario = usuarios.get(text(row.usuario_id))
    const carteira = carteiras.get(text(row.carteira_id))
    const ativo = Boolean(row.ativo ?? true)
    return {
      id: text(row.id, `${row.usuario_id}-${row.carteira_id}`),
      title: text(usuario?.nome, 'Usuario sem nome'),
      subtitle: text(usuario?.email, 'Sem e-mail'),
      status: ativo ? 'ativo' : 'inativo',
      value: text(carteira?.nome, 'Carteira nao encontrada'),
      meta: text(usuario?.tipo, 'operador'),
      tone: ativo ? 'success' : 'danger',
    }
  })
}

export async function getCrmOpportunityFormData(context: CrmContext): Promise<CrmOpportunityFormData> {
  const supabase = admin()

  const [empresasResult, contatosResult, oportunidadesResult, usuarioCarteirasResult] = await Promise.all([
    supabase
      .schema('crm')
      .from('empresas')
      .select('id,nome,documento')
      .order('nome', { ascending: true })
      .limit(500),
    supabase
      .schema('crm')
      .from('contatos')
      .select('id,nome,email')
      .order('nome', { ascending: true })
      .limit(500),
    supabase
      .schema('crm')
      .from('oportunidades')
      .select('id,titulo,valor')
      .order('created_at', { ascending: false })
      .limit(500),
    context.usuario.tipo === 'admin_global'
      ? { data: null, error: null }
      : supabase
        .schema('security')
        .from('usuario_carteiras')
        .select('carteira_id')
        .eq('usuario_id', context.usuario.id)
        .eq('ativo', true),
  ])

  const carteiraIds = context.usuario.tipo === 'admin_global'
    ? []
    : ((usuarioCarteirasResult.data ?? []) as Array<Record<string, any>>).map((row) => text(row.carteira_id)).filter(Boolean)

  const carteirasResult = context.usuario.tipo === 'admin_global'
    ? await supabase.schema('core').from('carteiras').select('id,nome').eq('status', 'ativo').order('nome', { ascending: true })
    : carteiraIds.length
      ? await supabase.schema('core').from('carteiras').select('id,nome').in('id', carteiraIds).eq('status', 'ativo').order('nome', { ascending: true })
      : { data: [], error: null }

  const carteiraRows = (carteirasResult.data ?? []) as Array<Record<string, any>>

  return {
    empresas: ((empresasResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      label: `${text(row.nome, 'Empresa')} - ${formatDocumento(row.documento)}`,
    })),
    contatos: ((contatosResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      label: `${text(row.nome, 'Contato')} - ${text(row.email, 'sem e-mail')}`,
    })),
    oportunidades: ((oportunidadesResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      label: `${text(row.titulo, 'Oportunidade')} - ${formatBRL(numberValue(row.valor))}`,
    })),
    carteiras: carteiraRows.map((row) => ({
      id: text(row.id),
      label: text(row.nome, 'Carteira'),
    })).filter((row) => row.id),
  }
}

export async function getCrmOpportunity(id: string, context: CrmContext): Promise<CrmOpportunityRecord> {
  const { data, error } = await admin()
    .schema('crm')
    .from('oportunidades')
    .select('id,carteira_id,empresa_id,contato_id,titulo,descricao,etapa,status,valor,probabilidade,origem,proxima_acao,data_ultima_interacao,data_proxima_acao,motivo_perda')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Oportunidade nao encontrada.')

  const row = data as Record<string, any>
  const allowedCarteiras = await getCrmOpportunityFormData(context)
  const allowedIds = new Set(allowedCarteiras.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/crm/oportunidades')
  }

  const etapa = isCrmStage(row.etapa) ? row.etapa : 'lead'
  const status = row.status === 'ganha' || row.status === 'perdida' ? row.status : 'aberta'

  return {
    id: text(row.id),
    carteira_id: text(row.carteira_id) || null,
    empresa_id: text(row.empresa_id),
    contato_id: text(row.contato_id) || null,
    titulo: text(row.titulo),
    descricao: text(row.descricao) || null,
    etapa,
    status,
    valor: numberValue(row.valor),
    probabilidade: numberValue(row.probabilidade),
    origem: text(row.origem) || null,
    proxima_acao: text(row.proxima_acao) || null,
    data_ultima_interacao: text(row.data_ultima_interacao) || null,
    data_proxima_acao: text(row.data_proxima_acao) || null,
    motivo_perda: text(row.motivo_perda) || null,
  }
}

export async function getCrmEmpresa(id: string, context: CrmContext): Promise<CrmEmpresaRecord> {
  const { data, error } = await admin()
    .schema('crm')
    .from('empresas')
    .select('id,carteira_id,nome,documento,tipo,segmento,origem,status,observacoes')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Empresa nao encontrada.')

  const row = data as Record<string, any>
  const allowedCarteiras = await getCrmOpportunityFormData(context)
  const allowedIds = new Set(allowedCarteiras.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/crm/empresas')
  }

  return {
    id: text(row.id),
    carteira_id: carteiraId || null,
    nome: text(row.nome),
    documento: text(row.documento) || null,
    tipo: row.tipo === 'PF' ? 'PF' : 'PJ',
    segmento: text(row.segmento) || null,
    origem: text(row.origem) || null,
    status: normalizeStatus(row.status),
    observacoes: text(row.observacoes) || null,
  }
}

export async function getCrmContato(id: string): Promise<CrmContatoRecord> {
  const { data, error } = await admin()
    .schema('crm')
    .from('contatos')
    .select('id,nome,email,telefone,cargo,origem,status')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Contato nao encontrado.')

  const row = data as Record<string, any>
  const status = row.status === 'inativo' || row.status === 'arquivado' ? row.status : 'ativo'

  return {
    id: text(row.id),
    nome: text(row.nome),
    email: text(row.email) || null,
    telefone: text(row.telefone) || null,
    cargo: text(row.cargo) || null,
    origem: text(row.origem) || null,
    status,
  }
}

export async function getCrmProposta(id: string, context: CrmContext): Promise<CrmPropostaRecord> {
  const { data, error } = await admin()
    .schema('crm')
    .from('propostas')
    .select('id,oportunidade_id,carteira_id,numero,titulo,status,valor_total,enviada_em,validade_em,observacoes')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Proposta nao encontrada.')

  const row = data as Record<string, any>
  const formData = await getCrmOpportunityFormData(context)
  const allowedIds = new Set(formData.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/crm/propostas')
  }

  const status = ['enviada', 'aprovada', 'recusada', 'expirada'].includes(text(row.status)) ? row.status : 'rascunho'

  return {
    id: text(row.id),
    oportunidade_id: text(row.oportunidade_id),
    carteira_id: carteiraId || null,
    numero: text(row.numero) || null,
    titulo: text(row.titulo),
    status,
    valor_total: numberValue(row.valor_total),
    enviada_em: text(row.enviada_em) || null,
    validade_em: text(row.validade_em) || null,
    observacoes: text(row.observacoes) || null,
  }
}

export async function getCrmAtividade(id: string, context: CrmContext): Promise<CrmAtividadeRecord> {
  const { data, error } = await admin()
    .schema('crm')
    .from('atividades')
    .select('id,oportunidade_id,empresa_id,contato_id,carteira_id,tipo,titulo,descricao,realizada_em,prazo_em,concluida')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Atividade nao encontrada.')

  const row = data as Record<string, any>
  const formData = await getCrmOpportunityFormData(context)
  const allowedIds = new Set(formData.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/crm/atividades')
  }

  const tipo = ['ligacao', 'email', 'reuniao', 'nota'].includes(text(row.tipo)) ? row.tipo : 'tarefa'

  return {
    id: text(row.id),
    oportunidade_id: text(row.oportunidade_id) || null,
    empresa_id: text(row.empresa_id) || null,
    contato_id: text(row.contato_id) || null,
    carteira_id: carteiraId || null,
    tipo,
    titulo: text(row.titulo),
    descricao: text(row.descricao) || null,
    realizada_em: text(row.realizada_em) || null,
    prazo_em: text(row.prazo_em) || null,
    concluida: Boolean(row.concluida),
  }
}
