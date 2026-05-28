import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { formatDocumento, normalizePercent } from '@/features/ciclo/scoring'
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
  CicloRisco,
  CicloStatusCliente,
  CicloTemperatura,
  CicloTimelineItem,
} from '@/features/ciclo/types'

type CicloContext = Awaited<ReturnType<typeof requireModuleAccess>>

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

function listTone(status: string): CicloListRow['tone'] {
  if (['ativo', 'ativa', 'validado', 'vigente', 'concluido', 'concluida', 'processado', 'processada'].includes(status)) return 'success'
  if (['vencido', 'vencida', 'critico', 'critica', 'falha', 'falhou', 'erro', 'bloqueado'].includes(status)) return 'danger'
  if (['pendente', 'aberto', 'em_tratamento', 'em_andamento', 'parcial', 'medio', 'media'].includes(status)) return 'warning'
  return 'primary'
}

async function getAllowedCarteiraIds(context: CicloContext): Promise<Set<string> | null> {
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

async function safeCicloList(context: CicloContext, table: string, orderColumn = 'created_at') {
  const { data, error } = await admin()
    .schema('ciclo')
    .from(table)
    .select('*')
    .order(orderColumn, { ascending: false })
    .limit(300)

  if (error) return [] as Array<Record<string, any>>
  const rows = (data ?? []) as Array<Record<string, any>>
  if (!rows.length || !('carteira_id' in rows[0])) return rows
  return filterByCarteiraScope(rows, await getAllowedCarteiraIds(context))
}

function emptyCicloData(databaseReady = false): CicloData {
  return {
    clientes: [],
    documentos: [],
    alertas: [],
    timeline: [],
    databaseReady,
  }
}

function normalizeStatus(value: unknown): CicloStatusCliente {
  if (value === 'novo' || value === 'implantacao' || value === 'ativo' || value === 'pausado' || value === 'encerrado') return value
  if (value === 'em_onboarding') return 'implantacao'
  return 'ativo'
}

function normalizeRisco(value: unknown): CicloRisco {
  if (value === 'baixo' || value === 'medio' || value === 'alto' || value === 'critico') return value
  return 'medio'
}

function normalizeTemperatura(value: unknown): CicloTemperatura {
  if (value === 'quente' || value === 'neutro' || value === 'frio') return value
  return 'neutro'
}

function normalizeDocumentoStatus(value: unknown): CicloDocumento['status'] {
  if (value === 'recebido' || value === 'validado' || value === 'vencido' || value === 'dispensado') return value
  return 'pendente'
}

function normalizeAlertaStatus(value: unknown): CicloAlerta['status'] {
  if (value === 'em_tratamento' || value === 'resolvido' || value === 'cancelado') return value
  return 'aberto'
}

function normalizeSeveridade(value: unknown): CicloAlerta['severidade'] {
  if (value === 'baixa' || value === 'media' || value === 'alta' || value === 'critica') return value
  if (value === 'critico') return 'critica'
  return 'media'
}

export async function requireCicloContext() {
  const context = await requireModuleAccess('ciclo')
  const hasCicloAccess =
    canAccess(context.permissions, 'ciclo.dashboard.read') ||
    canAccess(context.permissions, 'ciclo.clientes.read') ||
    canAccess(context.permissions, 'ciclo.documentos.read') ||
    canAccess(context.permissions, 'ciclo.alertas.read')

  if (!hasCicloAccess) {
    redirect('/plataforma')
  }

  return context
}

export async function getCicloData(context: CicloContext): Promise<CicloData> {
  const supabase = admin()

  const [clientesResult, documentosResult, alertasResult, timelineResult] = await Promise.all([
    supabase
      .schema('ciclo')
      .from('clientes')
      .select('id,carteira_id,administradora_id,nome,nome_fantasia,razao_social,documento,cnpj_normalizado,email,telefone,cidade,estado,status_operacional,score_atual,risco_atual,temperatura,ativo,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .schema('ciclo')
      .from('cliente_documentos')
      .select('id,cliente_id,carteira_id,tipo_documento,titulo,status,obrigatorio,validado,data_renovacao,updated_at')
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase
      .schema('ciclo')
      .from('alertas_cliente')
      .select('id,cliente_id,carteira_id,tipo,titulo,descricao,status,severidade,vencimento_em,created_at')
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .schema('ciclo')
      .from('timeline_cliente')
      .select('id,cliente_id,carteira_id,tipo,titulo,descricao,created_at')
      .order('created_at', { ascending: false })
      .limit(80),
  ])

  if (clientesResult.error || documentosResult.error || alertasResult.error || timelineResult.error) {
    return emptyCicloData(false)
  }

  const allowedCarteiraIds = await getAllowedCarteiraIds(context)
  const clienteRows = filterByCarteiraScope((clientesResult.data ?? []) as Array<Record<string, any>>, allowedCarteiraIds)
  const clienteIds = new Set(clienteRows.map((row) => text(row.id)))
  const documentoRows = filterByCarteiraScope((documentosResult.data ?? []) as Array<Record<string, any>>, allowedCarteiraIds)
    .filter((row) => clienteIds.has(text(row.cliente_id)))
  const alertaRows = filterByCarteiraScope((alertasResult.data ?? []) as Array<Record<string, any>>, allowedCarteiraIds)
    .filter((row) => !text(row.cliente_id) || clienteIds.has(text(row.cliente_id)))
  const timelineRows = filterByCarteiraScope((timelineResult.data ?? []) as Array<Record<string, any>>, allowedCarteiraIds)
    .filter((row) => clienteIds.has(text(row.cliente_id)))

  const carteiraIds = [...new Set(clienteRows.map((row) => row.carteira_id).filter(Boolean))]
  const administradoraIds = [...new Set(clienteRows.map((row) => row.administradora_id).filter(Boolean))]

  const [carteirasResult, administradorasResult, regularidadeResult, contatosResult] = await Promise.all([
    carteiraIds.length
      ? supabase.schema('core').from('carteiras').select('id,nome').in('id', carteiraIds)
      : { data: [], error: null },
    administradoraIds.length
      ? supabase.schema('ciclo').from('administradoras').select('id,nome').in('id', administradoraIds)
      : { data: [], error: null },
    clienteRows.length
      ? supabase.schema('ciclo').from('regularidade_cliente').select('cliente_id,percentual_regularidade').in('cliente_id', clienteRows.map((row) => row.id))
      : { data: [], error: null },
    clienteRows.length
      ? supabase.schema('ciclo').from('cliente_contatos').select('cliente_id,nome,email,telefone,principal,ativo').in('cliente_id', clienteRows.map((row) => row.id)).eq('ativo', true)
      : { data: [], error: null },
  ])

  const carteiraMap = new Map<string, string>((carteirasResult.data ?? []).map((row: any) => [String(row.id), String(row.nome)]))
  const administradoraMap = new Map<string, string>((administradorasResult.data ?? []).map((row: any) => [String(row.id), String(row.nome)]))
  const regularidadeMap = new Map<string, number>((regularidadeResult.data ?? []).map((row: any) => [String(row.cliente_id), normalizePercent(row.percentual_regularidade)]))
  const contatoMap = new Map<string, string>()

  for (const contato of (contatosResult.data ?? []) as Array<Record<string, any>>) {
    const clienteId = String(contato.cliente_id)
    if (contato.principal || !contatoMap.has(clienteId)) {
      contatoMap.set(clienteId, String(contato.nome ?? ''))
    }
  }

  const clienteMap = new Map<string, Record<string, any>>(clienteRows.map((row) => [String(row.id), row]))
  const alertasAbertosPorCliente = alertaRows.reduce((acc: Record<string, number>, row) => {
    const status = normalizeAlertaStatus(row.status)
    if (row.cliente_id && status !== 'resolvido' && status !== 'cancelado') {
      const clienteId = String(row.cliente_id)
      acc[clienteId] = (acc[clienteId] ?? 0) + 1
    }
    return acc
  }, {})

  const clientes: CicloCliente[] = clienteRows.map((row) => {
    const id = String(row.id)
    return {
      id,
      nome: String(row.nome_fantasia ?? row.nome ?? row.razao_social ?? 'Cliente sem nome'),
      razaoSocial: String(row.razao_social ?? row.nome ?? ''),
      documento: formatDocumento(row.cnpj_normalizado ?? row.documento),
      carteira: String(carteiraMap.get(String(row.carteira_id)) ?? 'Sem carteira'),
      administradora: String(administradoraMap.get(String(row.administradora_id)) ?? 'Sem administradora'),
      status: normalizeStatus(row.status_operacional),
      risco: normalizeRisco(row.risco_atual),
      temperatura: normalizeTemperatura(row.temperatura),
      score: normalizePercent(row.score_atual),
      regularidade: regularidadeMap.get(id) ?? 0,
      alertasAbertos: alertasAbertosPorCliente[id] ?? 0,
      cidade: String(row.cidade ?? ''),
      estado: String(row.estado ?? ''),
      contatoPrincipal: contatoMap.get(id) ?? '',
    }
  })

  const documentos: CicloDocumento[] = documentoRows.map((row) => {
    const cliente = clienteMap.get(String(row.cliente_id))
    return {
      id: String(row.id),
      cliente: String(cliente?.nome_fantasia ?? cliente?.nome ?? cliente?.razao_social ?? 'Cliente não vinculado'),
      tipo: String(row.tipo_documento ?? 'documento'),
      titulo: String(row.titulo ?? row.tipo_documento ?? 'Documento'),
      status: normalizeDocumentoStatus(row.status),
      obrigatorio: Boolean(row.obrigatorio),
      validado: Boolean(row.validado),
      dataRenovacao: String(row.data_renovacao ?? ''),
    }
  })

  const alertas: CicloAlerta[] = alertaRows.map((row) => {
    const cliente = clienteMap.get(String(row.cliente_id))
    return {
      id: String(row.id),
      cliente: String(cliente?.nome_fantasia ?? cliente?.nome ?? cliente?.razao_social ?? 'Cliente não vinculado'),
      titulo: String(row.titulo ?? 'Alerta operacional'),
      descricao: String(row.descricao ?? ''),
      tipo: String(row.tipo ?? 'operacional'),
      status: normalizeAlertaStatus(row.status),
      severidade: normalizeSeveridade(row.severidade),
      vencimentoEm: String(row.vencimento_em ?? ''),
    }
  })

  const timeline: CicloTimelineItem[] = timelineRows.map((row) => {
    const cliente = clienteMap.get(String(row.cliente_id))
    return {
      id: String(row.id),
      cliente: String(cliente?.nome_fantasia ?? cliente?.nome ?? cliente?.razao_social ?? 'Cliente não vinculado'),
      titulo: String(row.titulo ?? 'Evento operacional'),
      descricao: String(row.descricao ?? ''),
      tipo: String(row.tipo ?? 'evento'),
      createdAt: String(row.created_at ?? ''),
    }
  })

  return {
    clientes,
    documentos,
    alertas,
    timeline,
    databaseReady: true,
  }
}

export async function listCicloAdministradoraRows(): Promise<CicloListRow[]> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('administradoras')
    .select('*')
    .order('nome', { ascending: true })
    .limit(300)
  const rows = error ? [] : ((data ?? []) as Array<Record<string, any>>)
  const counts = rows.length
    ? await admin()
      .schema('ciclo')
      .from('clientes')
      .select('administradora_id')
      .in('administradora_id', rows.map((row) => row.id).filter(Boolean))
    : { data: [], error: null }
  const countMap = new Map<string, number>()
  for (const cliente of (counts.data ?? []) as Array<Record<string, any>>) {
    const administradoraId = text(cliente.administradora_id)
    countMap.set(administradoraId, (countMap.get(administradoraId) ?? 0) + 1)
  }

  return rows.map((row) => {
    const status = row.ativo === false ? 'inativa' : 'ativa'
    return {
      id: text(row.id),
      title: text(row.nome, 'Administradora'),
      subtitle: `${text(row.email, 'Sem e-mail')} · ${text(row.telefone, 'Sem telefone')}`,
      status,
      value: text(row.site, 'Sem site'),
      meta: `${(countMap.get(text(row.id)) ?? 0).toLocaleString('pt-BR')} cliente(s)`,
      tone: listTone(status),
    }
  })
}

export async function listCicloImportacaoRows(context: CicloContext): Promise<CicloListRow[]> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('importacao_lotes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)
  const rawRows = error ? [] : ((data ?? []) as Array<Record<string, any>>)
  const allowedCarteiraIds = await getAllowedCarteiraIds(context)
  const rows = allowedCarteiraIds === null
    ? rawRows
    : rawRows.filter((row) => {
      if (text(row.usuario_id) === context.usuario.id) return true
      const carteiraIds = Array.isArray(row.carteira_ids) ? row.carteira_ids.map((id) => text(id)).filter(Boolean) : []
      return carteiraIds.length === 0 || carteiraIds.some((id) => allowedCarteiraIds.has(id))
    })
  return rows.map((row) => {
    const status = text(row.status, 'processada')
    return {
      id: text(row.id),
      title: text(row.arquivo_nome ?? row.nome_arquivo, 'Importação XLSX'),
      subtitle: text(row.descricao ?? row.observacao, 'Carga de dados do Ciclo'),
      status,
      value: `${numberValue(row.total_linhas ?? row.linhas_processadas).toLocaleString('pt-BR')} linhas`,
      meta: dateLabel(row.finalizado_em ?? row.created_at),
      tone: listTone(status),
    }
  })
}

export async function listCicloContratoRows(context: CicloContext): Promise<CicloListRow[]> {
  const rows = await safeCicloList(context, 'contratos', 'created_at')
  return rows.map((row) => {
    const status = text(row.status, row.ativo === false ? 'inativo' : 'ativo')
    return {
      id: text(row.id),
      title: text(row.numero_contrato ?? row.titulo, 'Contrato sem numero'),
      subtitle: `Vigencia: ${dateLabel(row.data_inicio)} a ${dateLabel(row.data_fim)}`,
      status,
      value: formatBRL(numberValue(row.valor)),
      meta: `Reajuste: ${dateLabel(row.proximo_reajuste)}`,
      tone: listTone(status),
    }
  })
}

export async function listCicloAtaRows(context: CicloContext): Promise<CicloListRow[]> {
  const rows = await safeCicloList(context, 'atas', 'created_at')
  return rows.map((row) => {
    const status = text(row.status, 'vigente')
    return {
      id: text(row.id),
      title: text(row.tipo ?? row.titulo, 'Ata'),
      subtitle: text(row.observacoes, 'Sem observacoes'),
      status,
      value: dateLabel(row.data_ata),
      meta: `Validade: ${dateLabel(row.data_validade)}`,
      tone: listTone(status),
    }
  })
}

export async function listCicloOnboardingRows(): Promise<CicloListRow[]> {
  const context = await requireCicloContext()
  const data = await getCicloData(context)
  const onboardingClientes = data.clientes
    .filter((cliente) => cliente.status === 'novo' || cliente.status === 'implantacao')

  const documentosResult = onboardingClientes.length
    ? await admin()
      .schema('ciclo')
      .from('cliente_documentos')
      .select('cliente_id,status,validado,obrigatorio,aplicavel')
      .in('cliente_id', onboardingClientes.map((cliente) => cliente.id))
    : { data: [], error: null }

  const progresso = new Map<string, { total: number; concluidos: number }>()
  for (const documento of (documentosResult.data ?? []) as Array<Record<string, any>>) {
    if (documento.obrigatorio === false || documento.aplicavel === false) continue
    const clienteId = text(documento.cliente_id)
    const item = progresso.get(clienteId) ?? { total: 0, concluidos: 0 }
    item.total += 1
    if (documento.validado || documento.status === 'dispensado') item.concluidos += 1
    progresso.set(clienteId, item)
  }

  return onboardingClientes
    .map((cliente) => {
      const item = progresso.get(cliente.id) ?? { total: 0, concluidos: 0 }
      const percentual = item.total ? Math.round((item.concluidos / item.total) * 100) : 0
      return {
      id: cliente.id,
      title: cliente.nome,
      subtitle: item.total ? `${item.concluidos}/${item.total} documentos validados` : `${cliente.documento} - checklist nao iniciado`,
      status: cliente.status,
      value: `${percentual}%`,
      meta: `${cliente.carteira} - risco ${cliente.risco}`,
      tone: listTone(cliente.status),
      }
    })
}

export async function listCicloRegularidadeRows(context: CicloContext): Promise<CicloListRow[]> {
  const data = await getCicloData(context)
  return data.clientes.map((cliente) => {
    const status = cliente.regularidade >= 75 ? 'saudavel' : cliente.regularidade >= 50 ? 'atencao' : 'critico'
    return {
      id: cliente.id,
      title: cliente.nome,
      subtitle: `${cliente.documento} · ${cliente.administradora}`,
      status,
      value: `${cliente.regularidade}%`,
      meta: `${cliente.carteira} · risco ${cliente.risco}`,
      tone: listTone(status),
    }
  })
}

export async function listCicloTimelineRows(context: CicloContext): Promise<CicloListRow[]> {
  const data = await getCicloData(context)
  return data.timeline.map((row) => ({
    id: row.id,
    title: row.titulo,
    subtitle: row.descricao || row.cliente,
    status: row.tipo,
    value: dateLabel(row.createdAt),
    meta: row.cliente,
    tone: 'primary',
  }))
}

export async function listCicloOcorrenciaRows(context: CicloContext): Promise<CicloListRow[]> {
  const rows = await safeCicloList(context, 'ocorrencias', 'created_at')
  return rows.map((row) => {
    const tipo = text(row.tipo, 'ocorrencia')
    const metadata = (row.metadata ?? {}) as Record<string, any>
    return {
      id: text(row.id),
      title: text(row.titulo, 'Ocorrencia operacional'),
      subtitle: text(row.descricao, 'Sem descricao'),
      status: text(metadata.status, tipo),
      value: dateLabel(row.data_ocorrencia ?? row.created_at),
      meta: `${text(metadata.responsavel, 'Sem responsavel')} - impacto ${text(row.impacto, 'medio')}`,
      tone: listTone(text(row.impacto, tipo)),
    }
  })
}

export async function listCicloAlertaRows(context: CicloContext): Promise<CicloListRow[]> {
  const rows = await safeCicloList(context, 'alertas_cliente', 'created_at')
  return rows.map((row) => {
    const status = normalizeAlertaStatus(row.status)
    return {
      id: text(row.id),
      title: text(row.titulo, 'Alerta operacional'),
      subtitle: text(row.descricao, 'Sem descricao'),
      status,
      value: dateLabel(row.vencimento_em ?? row.created_at),
      meta: `Severidade ${text(row.severidade, 'media')}`,
      tone: listTone(status === 'aberto' ? text(row.severidade, status) : status),
    }
  })
}

export async function getCicloImportacaoLote(id: string, context: CicloContext): Promise<CicloImportacaoLote | null> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('importacao_lotes')
    .select('id,tipo,status,arquivo_nome,total_linhas,linhas_validas,clientes_criados,clientes_atualizados,contatos_importados,linhas_ignoradas,erro,usuario_id,carteira_ids,created_at,finalizado_em')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const row = data as Record<string, any>
  const allowedCarteiraIds = await getAllowedCarteiraIds(context)
  if (allowedCarteiraIds !== null && text(row.usuario_id) !== context.usuario.id) {
    const carteiraIds = Array.isArray(row.carteira_ids) ? row.carteira_ids.map((carteiraId) => text(carteiraId)).filter(Boolean) : []
    if (carteiraIds.length > 0 && !carteiraIds.some((carteiraId) => allowedCarteiraIds.has(carteiraId))) return null
  }
  return data as CicloImportacaoLote
}

