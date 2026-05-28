import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CrmBoard, CrmKpis, CrmShell } from '@/features/crm/components'
import { getCrmData, requireCrmContext } from '@/features/crm/queries'

export default async function CrmOportunidadesPage() {
  const context = await requireCrmContext()
  const data = await getCrmData(context)
  const canWrite = canAccess(context.permissions, 'crm.oportunidades.write')

  return (
    <CrmShell
      active="oportunidades"
      eyebrow="Pipeline comercial"
      title="Oportunidades"
      description="Acompanhe o funil por etapa, carteira, probabilidade e prioridade operacional."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/crm/oportunidades/nova">Nova oportunidade</Link> : null}
    >
      <CrmKpis data={data} />
      <CrmBoard canWrite={canWrite} oportunidades={data.oportunidades} />
    </CrmShell>
  )
}
