import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
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
  if (!value) return 'Sem data'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return text(value, 'Sem data')
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}

function formatBRL(value: unknown) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(numberValue(value))
}

function listTone(status: string): IntrListRow['tone'] {
  const normalized = status.toLowerCase()
  if (['ativo', 'aprovado', 'aprovada', 'pago', 'paga', 'fechado', 'concluido', 'processado'].some((item) => normalized.includes(item))) return 'success'
  if (['erro', 'cancelado', 'rejeitado', 'critico', 'bloqueado'].some((item) => normalized.includes(item))) return 'danger'
  if (['pendente', 'rascunho', 'aberto', 'reaberto', 'alerta', 'conferencia'].some((item) => normalized.includes(item))) return 'warning'
  return 'primary'
}

function mapColaborador(row: Record<string, unknown>): IntrColaborador {
  return {
    id: text(row.id),
    nome: text(row.nome, 'Colaborador'),
    email: text(row.email),
    cargo: text(row.cargo, 'Cargo nao informado'),
    time: text(row.time_nome ?? row.time, 'Sem time'),
    status: text(row.status, 'ativo'),
    gestor: text(row.gestor_nome ?? row.gestor, 'Sem gestor'),
    vencimentos: numberValue(row.total_vencimentos ?? row.vencimentos),
    beneficios: numberValue(row.total_beneficios ?? row.beneficios),
  }
}

function sortByNome<T extends { nome: string }>(items: T[]) {
  return items.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
}

async function safeList(table: string, limit = 200) {
  const { data, error } = await admin().from(table).select('*').limit(limit)
  if (error) return { rows: [] as Array<Record<string, unknown>>, ok: false }
  return { rows: (data ?? []) as Array<Record<string, unknown>>, ok: true }
}

export async function requireIntrContext() {
  return requireModuleAccess('intr')
}

export async function getIntrData(): Promise<IntrData> {
  const [colaboradores, fluxoMensal, receitasCategoria, rankingVendedores, alertas] = await Promise.all([
    safeList('gkli_intr_colaboradores_resumo', 300),
    safeList('gkli_intr_cockpit_fluxo_mensal', 12),
    safeList('gkli_intr_cockpit_receitas_categoria', 8),
    safeList('gkli_intr_cockpit_ranking_vendedores', 8),
    safeList('gkli_intr_cockpit_alertas', 20),
  ])

  return {
    colaboradores: sortByNome(colaboradores.rows.map(mapColaborador)),
    fluxoMensal: fluxoMensal.rows,
    receitasCategoria: receitasCategoria.rows,
    rankingVendedores: rankingVendedores.rows,
    alertas: alertas.rows.filter((row) => numberValue(row.quantidade) > 0),
    databaseReady: colaboradores.ok || fluxoMensal.ok || receitasCategoria.ok || rankingVendedores.ok || alertas.ok,
  }
}

export async function listIntrTimeRows(): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_times_resumo', 200)
  if (rows.length) {
    return rows.map((row, index) => {
      const status = text(row.ativo === false ? 'inativo' : row.status, 'ativo')
      return {
        id: text(row.id, `time-${index}`),
        title: text(row.nome, 'Time'),
        subtitle: text(row.descricao, 'Agrupamento operacional'),
        status,
        value: formatBRL(row.custo_mensal_estimado ?? row.custo_total ?? row.valor_total),
        meta: `${numberValue(row.total_colaboradores ?? row.colaboradores)} colaboradores`,
        tone: listTone(status),
      }
    })
  }

  const data = await getIntrData()
  const grouped = new Map<string, { count: number; cost: number }>()
  for (const colaborador of data.colaboradores) {
    const key = colaborador.time || 'Sem time'
    const current = grouped.get(key) ?? { count: 0, cost: 0 }
    current.count += 1
    current.cost += colaborador.vencimentos + colaborador.beneficios
    grouped.set(key, current)
  }

  return Array.from(grouped.entries()).map(([time, summary], index) => ({
    id: `time-${index}`,
    title: time,
    subtitle: 'Derivado da base de colaboradores',
    status: 'ativo',
    value: formatBRL(summary.cost),
    meta: `${summary.count} colaboradores`,
    tone: 'success',
  }))
}