export async function listCicloImportacaoItens(loteId: string, context: CicloContext): Promise<CicloImportacaoItem[]> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('importacao_lote_itens')
    .select('id,linha,carteira_id,acao,status,cnpj_normalizado,cliente_nome,mensagem,created_at')
    .eq('lote_id', loteId)
    .order('linha', { ascending: true })
    .limit(500)

  if (error) return []
  const rows = (data ?? []) as Array<Record<string, any>>
  return filterByCarteiraScope(rows, await getAllowedCarteiraIds(context)) as CicloImportacaoItem[]
}

export async function getCicloClienteFormData(context: CicloContext): Promise<CicloClienteFormData> {
  const supabase = admin()
  const usuarioCarteirasResult = context.usuario.tipo === 'admin_global'
    ? { data: null, error: null }
    : await supabase
      .schema('security')
      .from('usuario_carteiras')
      .select('carteira_id')
      .eq('usuario_id', context.usuario.id)
      .eq('ativo', true)

  const carteiraIds = context.usuario.tipo === 'admin_global'
    ? []
    : ((usuarioCarteirasResult.data ?? []) as Array<Record<string, any>>).map((row) => text(row.carteira_id)).filter(Boolean)

  const [carteirasResult, administradorasResult] = await Promise.all([
    context.usuario.tipo === 'admin_global'
      ? supabase.schema('core').from('carteiras').select('id,nome').eq('status', 'ativo').order('nome', { ascending: true })
      : carteiraIds.length
        ? supabase.schema('core').from('carteiras').select('id,nome').in('id', carteiraIds).eq('status', 'ativo').order('nome', { ascending: true })
        : { data: [], error: null },
    supabase.schema('ciclo').from('administradoras').select('id,nome').eq('ativo', true).order('nome', { ascending: true }),
  ])

  return {
    carteiras: ((carteirasResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      label: text(row.nome, 'Carteira'),
    })),
    administradoras: ((administradorasResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      label: text(row.nome, 'Administradora'),
    })),
  }
}

