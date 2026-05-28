import Link from 'next/link'
import { createUsuarioAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { listApps, listCarteiras, listPerfis, listUsuarioTipos } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function NovoUsuarioPage() {
  await requireAdminPermission('admin.usuarios.write')
  const [carteiras, apps, perfis, tipos] = await Promise.all([
    listCarteiras(),
    listApps(),
    listPerfis(),
    listUsuarioTipos(),
  ])
  const tiposAtivos = tipos.filter((tipo: any) => tipo.ativo !== false)

  return (
    <>
      <PageHeader title="Novo usuário" subtitle="Cria a conta no Supabase Auth. Sem senha provisória, o usuário recebe convite por e-mail." />

      <form action={createUsuarioAction} className="card grid">
        <div className="grid cols-2">
          <Field label="Nome" name="nome" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha provisória" name="password" type="password" minLength={8} />
          <Field label="Avatar URL" name="avatar_url" />
        </div>

        <SelectField label="Tipo de usuario" name="tipo_id" defaultValue={tiposAtivos.find((tipo: any) => tipo.codigo === 'colaborador')?.id ?? ''}>
          <option value="">Selecionar tipo</option>
          {tiposAtivos.map((tipo: any) => (
            <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
          ))}
        </SelectField>

        <SelectField label="Status" name="status" defaultValue="ativo">
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
                <input type="checkbox" name="carteiras" value={c.id} />
                <span>{c.nome}</span>
              </label>
            ))}
          </div>

          <div>
            <div className="label">Módulos</div>
            {apps.map((a: any) => (
              <label key={a.id} className="checkbox-row">
                <input type="checkbox" name="apps" value={a.id} />
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
                <input type="checkbox" name="perfis" value={p.id} />
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