export async function listIntrPagamentoRows(): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_pagamentos_resumo', 300)
  return rows.map((row, index) => {
    const status = text(row.status, 'previsto')
    return {
      id: text(row.id, `pagamento-${index}`),
      title: text(row.colaborador_nome ?? row.nome_colaborador ?? row.nome, 'Pagamento'),
      subtitle: `${text(row.tipo ?? row.tipo_nome ?? row.pagamento_tipo_nome, 'Tipo')} - ${text(row.time_nome, 'Sem time')}`,
      status,
      value: formatBRL(row.valor_liquido ?? row.valor_bruto ?? row.valor),
      meta: dateLabel(row.competencia ?? row.data_pagamento ?? row.data_prevista ?? row.criado_em),
      tone: listTone(status),
    }
  })
}

export async function listIntrPagamentoAgendaRows(): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_pagamento_agendas_resumo', 300)
  return rows.map((row, index) => {
    const status = text(row.ativo === false ? 'inativa' : 'ativa', 'ativa')
    return {
      id: text(row.id, `agenda-${index}`),
      title: text(row.colaborador_nome ?? row.nome_colaborador, 'Agenda'),
      subtitle: `${text(row.tipo, 'Pagamento')} - dia ${text(row.dia_previsto, '-')}`,
      status,
      value: formatBRL(row.valor_liquido ?? row.valor_bruto),
      meta: numberValue(row.percentual) > 0
        ? `${numberValue(row.percentual).toLocaleString('pt-BR')}% desde ${dateLabel(row.inicio_competencia)}`
        : `desde ${dateLabel(row.inicio_competencia)}`,
      tone: listTone(status),
    }
  })
}

export async function listIntrComissaoRows(): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_comissoes_resumo', 300)
  const groups = new Map<string, {
    colaboradorKey: string
    colaboradorNome: string
    competencia: Set<string>
    count: number
    status: string[]
    tipo: string
    total: number
  }>()

  rows.forEach((row) => {
    const colaboradorNome = text(row.colaborador_nome ?? row.vendedor_nome ?? row.nome, 'Colaborador')
    const colaboradorKey = text(row.colaborador_id) || colaboradorNome
    const tipo = text(row.tipo_comissao_nome ?? row.categoria_importada ?? row.categoria, 'Tipo de comissao')
    const key = `${colaboradorKey}::${tipo}`
    const current = groups.get(key) ?? {
      colaboradorKey,
      colaboradorNome,
      competencia: new Set<string>(),
      count: 0,
      status: [],
      tipo,
      total: 0,
    }
    current.count += 1
    current.total += numberValue(row.valor_comissao ?? row.comissao_total ?? row.valor)
    current.status.push(text(row.status, 'calculada'))
    const competencia = text(row.competencia)
    if (competencia) current.competencia.add(dateLabel(competencia))
    groups.set(key, current)
  })

  return Array.from(groups.values())
    .sort((a, b) => `${a.colaboradorNome} ${a.tipo}`.localeCompare(`${b.colaboradorNome} ${b.tipo}`, 'pt-BR', { sensitivity: 'base' }))
    .map((group) => {
      const status = group.status.includes('em_conferencia')
        ? 'em_conferencia'
        : group.status.includes('calculada')
          ? 'calculada'
          : group.status.includes('aprovada')
            ? 'aprovada'
            : group.status[0] ?? 'calculada'

      return {
        id: `${group.colaboradorKey}::${group.tipo}`,
        title: group.colaboradorNome,
        subtitle: group.tipo,
        status,
        value: formatBRL(group.total),
        meta: `${group.count} lancamento(s)${group.competencia.size ? ` - ${Array.from(group.competencia).slice(0, 3).join(', ')}` : ''}`,
        detailHref: `/modulos/intr/comissoes/conferir?colaborador=${encodeURIComponent(group.colaboradorKey)}&tipo=${encodeURIComponent(group.tipo)}`,
        tone: listTone(status),
      }
    })
}

