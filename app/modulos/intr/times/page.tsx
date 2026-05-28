import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrTimeRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrTimesPage() {
  const context = await requireIntrContext()
  const rows = await listIntrTimeRows()
  const canWrite = canAccess(context.permissions, 'intr.times.write')

  return (
    <IntrShell
      active="times"
      title="Times"
      description="Agrupamento operacional de colaboradores por equipe, gestor e custo mensal."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/intr/times/novo">Novo time</Link> : null}
    >
      <IntrListKpis rows={rows} totalLabel="Times" />
      <IntrGenericList
        title="Times publicados"
        description="Resumo dos times lido das views do Intr ou derivado da base de colaboradores."
        editHrefBase={canWrite ? '/modulos/intr/times' : undefined}
        empty="Nenhum time encontrado nas views do Intr."
        rows={rows}
      />
    </IntrShell>
  )
}
