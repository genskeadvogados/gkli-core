import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloGenericList, CicloListKpis, CicloShell } from '@/features/ciclo/components'
import { ImportarClientesForm } from '@/features/ciclo/importar-clientes-form'
import { listCicloImportacaoRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloImportacoesPage() {
  const context = await requireCicloContext()
  const rows = await listCicloImportacaoRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')

  return (
    <CicloShell
      active="importacoes"
      eyebrow="Dados"
      title="Importações"
      description="Historico de cargas e processamento de dados do Ciclo."
      usuario={context.usuario}
    >
      {canWrite ? (
        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Clientes base</h2>
              <p>XLSX com carteira, nome, razao social, CNPJ, administradora, contatos e observacoes. CNPJ e a chave de atualizacao.</p>
            </div>
            <Link className="button secondary" href="/templates/importacao-clientes-ciclo.xlsx">Baixar template</Link>
          </div>
          <ImportarClientesForm />
        </section>
      ) : null}
      <CicloListKpis rows={rows} secondaryLabel="Processadas" />
      <CicloGenericList
        title="Historico de importações"
        description="Lotes e arquivos importados para o cadastro mestre."
        detailHrefBase="/modulos/ciclo/importacoes"
        emptyLabel="Nenhuma importação encontrada."
        rows={rows}
      />
    </CicloShell>
  )
}