export async function listIntrComissaoDetalheRows({
  colaborador,
  tipo,
}: {
  colaborador?: string
  tipo?: string
}): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_comissoes_resumo', 300)
  return rows.filter((row) => {
    const colaboradorKey = text(row.colaborador_id) || text(row.colaborador_nome ?? row.vendedor_nome ?? row.nome, 'Colaborador')
    const tipoComissao = text(row.tipo_comissao_nome ?? row.categoria_importada ?? row.categoria, 'Tipo de comissao')
    return (!colaborador || colaboradorKey === colaborador) && (!tipo || tipoComissao === tipo)
  }).map((row, index) => {
    const status = text(row.status, 'calculada')
    return {
      id: text(row.id, `comissao-${index}`),
      title: text(row.colaborador_nome ?? row.vendedor_nome ?? row.nome, 'Comissao'),
      subtitle: `${text(row.categoria_importada ?? row.categoria ?? row.tipo_comissao_nome, 'Categoria')} - ${text(row.cliente, 'Sem cliente')}`,
      status,
      value: formatBRL(row.valor_comissao ?? row.comissao_total ?? row.valor),
      meta: dateLabel(row.competencia ?? row.criado_em),
      tone: listTone(status),
    }
  })
}

export async function listIntrReceitaRows(): Promise<IntrListRow[]> {
  const resumo = await safeList('gkli_intr_receitas_resumo', 300)
  if (resumo.rows.length) {
    return resumo.rows.map((row, index) => {
      const status = text(row.status, 'recebida')
      return {
        id: text(row.id, `receita-${index}`),
        title: text(row.cliente ?? row.cliente_nome ?? row.nome, 'Receita'),
        subtitle: `${text(row.categoria ?? row.categoria_nome ?? row.categoria_importada, 'Categoria')} - ${text(row.vendedor_nome, 'Sem vendedor')}`,
        status,
        value: formatBRL(row.valor_recebido ?? row.valor_total ?? row.valor),
        meta: dateLabel(row.ultimo_recebimento ?? row.previsao_recebimento ?? row.criado_em),
        tone: listTone(status),
      }
    })
  }

  const categorias = await safeList('gkli_intr_cockpit_receitas_categoria', 20)
  return categorias.rows.map((row, index) => ({
    id: text(row.id, `categoria-${index}`),
    title: text(row.categoria ?? row.nome, 'Categoria'),
    subtitle: text(row.descricao, 'Resumo por categoria'),
    status: 'consolidado',
    value: formatBRL(row.valor_total ?? row.valor ?? row.total),
    meta: `${numberValue(row.quantidade ?? row.total_receitas)} receitas`,
    tone: 'primary',
  }))
}

export async function listIntrFechamentoRows(): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_fechamentos_resumo', 200)
  return rows.map((row, index) => {
    const status = text(row.status, 'aberto')
    return {
      id: text(row.id, `fechamento-${index}`),
      title: text(row.competencia_label ?? row.competencia, 'Competencia'),
      subtitle: `${numberValue(row.pendencias_total)} pendencias`,
      status,
      value: formatBRL(row.saldo_operacional ?? row.receita_total),
      meta: dateLabel(row.atualizado_em ?? row.criado_em ?? row.competencia),
      tone: listTone(status),
    }
  })
}

