import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CrmGenericList, CrmListKpis, CrmShell } from '@/features/crm/components'
import { listCrmAtividadeRows, requireCrmContext } from '@/features/crm/queries'

export default async function CrmAtividadesPage() {
  const context = await requireCrmContext()
  const rows = await listCrmAtividadeRows(context)
  const canWrite = canAccess(context.permissions, 'crm.oportunidades.write')

  return (
    <CrmShell
      active="atividades"
      eyebrow="Base operacional"
      title="Atividades"
      description="Tarefas, follow-ups e proximas acoes comerciais por vencimento."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/crm/atividades/nova">Nova atividade</Link> : null}
    >
      <CrmListKpis rows={rows} secondaryLabel="Concluidas" />
      <CrmGenericList
        title="Lista de atividades"
        description="Atividades comerciais carregadas do CRM."
        editHrefBase={canWrite ? '/modulos/crm/atividades' : undefined}
        emptyLabel="Nenhuma atividade encontrada."
        rows={rows}
      />
    </CrmShell>
  )
}
