import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloDocumentSignal, CicloDocumentoList, CicloShell } from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloDocumentosPage() {
  const context = await requireCicloContext()
  const data = await getCicloData(context)
  const canWrite = canAccess(context.permissions, 'ciclo.documentos.write')

  return (
    <CicloShell
      active="documentos"
      eyebrow="Regularidade documental"
      title="Documentos"
      description="Checklist documental por cliente, com status, obrigatoriedade e vencimentos."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/ciclo/documentos/novo">Novo documento</Link> : null}
    >
      <CicloDocumentSignal documentos={data.documentos} />
      <CicloDocumentoList canWrite={canWrite} documentos={data.documentos} />
    </CicloShell>
  )
}