export async function getCicloCliente(id: string, context: CicloContext): Promise<CicloClienteRecord> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('clientes')
    .select('id,carteira_id,administradora_id,nome,nome_fantasia,razao_social,documento,email,telefone,cidade,estado,status_operacional,score_atual,risco_atual,temperatura,pasta_url,observacoes,ativo')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Cliente nao encontrado.')

  const row = data as Record<string, any>
  const formData = await getCicloClienteFormData(context)
  const allowedIds = new Set(formData.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/ciclo/clientes')
  }

  return {
    id: text(row.id),
    carteira_id: carteiraId || null,
    administradora_id: text(row.administradora_id) || null,
    nome: text(row.nome),
    nome_fantasia: text(row.nome_fantasia) || null,
    razao_social: text(row.razao_social) || null,
    documento: text(row.documento) || null,
    email: text(row.email) || null,
    telefone: text(row.telefone) || null,
    cidade: text(row.cidade) || null,
    estado: text(row.estado) || null,
    status_operacional: normalizeStatus(row.status_operacional),
    score_atual: numberValue(row.score_atual),
    risco_atual: normalizeRisco(row.risco_atual),
    temperatura: normalizeTemperatura(row.temperatura),
    pasta_url: text(row.pasta_url) || null,
    observacoes: text(row.observacoes) || null,
    ativo: Boolean(row.ativo ?? true),
  }
}

