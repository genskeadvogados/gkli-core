import Link from 'next/link'
import { updateUsuarioTipoAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { getUsuarioTipo } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

const SYSTEM_TYPES = new Set(['colaborador', 'cliente', 'prestador', 'outros'])

export default async function EditarTipoUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPermission('admin.usuarios.write')
  const { id } = await params
  const tipo = await getUsuarioTipo(id)
  const sistema = SYSTEM_TYPES.has(tipo.codigo)

  return (
    <>
      <PageHeader title="Editar tipo de usuario" subtitle={tipo.nome} />

      <form action={updateUsuarioTipoAction} className="card grid">
        <input type="hidden" name="id" value={tipo.id} />

        <div className="grid cols-2">
          <Field label="Nome" name="nome" defaultValue={tipo.nome} required />
          <div>
            <label className="label" htmlFor="codigo">Codigo</label>
            <input className="input" id="codigo" name="codigo" readOnly={sistema} defaultValue={tipo.codigo} />
          </div>
        </div>

        <Field label="Descricao" name="descricao" defaultValue={tipo.descricao} />

        <SelectField label="Status" name="ativo" defaultValue={tipo.ativo === false ? 'false' : 'true'}>
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </SelectField>

        <div className="form-actions">
          <button className="button" type="submit">Salvar</button>
          <Link className="button secondary" href="/admin/tipos-usuario">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