export async function listIntrDocumentRows(): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_documentos_resumo', 200)
  return rows.map((row, index) => {
    const status = text(row.status, 'ativo')
    return {
      id: text(row.id, `documento-${index}`),
      title: text(row.titulo ?? row.nome ?? row.nome_arquivo, 'Documento'),
      subtitle: text(row.colaborador_nome ?? row.tipo ?? row.descricao, 'Documento interno'),
      status,
      value: text(row.tipo ?? row.categoria, '-'),
      meta: dateLabel(row.atualizado_em ?? row.criado_em),
      tone: listTone(status),
    }
  })
}

export async function listIntrReembolsoRows(): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_reembolsos_resumo', 200)
  return rows.map((row, index) => {
    const status = text(row.status, 'pendente')
    return {
      id: text(row.id, `reembolso-${index}`),
      title: text(row.colaborador_nome ?? row.nome, 'Reembolso'),
      subtitle: text(row.descricao ?? row.categoria, 'Solicitacao interna'),
      status,
      value: formatBRL(row.valor_aprovado ?? row.valor_solicitado ?? row.valor),
      meta: dateLabel(row.data_solicitacao ?? row.criado_em),
      tone: listTone(status),
    }
  })
}

export async function listIntrComunicadoRows(): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_comunicados_resumo', 200)
  return rows.map((row, index) => {
    const status = text(row.status, 'publicado')
    return {
      id: text(row.id, `comunicado-${index}`),
      title: text(row.titulo ?? row.assunto, 'Comunicado'),
      subtitle: text(row.resumo ?? row.publico ?? row.descricao, 'Comunicacao interna'),
      status,
      value: text(row.canal ?? row.tipo, '-'),
      meta: dateLabel(row.publicado_em ?? row.criado_em),
      tone: listTone(status),
    }
  })
}

export async function listIntrCadastroRows(): Promise<IntrListRow[]> {
  const [times, categorias, tipos] = await Promise.all([
    safeList('gkli_intr_times_resumo', 200),
    safeList('gkli_intr_receita_categorias_resumo', 200),
    safeList('gkli_intr_comissao_tipos_resumo', 200),
  ])

  return [
    { id: 'colaboradores', title: 'Colaboradores', subtitle: 'Pessoas, gestores e custos mensais', status: 'publicado', value: '-', meta: 'Cadastro principal', tone: 'success' },
    { id: 'times', title: 'Times', subtitle: 'Agrupamento operacional por equipe', status: times.ok ? 'conectado' : 'pendente', value: String(times.rows.length), meta: 'Registros estruturais', tone: times.ok ? 'success' : 'warning' },
    { id: 'categorias', title: 'Categorias de Receita', subtitle: 'Categorias financeiras importadas', status: categorias.ok ? 'conectado' : 'pendente', value: String(categorias.rows.length), meta: 'Receitas', tone: categorias.ok ? 'success' : 'warning' },
    { id: 'tipos-comissao', title: 'Tipos de Comissao', subtitle: 'Percentuais e regras de comissao', status: tipos.ok ? 'conectado' : 'pendente', value: String(tipos.rows.length), meta: 'Comissoes', tone: tipos.ok ? 'success' : 'warning' },
  ]
}

export async function listIntrImportacaoRows(): Promise<IntrListRow[]> {
  const { rows } = await safeList('gkli_intr_receita_importacoes_resumo', 200)
  return rows.map((row, index) => {
    const status = text(row.status, 'processado')
    return {
      id: text(row.id, `importacao-${index}`),
      title: text(row.nome_arquivo ?? row.arquivo, 'Importação'),
      subtitle: `${numberValue(row.total_receitas ?? row.total_linhas)} linhas - ${numberValue(row.total_alertas ?? row.total_erros)} alertas`,
      status,
      value: formatBRL(row.valor_recebido_total ?? row.valor_base_total ?? row.valor_total),
      meta: dateLabel(row.criado_em ?? row.atualizado_em),
      tone: listTone(status),
    }
  })
}

