import Link from 'next/link'
import { createUsuarioTipoAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function NovoTipoUsuarioPage() {
  await requireAdminPermission('admin.usuarios.write')

  return (
    <>
      <PageHeader title="Novo tipo de usuario" subtitle="Cria uma classificacao operacional para o cadastro de usuarios." />

      <form action={createUsuarioTipoAction} className="card grid">
        <div className="grid cols-2">
          <Field label="Nome" name="nome" required />
          <Field label="Codigo" name="codigo" required />
        </div>

        <Field label="Descricao" name="descricao" />

        <SelectField label="Status" name="ativo" defaultValue="true">
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
