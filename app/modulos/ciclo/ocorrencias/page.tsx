import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloGenericList, CicloListKpis, CicloShell } from '@/features/ciclo/components'
import { listCicloOcorrenciaRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloOcorrenciasPage() {
  const context = await requireCicloContext()
  const rows = await listCicloOcorrenciaRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.alertas.write')

  return (
    <CicloShell
      active="ocorrencias"
      eyebrow="Operacao"
      title="Ocorrencias"
      description="Registros operacionais que impactam score, risco e rotina dos clientes."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/ciclo/ocorrencias/nova">Nova ocorrencia</Link> : null}
    >
      <CicloListKpis rows={rows} secondaryLabel="Positivas" />
      <CicloGenericList
        title="Lista de ocorrencias"
        description="Ocorrencias cadastradas no schema Ciclo."
        detailHrefBase={canWrite ? '/modulos/ciclo/ocorrencias' : undefined}
        emptyLabel="Nenhuma ocorrencia encontrada."
        rows={rows}
      />
    </CicloShell>
  )
}