export async function listIntrComissaoTipoRows(): Promise<IntrListRow[]> {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('comissao_tipos')
    .select('id,nome,categoria,percentual,comissao_de_time,ativo,atualizado_em')
    .order('nome', { ascending: true })
    .limit(300)

  if (error) return []
  return ((data ?? []) as Array<Record<string, unknown>>).map((row, index) => {
    const active = row.ativo !== false
    return {
      id: text(row.id, `tipo-${index}`),
      title: text(row.nome, 'Tipo de comissao'),
      subtitle: text(row.categoria, 'Sem categoria vinculada'),
      status: active ? 'ativo' : 'inativo',
      value: `${numberValue(row.percentual).toLocaleString('pt-BR')}%`,
      meta: row.comissao_de_time === true ? `Comissao de time - ${dateLabel(row.atualizado_em)}` : dateLabel(row.atualizado_em),
      tone: active ? 'success' : 'warning',
    }
  })
}

export async function getIntrFormData(): Promise<IntrFormData> {
  const supabase = admin()
  const { data: colaboradorTipo } = await supabase
    .schema('core')
    .from('usuario_tipos')
    .select('id')
    .eq('codigo', 'colaborador')
    .maybeSingle()

  const [colaboradores, coreUsuarios, times, comissoes, receitas] = await Promise.all([
    supabase.schema('gkli_intr').from('colaboradores').select('id,nome,email,status').order('nome', { ascending: true }).limit(500),
    colaboradorTipo?.id
      ? supabase.schema('security').from('usuarios').select('id,nome,email,status,tipo_id').eq('tipo_id', colaboradorTipo.id).order('nome', { ascending: true }).limit(500)
      : supabase.schema('security').from('usuarios').select('id,nome,email,status,tipo_id').order('nome', { ascending: true }).limit(500),
    admin().schema('gkli_intr').from('times').select('id,nome,ativo').order('nome', { ascending: true }).limit(200),
    admin().schema('gkli_intr').from('comissoes').select('id,cliente,valor_comissao,status,competencia').order('criado_em', { ascending: false }).limit(500),
    admin().schema('gkli_intr').from('receitas').select('id,cliente,categoria,valor_recebido,status,competencia').order('competencia', { ascending: false }).limit(500),
  ])

  return {
    colaboradores: ((colaboradores.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: text(row.id),
      label: `${text(row.nome, 'Colaborador')} - ${text(row.email, 'sem e-mail')}`,
    })),
    coreUsuarios: ((coreUsuarios.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: text(row.id),
      email: text(row.email),
      label: `${text(row.nome, 'Usuario')} - ${text(row.email, 'sem e-mail')}`,
      nome: text(row.nome),
    })),
    times: ((times.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: text(row.id),
      label: text(row.nome, 'Time'),
    })),
    comissoes: ((comissoes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: text(row.id),
      label: `${text(row.cliente, 'Comissao')} - ${formatBRL(row.valor_comissao)} - ${text(row.status, 'calculada')}`,
    })),
    receitas: ((receitas.error ? [] : receitas.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: text(row.id),
      label: `${text(row.cliente, 'Receita')} - ${text(row.categoria, 'sem categoria')} - ${formatBRL(row.valor_recebido)}`,
    })),
  }
}

export async function getIntrFechamento(id: string): Promise<IntrFechamentoRecord> {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('fechamentos')
    .select('id,competencia,status,receita_total,comissao_total,pagamentos_previstos_total,pagamentos_pagos_total,saldo_operacional,pendencias_total,observacao')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Fechamento nao encontrado.')
  const row = data as Record<string, unknown>
  return {
    id: text(row.id),
    competencia: text(row.competencia),
    status: text(row.status, 'aberto'),
    receita_total: numberValue(row.receita_total),
    comissao_total: numberValue(row.comissao_total),
    pagamentos_previstos_total: numberValue(row.pagamentos_previstos_total),
    pagamentos_pagos_total: numberValue(row.pagamentos_pagos_total),
    saldo_operacional: numberValue(row.saldo_operacional),
    pendencias_total: numberValue(row.pendencias_total),
    observacao: text(row.observacao) || null,
  }
}

