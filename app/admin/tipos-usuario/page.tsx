import Link from 'next/link'
import { ListToolbar, PageHeader, StatusBadge } from '@/features/admin/components/Ui'
import { listUsuarioTipos } from '@/features/admin/queries'
import { canAccess, requireAdminPermission } from '@/lib/auth/permissions'

type TiposUsuarioPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>
}

export default async function TiposUsuarioPage({ searchParams }: TiposUsuarioPageProps) {
  const { permissions } = await requireAdminPermission('admin.usuarios.read')
  const canWrite = canAccess(permissions, 'admin.usuarios.write')
  const params = await searchParams
  const query = params?.q?.trim().toLowerCase() ?? ''
  const status = params?.status ?? ''
  const tipos = await listUsuarioTipos()
  const filtrados = tipos.filter((tipo: any) => {
    const tipoStatus = tipo.ativo === false ? 'inativo' : 'ativo'
    const matchesQuery = !query || [tipo.codigo, tipo.nome, tipo.descricao].some((value) => String(value ?? '').toLowerCase().includes(query))
    const matchesStatus = !status || tipoStatus === status
    return matchesQuery && matchesStatus
  })

  return (
    <>
      <PageHeader
        title="Tipos de usuario"
        subtitle="Classificacao operacional de usuarios do Core."
        actionHref={canWrite ? '/admin/tipos-usuario/novo' : undefined}
        actionLabel={canWrite ? 'Novo tipo' : undefined}
      />
      <ListToolbar
        query={params?.q}
        status={status}
        statusOptions={[
          { value: 'ativo', label: 'Ativo' },
          { value: 'inativo', label: 'Inativo' },
        ]}
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Codigo</th>
              <th>Descricao</th>
              <th>Status</th>
              {canWrite ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((tipo: any) => (
              <tr key={tipo.id}>
                <td>{tipo.nome}</td>
                <td>{tipo.codigo}</td>
                <td>{tipo.descricao || '-'}</td>
                <td><StatusBadge value={tipo.ativo === false ? 'inativo' : 'ativo'} /></td>
                {canWrite ? <td><Link href={`/admin/tipos-usuario/${tipo.id}`}>Editar</Link></td> : null}
              </tr>
            ))}
            {!filtrados.length ? (
              <tr><td colSpan={canWrite ? 5 : 4}>Nenhum tipo de usuario encontrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