export async function getCicloClienteIntegral(id: string, context: CicloContext): Promise<CicloClienteIntegral> {
  const cliente = await getCicloCliente(id, context)
  const [formData, regularidadeResult, documentosResult, alertasResult, ocorrenciasResult, contratosResult, atasResult, timelineResult] = await Promise.all([
    getCicloClienteFormData(context),
    admin()
      .schema('ciclo')
      .from('regularidade_cliente')
      .select('percentual_regularidade,pendencias,status')
      .eq('cliente_id', id)
      .maybeSingle(),
    admin()
      .schema('ciclo')
      .from('cliente_documentos')
      .select('id,tipo_documento,titulo,status,obrigatorio,validado,data_renovacao,arquivo_url,observacoes,created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
    admin()
      .schema('ciclo')
      .from('alertas_cliente')
      .select('id,cliente_id,carteira_id,tipo,titulo,descricao,status,severidade,vencimento_em,origem,referencia_id,created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
    admin()
      .schema('ciclo')
      .from('ocorrencias')
      .select('id,cliente_id,carteira_id,tipo,impacto,titulo,descricao,peso,impacto_score,data_ocorrencia,metadata,created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
    admin()
      .schema('ciclo')
      .from('contratos')
      .select('id,cliente_id,carteira_id,numero_contrato,data_assinatura,data_inicio,data_fim,valor,indice_reajuste,proximo_reajuste,status,ativo,observacoes,created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
    admin()
      .schema('ciclo')
      .from('atas')
      .select('id,cliente_id,carteira_id,tipo,data_ata,data_validade,status,ativo,observacoes,created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
    admin()
      .schema('ciclo')
      .from('timeline_cliente')
      .select('id,tipo,titulo,descricao,created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  for (const result of [documentosResult, alertasResult, ocorrenciasResult, contratosResult, atasResult, timelineResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const regularidadeRow = (regularidadeResult.data ?? {}) as Record<string, any>
  const carteira = formData.carteiras.find((item) => item.id === cliente.carteira_id)?.label ?? 'Sem carteira'
  const administradora = formData.administradoras.find((item) => item.id === cliente.administradora_id)?.label ?? 'Sem administradora'

  return {
    cliente,
    carteira,
    administradora,
    regularidade: normalizePercent(regularidadeRow.percentual_regularidade),
    pendencias: Array.isArray(regularidadeRow.pendencias) ? regularidadeRow.pendencias.map((item) => text(item)).filter(Boolean) : [],
    documentos: ((documentosResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      tipo_documento: text(row.tipo_documento),
      titulo: text(row.titulo) || null,
      status: normalizeDocumentoStatus(row.status),
      obrigatorio: Boolean(row.obrigatorio),
      validado: Boolean(row.validado),
      data_renovacao: text(row.data_renovacao) || null,
      arquivo_url: text(row.arquivo_url) || null,
      observacoes: text(row.observacoes) || null,
    })),
    alertas: ((alertasResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      cliente_id: text(row.cliente_id) || null,
      carteira_id: text(row.carteira_id) || null,
      tipo: text(row.tipo, 'operacional'),
      titulo: text(row.titulo),
      descricao: text(row.descricao) || null,
      status: normalizeAlertaStatus(row.status),
      severidade: normalizeSeveridade(row.severidade),
      vencimento_em: text(row.vencimento_em) || null,
      origem: text(row.origem) || null,
      referencia_id: text(row.referencia_id) || null,
    })),
    ocorrencias: ((ocorrenciasResult.data ?? []) as Array<Record<string, any>>).map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, any>
      return {
        id: text(row.id),
        cliente_id: text(row.cliente_id) || null,
        carteira_id: text(row.carteira_id) || null,
        tipo: text(row.tipo, 'operacional'),
        impacto: text(row.impacto, 'neutro'),
        titulo: text(row.titulo),
        descricao: text(row.descricao) || null,
        peso: numberValue(row.peso),
        impacto_score: numberValue(row.impacto_score),
        data_ocorrencia: text(row.data_ocorrencia),
        status: text(metadata.status, 'aberta'),
        responsavel: text(metadata.responsavel) || null,
        prazo: text(metadata.prazo) || null,
      }
    }),
    contratos: ((contratosResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      cliente_id: text(row.cliente_id) || null,
      carteira_id: text(row.carteira_id) || null,
      numero_contrato: text(row.numero_contrato) || null,
      data_assinatura: text(row.data_assinatura) || null,
      data_inicio: text(row.data_inicio) || null,
      data_fim: text(row.data_fim) || null,
      valor: row.valor === null || row.valor === undefined ? null : numberValue(row.valor),
      indice_reajuste: text(row.indice_reajuste) || null,
      proximo_reajuste: text(row.proximo_reajuste) || null,
      status: text(row.status, 'ativo'),
      ativo: Boolean(row.ativo ?? true),
      observacoes: text(row.observacoes) || null,
    })),
    atas: ((atasResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      cliente_id: text(row.cliente_id) || null,
      carteira_id: text(row.carteira_id) || null,
      tipo: text(row.tipo) || null,
      data_ata: text(row.data_ata) || null,
      data_validade: text(row.data_validade) || null,
      status: text(row.status, 'vigente'),
      ativo: Boolean(row.ativo ?? true),
      observacoes: text(row.observacoes) || null,
    })),
    timeline: ((timelineResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      cliente: cliente.nome,
      titulo: text(row.titulo, 'Evento operacional'),
      descricao: text(row.descricao),
      tipo: text(row.tipo, 'evento'),
      createdAt: text(row.created_at),
    })),
  }
}

export async function getCicloDocumentoFormData(context: CicloContext): Promise<CicloDocumentoFormData> {
  const formData = await getCicloClienteFormData(context)
  const clientesResult = context.usuario.tipo === 'admin_global'
    ? await admin()
      .schema('ciclo')
      .from('clientes')
      .select('id,nome,nome_fantasia,razao_social,documento,carteira_id')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(500)
    : formData.carteiras.length
      ? await admin()
        .schema('ciclo')
        .from('clientes')
        .select('id,nome,nome_fantasia,razao_social,documento,carteira_id')
        .in('carteira_id', formData.carteiras.map((carteira) => carteira.id))
        .eq('ativo', true)
        .order('nome', { ascending: true })
        .limit(500)
      : { data: [], error: null }

  return {
    clientes: ((clientesResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      label: `${text(row.nome_fantasia ?? row.nome ?? row.razao_social, 'Cliente')} - ${text(row.documento, 'sem documento')}`,
    })),
  }
}

