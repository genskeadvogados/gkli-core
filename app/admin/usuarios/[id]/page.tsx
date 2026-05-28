import Link from 'next/link'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { getUsuario, getUsuarioRelations, listApps, listCarteiras, listPerfis, listUsuarioTipos } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function EditarUsuarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ error?: string }>
}) {
  await requireAdminPermission('admin.usuarios.write')
  const { id } = await params
  const query = await searchParams
  const [usuario, relations, carteiras, apps, perfis, tipos] = await Promise.all([
    getUsuario(id),
    getUsuarioRelations(id),
    listCarteiras(),
    listApps(),
    listPerfis(),
    listUsuarioTipos(),
  ])
  const tiposDisponiveis = tipos.filter((tipo: any) => tipo.ativo !== false || tipo.id === usuario.tipo_id)

  return (
    <>
      <PageHeader title="Editar usuário" subtitle={usuario.email} />

      {query?.error ? (
        <div className="alert danger">
          {query.error}
        </div>
      ) : null}

      <form action={`/admin/usuarios/${usuario.id}/salvar`} method="post" className="card grid">
        <input type="hidden" name="id" value={usuario.id} />

        <div className="grid cols-2">
          <Field label="Nome" name="nome" defaultValue={usuario.nome} required />
          <Field label="E-mail" name="email" type="email" defaultValue={usuario.email} required />
          <Field label="Avatar URL" name="avatar_url" defaultValue={usuario.avatar_url} />
        </div>

        <SelectField label="Tipo de usuario" name="tipo_id" defaultValue={usuario.tipo_id ?? ''}>
          <option value="">Selecionar tipo</option>
          {tiposDisponiveis.map((tipo: any) => (
            <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
          ))}
        </SelectField>

        <SelectField label="Status" name="status" defaultValue={usuario.status}>
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente</option>
          <option value="inativo">Inativo</option>
          <option value="bloqueado">Bloqueado</option>
        </SelectField>

        <div className="grid cols-2">
          <div>
            <div className="label">Carteiras</div>
            {carteiras.map((c: any) => (
              <label key={c.id} className="checkbox-row">
                <input type="checkbox" name="carteiras" value={c.id} defaultChecked={relations.carteiras.includes(c.id)} />
                <span>{c.nome}</span>
              </label>
            ))}
          </div>

          <div>
            <div className="label">Módulos</div>
            {apps.map((a: any) => (
              <label key={a.id} className="checkbox-row">
                <input type="checkbox" name="apps" value={a.id} defaultChecked={relations.apps.includes(a.id)} />
                <span>{a.nome}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="label">Perfis</div>
          <div className="grid cols-2">
            {perfis.map((p: any) => (
              <label key={p.id} className="checkbox-row">
                <input type="checkbox" name="perfis" value={p.id} defaultChecked={relations.perfis.includes(p.id)} />
                <span>{p.nome}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button className="button" type="submit">Salvar</button>
          <Link className="button secondary" href="/admin/usuarios">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
