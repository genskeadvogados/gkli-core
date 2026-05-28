import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CrmEmpresaEditableList, CrmEmpresaKpis, CrmShell } from '@/features/crm/components'
import { getCrmData, requireCrmContext } from '@/features/crm/queries'

export default async function CrmEmpresasPage() {
  const context = await requireCrmContext()
  const data = await getCrmData(context)
  const canWrite = canAccess(context.permissions, 'crm.oportunidades.write')

  return (
    <CrmShell
      active="empresas"
      eyebrow="Base cadastral"
      title="Empresas"
      description="Cadastro de contas do CRM com visão de pipeline, contatos e carteira."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/crm/empresas/nova">Nova empresa</Link> : null}
    >
      <CrmEmpresaKpis empresas={data.empresas} />
      <CrmEmpresaEditableList canWrite={canWrite} empresas={data.empresas} />
    </CrmShell>
  )
}