export async function getCicloDocumento(id: string, context: CicloContext): Promise<CicloDocumentoRecord> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('cliente_documentos')
    .select('id,cliente_id,carteira_id,tipo_documento,titulo,status,obrigatorio,aplicavel,validado,data_assinatura,data_realizacao,data_renovacao,arquivo_url,observacoes')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Documento nao encontrado.')

  const row = data as Record<string, any>
  const formData = await getCicloClienteFormData(context)
  const allowedIds = new Set(formData.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/ciclo/documentos')
  }

  return {
    id: text(row.id),
    cliente_id: text(row.cliente_id),
    carteira_id: carteiraId || null,
    tipo_documento: text(row.tipo_documento),
    titulo: text(row.titulo) || null,
    status: normalizeDocumentoStatus(row.status),
    obrigatorio: Boolean(row.obrigatorio),
    aplicavel: Boolean(row.aplicavel ?? true),
    validado: Boolean(row.validado),
    data_assinatura: text(row.data_assinatura) || null,
    data_realizacao: text(row.data_realizacao) || null,
    data_renovacao: text(row.data_renovacao) || null,
    arquivo_url: text(row.arquivo_url) || null,
    observacoes: text(row.observacoes) || null,
  }
}

export async function getCicloAlerta(id: string, context: CicloContext): Promise<CicloAlertaRecord> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('alertas_cliente')
    .select('id,cliente_id,carteira_id,tipo,titulo,descricao,status,severidade,vencimento_em,origem,referencia_id')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Alerta nao encontrado.')

  const row = data as Record<string, any>
  const formData = await getCicloClienteFormData(context)
  const allowedIds = new Set(formData.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/ciclo/alertas')
  }

  return {
    id: text(row.id),
    cliente_id: text(row.cliente_id) || null,
    carteira_id: carteiraId || null,
    tipo: text(row.tipo, 'operacional'),
    titulo: text(row.titulo),
    descricao: text(row.descricao) || null,
    status: normalizeAlertaStatus(row.status),
    severidade: normalizeSeveridade(row.severidade),
    vencimento_em: text(row.vencimento_em) ? text(row.vencimento_em).slice(0, 16) : null,
    origem: text(row.origem) || null,
    referencia_id: text(row.referencia_id) || null,
  }
}

