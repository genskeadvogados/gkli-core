import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CrmGenericList, CrmListKpis, CrmShell } from '@/features/crm/components'
import { listCrmContatoRows, requireCrmContext } from '@/features/crm/queries'

export default async function CrmContatosPage() {
  const context = await requireCrmContext()
  const rows = await listCrmContatoRows(context)
  const canWrite = canAccess(context.permissions, 'crm.oportunidades.write')

  return (
    <CrmShell
      active="contatos"
      eyebrow="Base cadastral"
      title="Contatos"
      description="Pessoas de relacionamento comercial, com cargo, e-mail e telefone."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/crm/contatos/novo">Novo contato</Link> : null}
    >
      <CrmListKpis rows={rows} secondaryLabel="Com cargo" />
      <CrmGenericList
        title="Lista de contatos"
        description="Contatos carregados do CRM para apoiar pipeline e relacionamento."
        emptyLabel="Nenhum contato encontrado."
        editHrefBase={canWrite ? '/modulos/crm/contatos' : undefined}
        rows={rows}
      />
    </CrmShell>
  )
}
