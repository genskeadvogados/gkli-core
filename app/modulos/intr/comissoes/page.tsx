import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { gerarPagamentosComissoesAprovadasAction } from '@/features/intr/actions'
import { IntrComissaoOperationalList, IntrComissaoWorkflowActions, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrComissaoRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrComissoesPage() {
  const context = await requireIntrContext()
  const rows = await listIntrComissaoRows()
  const canWrite = canAccess(context.permissions, 'intr.comissoes.write')

  return (
    <IntrShell
      active="comissoes"
      title="Comissoes"
      description="Comissoes calculadas por colaborador, categoria, cliente e competencia."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/intr/comissoes/nova">Nova comissao</Link> : null}
    >
      {canWrite ? (
        <IntrComissaoWorkflowActions
          gerarPagamentosAction={gerarPagamentosComissoesAprovadasAction}
        />
      ) : null}
      <IntrListKpis rows={rows} totalLabel="Comissoes" />
      <IntrComissaoOperationalList
        rows={rows}
      />
    </IntrShell>
  )
}