export async function getCicloOcorrencia(id: string, context: CicloContext): Promise<CicloOcorrenciaRecord> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('ocorrencias')
    .select('id,cliente_id,carteira_id,tipo,impacto,titulo,descricao,peso,impacto_score,data_ocorrencia,metadata')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Ocorrencia nao encontrada.')

  const row = data as Record<string, any>
  const metadata = (row.metadata ?? {}) as Record<string, any>
  const formData = await getCicloClienteFormData(context)
  const allowedIds = new Set(formData.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/ciclo/ocorrencias')
  }

  return {
    id: text(row.id),
    cliente_id: text(row.cliente_id) || null,
    carteira_id: carteiraId || null,
    tipo: text(row.tipo, 'operacional'),
    impacto: text(row.impacto, 'neutro'),
    titulo: text(row.titulo),
    descricao: text(row.descricao) || null,
    peso: numberValue(row.peso),
    impacto_score: numberValue(row.impacto_score),
    data_ocorrencia: text(row.data_ocorrencia),
    status: text(metadata.status, 'aberta'),
    responsavel: text(metadata.responsavel) || null,
    prazo: text(metadata.prazo) || null,
  }
}

export async function getCicloContrato(id: string, context: CicloContext): Promise<CicloContratoRecord> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('contratos')
    .select('id,cliente_id,carteira_id,numero_contrato,data_assinatura,data_inicio,data_fim,valor,indice_reajuste,proximo_reajuste,status,ativo,observacoes')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Contrato nao encontrado.')

  const row = data as Record<string, any>
  const formData = await getCicloClienteFormData(context)
  const allowedIds = new Set(formData.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/ciclo/contratos')
  }

  return {
    id: text(row.id),
    cliente_id: text(row.cliente_id) || null,
    carteira_id: carteiraId || null,
    numero_contrato: text(row.numero_contrato) || null,
    data_assinatura: text(row.data_assinatura) || null,
    data_inicio: text(row.data_inicio) || null,
    data_fim: text(row.data_fim) || null,
    valor: row.valor === null || row.valor === undefined ? null : numberValue(row.valor),
    indice_reajuste: text(row.indice_reajuste) || null,
    proximo_reajuste: text(row.proximo_reajuste) || null,
    status: text(row.status, 'ativo'),
    ativo: Boolean(row.ativo ?? true),
    observacoes: text(row.observacoes) || null,
  }
}

