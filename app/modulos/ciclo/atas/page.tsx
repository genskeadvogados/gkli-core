import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloGenericList, CicloListKpis, CicloShell } from '@/features/ciclo/components'
import { listCicloAtaRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloAtasPage() {
  const context = await requireCicloContext()
  const rows = await listCicloAtaRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')

  return (
    <CicloShell
      active="atas"
      eyebrow="Documentos juridicos"
      title="Atas"
      description="Atas, assembleias, validade e observacoes operacionais."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/ciclo/atas/nova">Nova ata</Link> : null}
    >
      <CicloListKpis rows={rows} secondaryLabel="Vigentes" />
      <CicloGenericList
        title="Lista de atas"
        description="Atas cadastradas no schema Ciclo."
        detailHrefBase={canWrite ? '/modulos/ciclo/atas' : undefined}
        emptyLabel="Nenhuma ata encontrada."
        rows={rows}
      />
    </CicloShell>
  )
}
