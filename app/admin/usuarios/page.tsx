import Link from 'next/link'
import { ListToolbar, PageHeader, StatusBadge } from '@/features/admin/components/Ui'
import { listUsuarios } from '@/features/admin/queries'
import { canAccess, requireAdminPermission } from '@/lib/auth/permissions'

type UsuariosPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>
}

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  const { permissions } = await requireAdminPermission('admin.usuarios.read')
  const canWrite = canAccess(permissions, 'admin.usuarios.write')
  const params = await searchParams
  const query = params?.q?.trim().toLowerCase() ?? ''
  const status = params?.status ?? ''
  const usuarios = await listUsuarios()
  const filtrados = usuarios.filter((u: any) => {
    const matchesQuery = !query || [u.nome, u.email, u.tipo_nome, u.tipo_codigo, u.tipo].some((value) => String(value ?? '').toLowerCase().includes(query))
    const matchesStatus = !status || u.status === status
    return matchesQuery && matchesStatus
  })

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Controle de login, carteiras, perfis e módulos."
        actionHref={canWrite ? '/admin/usuarios/novo' : undefined}
        actionLabel={canWrite ? 'Novo usuário' : undefined}
      />
      <ListToolbar
        query={params?.q}
        status={status}
        statusOptions={[
          { value: 'ativo', label: 'Ativo' },
          { value: 'pendente', label: 'Pendente' },
          { value: 'inativo', label: 'Inativo' },
          { value: 'bloqueado', label: 'Bloqueado' },
        ]}
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Carteiras</th>
              <th>Módulos</th>
              {canWrite ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u: any) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{u.tipo_nome ?? u.tipo}</td>
                <td><StatusBadge value={u.status} /></td>
                <td>{Array.isArray(u.carteiras) ? u.carteiras.length : 0}</td>
                <td>{Array.isArray(u.apps) ? u.apps.length : 0}</td>
                {canWrite ? <td><Link href={`/admin/usuarios/${u.id}`}>Editar</Link></td> : null}
              </tr>
            ))}
            {!filtrados.length ? (
              <tr><td colSpan={canWrite ? 7 : 6}>Nenhum usuário encontrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
