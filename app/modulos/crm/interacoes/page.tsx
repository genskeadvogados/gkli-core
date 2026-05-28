import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CrmGenericList, CrmListKpis, CrmShell } from '@/features/crm/components'
import { listCrmInteracaoRows, requireCrmContext } from '@/features/crm/queries'

export default async function CrmInteracoesPage() {
  const context = await requireCrmContext()
  const rows = await listCrmInteracaoRows(context)
  const canWrite = canAccess(context.permissions, 'crm.oportunidades.write')

  return (
    <CrmShell
      active="interacoes"
      eyebrow="Base operacional"
      title="Interacoes"
      description="Historico de contatos, reunioes, mensagens e relacionamento comercial."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/crm/interacoes/nova">Nova interacao</Link> : null}
    >
      <CrmListKpis rows={rows} secondaryLabel="Registradas" />
      <CrmGenericList
        title="Historico de interacoes"
        description="Linha de relacionamento por cliente, oportunidade e canal."
        editHrefBase={canWrite ? '/modulos/crm/interacoes' : undefined}
        emptyLabel="Nenhuma interacao encontrada."
        rows={rows}
      />
    </CrmShell>
  )
}
