import Link from 'next/link'
import { BrandLogo } from '@/features/shared/brand-logo'
import { canAccess } from '@/lib/auth/permissions'

const navGroups = [
  {
    label: 'Base operacional',
    items: [
      { href: '/admin/usuarios', label: 'Usuarios', permission: 'admin.usuarios.read' },
      { href: '/admin/tipos-usuario', label: 'Tipos de usuario', permission: 'admin.usuarios.read' },
      { href: '/admin/carteiras', label: 'Carteiras', permission: 'admin.carteiras.read' },
    ],
  },
  {
    label: 'Acesso',
    items: [
      { href: '/admin/perfis', label: 'Perfis', permission: 'admin.perfis.read' },
      { href: '/admin/permissoes', label: 'Permissoes', permission: 'admin.permissoes.read' },
      { href: '/admin/apps', label: 'Modulos', permission: 'admin.apps.read' },
    ],
  },
  {
    label: 'Gestao',
    items: [
      { href: '/admin/auditoria', label: 'Auditoria', permission: 'admin.auditoria.read' },
    ],
  },
]

export function AdminShell({
  children,
  userName,
  userEmail,
  userRole,
  permissions,
}: {
  children: React.ReactNode
  userName: string
  userEmail: string
  userRole: string
  permissions: string[]
}) {
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(permissions, item.permission)),
    }))
    .filter((group) => group.items.length > 0)
  const isFullAccess = permissions.includes('*') || userRole === 'admin_global'

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <BrandLogo className="sidebar-mark" label="GKLI Core" />
          <div>
            <div className="sidebar-title">GKLI Core</div>
            <div className="sidebar-subtitle">Acesso e governanca</div>
          </div>
        </div>
        <nav>
          <Link className="sidebar-cockpit" href="/admin">Cockpit</Link>

          {visibleGroups.map((group) => (
            <details className="sidebar-group" key={group.label} open>
              <summary className="sidebar-group-label">{group.label}</summary>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </details>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>{userName}</span>
          <span className="sidebar-badge">{isFullAccess ? 'Acesso total' : 'Core'}</span>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-user">
            <strong>{userName}</strong>
            <div className="admin-user-email">{userEmail}</div>
          </div>
          <div className="admin-actions">
            <Link className="button secondary" href="/plataforma">Modulos</Link>
            <a className="button secondary" href="/logout">Sair</a>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}
