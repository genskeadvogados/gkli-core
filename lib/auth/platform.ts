import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUsuarioPermissionCodes } from '@/lib/auth/permissions'

export type PlatformUsuario = {
  id: string
  nome: string
  email: string
  tipo: string
  status: string
}

export type PlatformModule = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  status: string
  href: string
}

const MODULE_PATHS: Record<string, string> = {
  ciclo: '/modulos/ciclo',
  core: '/admin',
  crm: '/modulos/crm',
  intr: '/modulos/intr',
  colab: '/modulos/colab',
  painel: '/modulos/painel',
  sind: '/modulos/sind',
}

function admin() {
  return createSupabaseAdminClient() as any
}

function safeNext(next: string) {
  return next.startsWith('/') && !next.startsWith('//') ? next : '/plataforma'
}

function moduleHref(app: any) {
  if (typeof app.url_path === 'string' && app.url_path.startsWith('/') && !app.url_path.startsWith('//')) {
    return app.url_path
  }

  return MODULE_PATHS[String(app.codigo)] ?? `/modulos/${app.codigo}`
}

function normalizeModule(app: any): PlatformModule {
  return {
    id: app.id,
    codigo: String(app.codigo),
    nome: app.nome,
    descricao: app.descricao,
    status: app.status,
    href: moduleHref(app),
  }
}

async function listActiveModulesFor(usuario: PlatformUsuario, permissions: string[]): Promise<PlatformModule[]> {
  const supabase = admin()

  if (usuario.tipo === 'admin_global' || permissions.includes('*')) {
    const { data, error } = await supabase
      .schema('core')
      .from('apps')
      .select('*')
      .eq('status', 'ativo')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map(normalizeModule)
  }

  const { data: accessRows, error: accessError } = await supabase
    .schema('security')
    .from('usuario_app_acessos')
    .select('app_id')
    .eq('usuario_id', usuario.id)
    .eq('ativo', true)

  if (accessError) throw new Error(accessError.message)

  const appIds = [...new Set((accessRows ?? []).map((row: any) => row.app_id))]
  if (!appIds.length) return []

  const { data, error } = await supabase
    .schema('core')
    .from('apps')
    .select('*')
    .in('id', appIds)
    .eq('status', 'ativo')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizeModule)
}

export async function requirePlatformContext(next = '/plataforma'): Promise<{
  authUser: User
  usuario: PlatformUsuario
  permissions: string[]
  modules: PlatformModule[]
}> {
  const target = safeNext(next)
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(`/login?next=${encodeURIComponent(target)}`)
  }

  const { data: usuario, error } = await admin()
    .schema('security')
    .from('usuarios')
    .select('id, nome, email, tipo, status')
    .eq('id', user.id)
    .single()

  if (error || !usuario || usuario.status !== 'ativo') {
    redirect(`/logout?next=${encodeURIComponent(target)}&error=${encodeURIComponent('Sessão sem acesso ativo.')}`)
  }

  const typedUsuario = usuario as PlatformUsuario
  const permissions = await getUsuarioPermissionCodes(typedUsuario)
  const modules = await listActiveModulesFor(typedUsuario, permissions)

  return {
    authUser: user,
    usuario: typedUsuario,
    permissions,
    modules,
  }
}

export async function requireModuleAccess(codigo: string) {
  const context = await requirePlatformContext(`/modulos/${codigo}`)

  if (context.usuario.tipo === 'admin_global' || context.permissions.includes('*')) {
    return context
  }

  if (!context.modules.some((modulo: PlatformModule) => modulo.codigo === codigo)) {
    redirect('/plataforma')
  }

  return context
}
