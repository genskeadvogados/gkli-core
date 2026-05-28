import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloGenericList, CicloListKpis, CicloShell } from '@/features/ciclo/components'
import { listCicloContratoRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloContratosPage() {
  const context = await requireCicloContext()
  const rows = await listCicloContratoRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')

  return (
    <CicloShell
      active="contratos"
      eyebrow="Documentos juridicos"
      title="Contratos"
      description="Contratos, vigencias, valores e reajustes vinculados aos clientes."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/ciclo/contratos/novo">Novo contrato</Link> : null}
    >
      <CicloListKpis rows={rows} />
      <CicloGenericList
        title="Lista de contratos"
        description="Contratos cadastrados no schema Ciclo."
        detailHrefBase={canWrite ? '/modulos/ciclo/contratos' : undefined}
        emptyLabel="Nenhum contrato encontrado."
        rows={rows}
      />
    </CicloShell>
  )
}