export async function getCicloAta(id: string, context: CicloContext): Promise<CicloAtaRecord> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('atas')
    .select('id,cliente_id,carteira_id,tipo,data_ata,data_validade,status,ativo,observacoes')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Ata nao encontrada.')

  const row = data as Record<string, any>
  const formData = await getCicloClienteFormData(context)
  const allowedIds = new Set(formData.carteiras.map((carteira) => carteira.id))
  const carteiraId = text(row.carteira_id)

  if (context.usuario.tipo !== 'admin_global' && carteiraId && !allowedIds.has(carteiraId)) {
    redirect('/modulos/ciclo/atas')
  }

  return {
    id: text(row.id),
    cliente_id: text(row.cliente_id) || null,
    carteira_id: carteiraId || null,
    tipo: text(row.tipo) || null,
    data_ata: text(row.data_ata) || null,
    data_validade: text(row.data_validade) || null,
    status: text(row.status, 'vigente'),
    ativo: Boolean(row.ativo ?? true),
    observacoes: text(row.observacoes) || null,
  }
}

export async function getCicloAdministradora(id: string): Promise<CicloAdministradoraRecord> {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('administradoras')
    .select('id,nome,documento,email,telefone,site,observacoes,ativo')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Administradora nao encontrada.')

  const row = data as Record<string, any>
  return {
    id: text(row.id),
    nome: text(row.nome),
    documento: text(row.documento) || null,
    email: text(row.email) || null,
    telefone: text(row.telefone) || null,
    site: text(row.site) || null,
    observacoes: text(row.observacoes) || null,
    ativo: Boolean(row.ativo ?? true),
  }
}

