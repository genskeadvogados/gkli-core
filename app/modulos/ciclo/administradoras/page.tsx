import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloGenericList, CicloListKpis, CicloShell } from '@/features/ciclo/components'
import { listCicloAdministradoraRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloAdministradorasPage() {
  const context = await requireCicloContext()
  const rows = await listCicloAdministradoraRows()
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')

  return (
    <CicloShell
      active="administradoras"
      eyebrow="Base cadastral"
      title="Administradoras"
      description="Cadastro de administradoras vinculadas aos clientes do Ciclo."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/ciclo/administradoras/nova">Nova administradora</Link> : null}
    >
      <CicloListKpis rows={rows} />
      <CicloGenericList
        title="Lista de administradoras"
        description="Administradoras disponiveis no schema Ciclo."
        detailHrefBase="/modulos/ciclo/administradoras"
        emptyLabel="Nenhuma administradora encontrada."
        rows={rows}
      />
    </CicloShell>
  )
}
