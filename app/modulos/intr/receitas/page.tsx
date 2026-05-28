import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrReceitaRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrReceitasPage() {
  const context = await requireIntrContext()
  const rows = await listIntrReceitaRows()
  const canWrite = canAccess(context.permissions, 'intr.receitas.write')

  return (
    <IntrShell
      active="receitas"
      title="Receitas"
      description="Receitas importadas, categorias financeiras, vendedor e valor recebido."
      usuario={context.usuario}
      actions={canWrite ? (
        <>
          <Link className="button secondary" href="/modulos/intr/importacoes">Importar XLSX</Link>
          <Link className="button" href="/modulos/intr/receitas/nova">Nova receita</Link>
        </>
      ) : null}
    >
      <IntrListKpis rows={rows} totalLabel="Receitas" />
      <IntrGenericList
        title="Receitas e categorias"
        description="Receitas por cliente, categoria, responsavel comercial, valor recebido e competencia."
        editHrefBase={canWrite ? '/modulos/intr/receitas' : undefined}
        empty="Nenhuma receita encontrada nas views do Intr."
        rows={rows}
      />
    </IntrShell>
  )
}
