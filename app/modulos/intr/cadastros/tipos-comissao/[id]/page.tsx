import { updateIntrComissaoTipoAction } from '@/features/intr/actions'
import { IntrComissaoTipoForm, IntrShell } from '@/features/intr/components'
import { getIntrComissaoTipo, requireIntrContext } from '@/features/intr/queries'

export default async function EditarIntrTipoComissaoPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, requireIntrContext()])
  const tipo = await getIntrComissaoTipo(id)

  return (
    <IntrShell
      active="tiposComissao"
      title={tipo.nome}
      description="Edite percentual e categoria usada no calculo automatico da importação de receitas."
      usuario={context.usuario}
    >
      <IntrComissaoTipoForm action={updateIntrComissaoTipoAction} tipo={tipo} />
    </IntrShell>
  )
}