export async function getIntrTime(id: string): Promise<IntrTimeRecord> {
  const { data, error } = await admin().schema('gkli_intr').from('times').select('id,nome,descricao,ativo').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Time nao encontrado.')
  const row = data as Record<string, unknown>
  return {
    id: text(row.id),
    nome: text(row.nome),
    descricao: text(row.descricao) || null,
    ativo: Boolean(row.ativo ?? true),
  }
}

export async function getIntrColaborador(id: string): Promise<IntrColaboradorRecord> {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('colaboradores')
    .select('id,usuario_id,nome,cpf_cnpj,email,telefone,status,time_id,cargo,gestor_id,salario,pro_labore,ajuda_custo,participacao_honorarios,outros_vencimentos,beneficio_descricao,beneficio_valor,observacoes')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Colaborador nao encontrado.')
  const row = data as Record<string, unknown>
  return {
    id: text(row.id),
    usuario_id: text(row.usuario_id) || null,
    nome: text(row.nome),
    cpf_cnpj: text(row.cpf_cnpj) || null,
    email: text(row.email),
    telefone: text(row.telefone) || null,
    status: text(row.status, 'ativo'),
    time_id: text(row.time_id) || null,
    cargo: text(row.cargo) || null,
    gestor_id: text(row.gestor_id) || null,
    salario: numberValue(row.salario),
    pro_labore: numberValue(row.pro_labore),
    ajuda_custo: numberValue(row.ajuda_custo),
    participacao_honorarios: numberValue(row.participacao_honorarios),
    outros_vencimentos: numberValue(row.outros_vencimentos),
    beneficio_descricao: text(row.beneficio_descricao) || null,
    beneficio_valor: numberValue(row.beneficio_valor),
    observacoes: text(row.observacoes) || null,
  }
}

export async function getIntrComissao(id: string): Promise<IntrComissaoRecord> {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('comissoes')
    .select('id,colaborador_id,receita_id,fechamento_id,vendedor_nome,cliente,categoria,tipo_comissao_nome,percentual,valor_base,valor_comissao,competencia,data_recebimento,status,observacao,origem')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Comissao nao encontrada.')
  const row = data as Record<string, unknown>
  return {
    id: text(row.id),
    colaborador_id: text(row.colaborador_id),
    receita_id: text(row.receita_id) || null,
    fechamento_id: text(row.fechamento_id) || null,
    vendedor_nome: text(row.vendedor_nome) || null,
    cliente: text(row.cliente) || null,
    categoria: text(row.categoria) || null,
    tipo_comissao_nome: text(row.tipo_comissao_nome) || null,
    percentual: numberValue(row.percentual),
    valor_base: numberValue(row.valor_base),
    valor_comissao: numberValue(row.valor_comissao),
    competencia: text(row.competencia) || null,
    data_recebimento: text(row.data_recebimento) || null,
    status: text(row.status, 'calculada'),
    observacao: text(row.observacao) || null,
    origem: text(row.origem) || null,
  }
}

export async function getIntrReceita(id: string): Promise<IntrReceitaRecord> {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('receitas')
    .select('id,colaborador_id,vendedor_nome,cliente,categoria,descricao,competencia,data_recebimento,valor_base,valor_recebido,status,origem,observacao')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Receita nao encontrada.')
  const row = data as Record<string, unknown>
  return {
    id: text(row.id),
    colaborador_id: text(row.colaborador_id) || null,
    vendedor_nome: text(row.vendedor_nome) || null,
    cliente: text(row.cliente),
    categoria: text(row.categoria) || null,
    descricao: text(row.descricao) || null,
    competencia: text(row.competencia),
    data_recebimento: text(row.data_recebimento) || null,
    valor_base: numberValue(row.valor_base),
    valor_recebido: numberValue(row.valor_recebido),
    status: text(row.status, 'recebida'),
    origem: text(row.origem) || null,
    observacao: text(row.observacao) || null,
  }
}

