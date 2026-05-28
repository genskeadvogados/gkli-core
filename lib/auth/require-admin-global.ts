import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/auth/permissions'

export async function requireAdminCore() {
  return getAdminContext()
}

export async function requireAdminGlobal() {
  const context = await getAdminContext()

  if (context.usuario.tipo !== 'admin_global' && !context.permissions.includes('*')) {
    redirect('/login?next=/admin')
  }

  return {
    authUser: context.authUser,
    usuario: context.usuario,
  }
}
