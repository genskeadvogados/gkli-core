import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function admin() {
  return createSupabaseAdminClient() as any
}

export async function getDashboardStats() {
  const supabase = admin()

  const [
    usuarios,
    usuariosAtivos,
    carteiras,
    apps,
    perfis,
    eventos,
  ] = await Promise.all([
    supabase.schema('security').from('usuarios').select('id', { count: 'exact', head: true }),
    supabase.schema('security').from('usuarios').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.schema('core').from('carteiras').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.schema('core').from('apps').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.schema('security').from('perfis').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.schema('audit').from('v_eventos_admin').select('*').order('created_at', { ascending: false }).limit(8),
  ])

  return {
    totalUsuarios: usuarios.count ?? 0,
    usuariosAtivos: usuariosAtivos.count ?? 0,
    carteirasAtivas: carteiras.count ?? 0,
    appsAtivos: apps.count ?? 0,
    perfisAtivos: perfis.count ?? 0,
    eventos: eventos.data ?? [],
  }
}

export async function listUsuarios() {
  const { data, error } = await admin()
    .schema('security')
    .from('v_usuarios_admin')
    .select('*')
    .order('nome', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listUsuarioTipos() {
  const { data, error } = await admin()
    .schema('core')
    .from('usuario_tipos')
    .select('id,codigo,nome,descricao,ativo,criado_em,atualizado_em')
    .order('nome', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getUsuarioTipo(id: string) {
  const { data, error } = await admin()
    .schema('core')
    .from('usuario_tipos')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getUsuario(id: string) {
  const { data, error } = await admin()
    .schema('security')
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getUsuarioRelations(id: string) {
  const supabase = admin()

  const [carteiras, apps, perfis] = await Promise.all([
    supabase.schema('security').from('usuario_carteiras').select('carteira_id').eq('usuario_id', id),
    supabase.schema('security').from('usuario_app_acessos').select('app_id').eq('usuario_id', id),
    supabase.schema('security').from('usuario_perfis').select('perfil_id').eq('usuario_id', id),
  ])

  return {
    carteiras: (carteiras.data ?? []).map((x: any) => x.carteira_id),
    apps: (apps.data ?? []).map((x: any) => x.app_id),
    perfis: (perfis.data ?? []).map((x: any) => x.perfil_id),
  }
}

export async function listCarteiras() {
  const { data, error } = await admin()
    .schema('security')
    .from('v_carteiras_admin')
    .select('*')
    .order('nome', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCarteira(id: string) {
  const { data, error } = await admin()
    .schema('core')
    .from('carteiras')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function listApps() {
  const { data, error } = await admin()
    .schema('security')
    .from('v_apps_admin')
    .select('*')
    .order('nome', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getApp(id: string) {
  const { data, error } = await admin()
    .schema('core')
    .from('apps')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function listPerfis() {
  const { data, error } = await admin()
    .schema('security')
    .from('v_perfis_admin')
    .select('*')
    .order('nivel', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPerfil(id: string) {
  const { data, error } = await admin()
    .schema('security')
    .from('perfis')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getPerfilPermissoes(id: string) {
  const { data, error } = await admin()
    .schema('security')
    .from('perfil_permissoes')
    .select('permissao_id')
    .eq('perfil_id', id)

  if (error) throw new Error(error.message)
  return (data ?? []).map((x: any) => x.permissao_id)
}

export async function listPermissoes() {
  const { data, error } = await admin()
    .schema('security')
    .from('v_permissoes_admin')
    .select('*')
    .order('codigo', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listEventos() {
  const { data, error } = await admin()
    .schema('audit')
    .from('v_eventos_admin')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data ?? []
}