export async function getCicloOnboardingDetail(id: string, context: CicloContext): Promise<CicloOnboardingDetail> {
  const cliente = await getCicloCliente(id, context)
  const [documentosResult, timelineResult] = await Promise.all([
    admin()
      .schema('ciclo')
      .from('cliente_documentos')
      .select('id,tipo_documento,titulo,status,obrigatorio,validado,data_renovacao,arquivo_url,observacoes,created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: true }),
    admin()
      .schema('ciclo')
      .from('timeline_cliente')
      .select('id,tipo,titulo,descricao,created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (documentosResult.error) throw new Error(documentosResult.error.message)
  if (timelineResult.error) throw new Error(timelineResult.error.message)

  const documentos = ((documentosResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
    id: text(row.id),
    tipo_documento: text(row.tipo_documento),
    titulo: text(row.titulo) || null,
    status: normalizeDocumentoStatus(row.status),
    obrigatorio: Boolean(row.obrigatorio),
    validado: Boolean(row.validado),
    data_renovacao: text(row.data_renovacao) || null,
    arquivo_url: text(row.arquivo_url) || null,
    observacoes: text(row.observacoes) || null,
  }))

  const obrigatorios = documentos.filter((documento) => documento.obrigatorio && documento.status !== 'dispensado')
  const concluidos = obrigatorios.filter((documento) => documento.validado).length

  return {
    cliente,
    documentos,
    timeline: ((timelineResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: text(row.id),
      cliente: cliente.nome,
      titulo: text(row.titulo, 'Evento operacional'),
      descricao: text(row.descricao),
      tipo: text(row.tipo, 'evento'),
      createdAt: text(row.created_at),
    })),
    progresso: {
      total: obrigatorios.length,
      concluidos,
      percentual: obrigatorios.length ? Math.round((concluidos / obrigatorios.length) * 100) : 0,
      pendentes: Math.max(obrigatorios.length - concluidos, 0),
    },
  }
}