export async function getIntrPagamento(id: string): Promise<IntrPagamentoRecord> {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('pagamentos')
    .select('id,colaborador_id,agenda_id,fechamento_id,tipo,descricao,competencia,data_prevista,data_pagamento,valor_bruto,valor_descontos,status,comissao_id,origem,observacao')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Pagamento nao encontrado.')
  const row = data as Record<string, unknown>
  return {
    id: text(row.id),
    colaborador_id: text(row.colaborador_id),
    agenda_id: text(row.agenda_id) || null,
    fechamento_id: text(row.fechamento_id) || null,
    tipo: text(row.tipo) || null,
    descricao: text(row.descricao) || null,
    competencia: text(row.competencia),
    data_prevista: text(row.data_prevista) || null,
    data_pagamento: text(row.data_pagamento) || null,
    valor_bruto: numberValue(row.valor_bruto),
    valor_descontos: numberValue(row.valor_descontos),
    status: text(row.status, 'previsto'),
    comissao_id: text(row.comissao_id) || null,
    origem: text(row.origem) || null,
    observacao: text(row.observacao) || null,
  }
}

export async function getIntrPagamentoAgenda(id: string): Promise<IntrPagamentoAgendaRecord> {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('pagamento_agendas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Agenda nao encontrada.')
  const row = data as Record<string, unknown>
  return {
    id: text(row.id),
    colaborador_id: text(row.colaborador_id),
    tipo: text(row.tipo),
    descricao: text(row.descricao) || null,
    dia_previsto: numberValue(row.dia_previsto),
    percentual: numberValue(row.percentual),
    valor_bruto: numberValue(row.valor_bruto),
    valor_descontos: numberValue(row.valor_descontos),
    inicio_competencia: text(row.inicio_competencia),
    fim_competencia: text(row.fim_competencia) || null,
    ativo: Boolean(row.ativo ?? true),
    origem: text(row.origem) || null,
    observacao: text(row.observacao) || null,
  }
}

export async function getIntrComissaoTipo(id: string): Promise<IntrComissaoTipoRecord> {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('comissao_tipos')
    .select('id,nome,categoria,percentual,comissao_de_time,ativo,observacao')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Tipo de comissao nao encontrado.')
  const row = data as Record<string, unknown>
  return {
    id: text(row.id),
    nome: text(row.nome),
    categoria: text(row.categoria) || null,
    percentual: numberValue(row.percentual),
    comissao_de_time: row.comissao_de_time === true,
    ativo: row.ativo !== false,
    observacao: text(row.observacao) || null,
  }
}

export async function listIntrIntegridadeRows(): Promise<IntrListRow[]> {
  const [competencias, data] = await Promise.all([
    safeList('gkli_intr_fechamentos_resumo', 200),
    getIntrData(),
  ])

  const rows = competencias.rows.map((row, index) => {
    const status = text(row.bloqueada ? 'bloqueado' : row.status, 'aberto')
    return {
      id: text(row.id, `competencia-${index}`),
      title: text(row.competencia_label ?? row.competencia, 'Competencia'),
      subtitle: `${numberValue(row.pendencias_total)} pendencias antes do fechamento`,
      status,
      value: formatBRL(row.saldo_operacional ?? row.receita_total),
      meta: dateLabel(row.atualizado_em ?? row.criado_em),
      tone: listTone(status),
    }
  })

  if (rows.length) return rows

  return data.alertas.map((row, index) => ({
    id: text(row.tipo, `alerta-${index}`),
    title: text(row.titulo ?? row.tipo, 'Alerta'),
    subtitle: text(row.descricao, 'Ponto de integridade'),
    status: 'alerta',
    value: String(numberValue(row.quantidade)),
    meta: 'Cockpit',
    tone: 'warning',
  }))
}
