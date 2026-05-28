import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { IntrColaboradorList, IntrKpis, IntrShell } from '@/features/intr/components'
import { getIntrData, requireIntrContext } from '@/features/intr/queries'

export default async function IntrColaboradoresPage() {
  const context = await requireIntrContext()
  const data = await getIntrData()
  const canWrite = canAccess(context.permissions, 'intr.colaboradores.write')

  return (
    <IntrShell
      active="colaboradores"
      title="Colaboradores"
      description="Cadastro executivo de pessoas, times, gestores, status e custo mensal."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/intr/colaboradores/novo">Novo colaborador</Link> : null}
    >
      <IntrKpis data={data} />
      <IntrColaboradorList canWrite={canWrite} colaboradores={data.colaboradores} />
    </IntrShell>
  )
}
