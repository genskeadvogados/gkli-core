import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloClienteList, CicloKpis, CicloShell } from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloClientesPage() {
  const context = await requireCicloContext()
  const data = await getCicloData(context)
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')

  return (
    <CicloShell
      active="clientes"
      eyebrow="Cadastro mestre"
      title="Clientes"
      description="Base única de clientes do Ciclo, com carteira, administradora, risco e regularidade."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/ciclo/clientes/novo">Novo cliente</Link> : null}
    >
      <CicloKpis data={data} />
      <CicloClienteList canWrite={canWrite} clientes={data.clientes} />
    </CicloShell>
  )
}
