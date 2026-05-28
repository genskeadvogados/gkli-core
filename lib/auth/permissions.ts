import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const ADMIN_HOME_PERMISSION = 'admin.dashboard.read'

type UsuarioAdmin = {
  id: string
  nome: string
  email: string
  tipo: string
  status: string
}

function admin() {
  return createSupabaseAdminClient() as any
}

export function canAccess(permissions: string[], permission: string) {
  return permissions.includes('*') || permissions.includes(permission)
}

export async function getUsuarioPermissionCodes(usuario: UsuarioAdmin) {
  if (usuario.tipo === 'admin_global') return ['*']

  const supabase = admin()

  const { data: perfilRows, error: perfisError } = await supabase
    .schema('security')
    .from('usuario_perfis')
    .select('perfil_id')
    .eq('usuario_id', usuario.id)
    .eq('ativo', true)

  if (perfisError) throw new Error(perfisError.message)

  const perfilIds = (perfilRows ?? []).map((row: any) => row.perfil_id)
  if (!perfilIds.length) return []

  const { data: perfis, error: perfilError } = await supabase
    .schema('security')
    .from('perfis')
    .select('id,codigo')
    .in('id', perfilIds)
    .eq('status', 'ativo')

  if (perfilError) throw new Error(perfilError.message)
  if ((perfis ?? []).some((perfil: any) => perfil.codigo === 'admin_global')) return ['*']

  const { data: relRows, error: relError } = await supabase
    .schema('security')
    .from('perfil_permissoes')
    .select('permissao_id')
    .in('perfil_id', perfilIds)

  if (relError) throw new Error(relError.message)

  const permissaoIds = [...new Set((relRows ?? []).map((row: any) => row.permissao_id))]
  if (!permissaoIds.length) return []

  const { data: permissoes, error: permissoesError } = await supabase
    .schema('security')
    .from('permissoes')
    .select('codigo')
    .in('id', permissaoIds)
    .eq('status', 'ativo')

  if (permissoesError) throw new Error(permissoesError.message)

  return (permissoes ?? []).map((permissao: any) => permissao.codigo)
}

export async function getAdminContext() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login?next=/admin')
  }

  const { data: usuario, error } = await admin()
    .schema('security')
    .from('usuarios')
    .select('id, nome, email, tipo, status')
    .eq('id', user.id)
    .single()

  if (error || !usuario || usuario.status !== 'ativo') {
    redirect('/logout?next=/admin&error=Sessão sem acesso ativo ao Admin Core.')
  }

  const permissions = await getUsuarioPermissionCodes(usuario)

  return {
    authUser: user,
    usuario: usuario as UsuarioAdmin,
    permissions,
  }
}

export async function requireAdminPermission(permission = ADMIN_HOME_PERMISSION) {
  const context = await getAdminContext()

  if (!canAccess(context.permissions, permission)) {
    redirect('/logout?next=/admin&error=Usuário sem permissão para acessar esta área.')
  }

  return context
}

export async function requireAdminAction(permission: string) {
  const context = await getAdminContext()

  if (!canAccess(context.permissions, permission)) {
    throw new Error('Você não tem permissão para executar esta ação.')
  }

  return context
}
