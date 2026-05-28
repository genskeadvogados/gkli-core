export type IntrColaborador = {
  id: string
  nome: string
  email: string
  cargo: string
  time: string
  status: string
  gestor: string
  vencimentos: number
  beneficios: number
}

export type IntrData = {
  colaboradores: IntrColaborador[]
  fluxoMensal: Array<Record<string, unknown>>
  receitasCategoria: Array<Record<string, unknown>>
  rankingVendedores: Array<Record<string, unknown>>
  alertas: Array<Record<string, unknown>>
  databaseReady: boolean
}

export type IntrListRow = {
  id: string
  title: string
  subtitle: string
  status: string
  value: string
  meta: string
  detailHref?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}

export type IntrFormOption = {
  id: string
  label: string
  email?: string
  nome?: string
}

export type IntrFormData = {
  colaboradores: IntrFormOption[]
  comissoes: IntrFormOption[]
  coreUsuarios: IntrFormOption[]
  receitas: IntrFormOption[]
  times: IntrFormOption[]
}

export type IntrTimeRecord = {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
}

export type IntrColaboradorRecord = {
  id: string
  usuario_id: string | null
  nome: string
  cpf_cnpj: string | null
  email: string
  telefone: string | null
  status: string
  time_id: string | null
  cargo: string | null
  gestor_id: string | null
  salario: number
  pro_labore: number
  ajuda_custo: number
  participacao_honorarios: number
  outros_vencimentos: number
  beneficio_descricao: string | null
  beneficio_valor: number
  observacoes: string | null
}

export type IntrComissaoRecord = {
  id: string
  colaborador_id: string
  receita_id: string | null
  fechamento_id: string | null
  vendedor_nome: string | null
  cliente: string | null
  categoria: string | null
  tipo_comissao_nome: string | null
  percentual: number
  valor_base: number
  valor_comissao: number
  competencia: string | null
  data_recebimento: string | null
  status: string
  observacao: string | null
  origem: string | null
}

export type IntrFechamentoRecord = {
  id: string
  competencia: string
  status: string
  receita_total: number
  comissao_total: number
  pagamentos_previstos_total: number
  pagamentos_pagos_total: number
  saldo_operacional: number
  pendencias_total: number
  observacao: string | null
}

export type IntrReceitaRecord = {
  id: string
  colaborador_id: string | null
  vendedor_nome: string | null
  cliente: string
  categoria: string | null
  descricao: string | null
  competencia: string
  data_recebimento: string | null
  valor_base: number
  valor_recebido: number
  status: string
  origem: string | null
  observacao: string | null
}

export type IntrPagamentoRecord = {
  id: string
  colaborador_id: string
  agenda_id: string | null
  fechamento_id: string | null
  tipo: string | null
  descricao: string | null
  competencia: string
  data_prevista: string | null
  data_pagamento: string | null
  valor_bruto: number
  valor_descontos: number
  status: string
  comissao_id: string | null
  origem: string | null
  observacao: string | null
}

export type IntrPagamentoAgendaRecord = {
  id: string
  colaborador_id: string
  tipo: string
  descricao: string | null
  dia_previsto: number
  percentual: number
  valor_bruto: number
  valor_descontos: number
  inicio_competencia: string
  fim_competencia: string | null
  ativo: boolean
  origem: string | null
  observacao: string | null
}

export type IntrComissaoTipoRecord = {
  id: string
  nome: string
  categoria: string | null
  percentual: number
  comissao_de_time: boolean
  ativo: boolean
  observacao: string | null
}
