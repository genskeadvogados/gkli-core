import { canAccess } from '@/lib/auth/permissions'
import { IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { ImportarReceitasForm } from '@/features/intr/importar-receitas-form'
import { listIntrImportacaoRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrImportacoesPage() {
  const context = await requireIntrContext()
  const rows = await listIntrImportacaoRows()
  const canImportReceitas = canAccess(context.permissions, 'intr.receitas.write')

  return (
    <IntrShell
      active="importacoes"
      title="Importações"
      description="Historico de importações financeiras, linhas processadas, alertas e valores."
      usuario={context.usuario}
    >
      {canImportReceitas ? (
        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Receitas Omie</h2>
              <p>XLSX de contas a receber com cliente, categoria, vencimento, recebimento, boleto, valores e contrato.</p>
            </div>
          </div>
          <ImportarReceitasForm />
        </section>
      ) : null}
      <IntrListKpis rows={rows} totalLabel="Importações" />
      <IntrGenericList
        title="Historico recente"
        description="Importações processadas pela rotina de receitas do Intr."
        empty="Nenhuma importação encontrada nas views do Intr."
        rows={rows}
      />
    </IntrShell>
  )
}
