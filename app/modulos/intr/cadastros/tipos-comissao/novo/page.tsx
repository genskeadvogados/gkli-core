import { createIntrComissaoTipoAction } from '@/features/intr/actions'
import { IntrComissaoTipoForm, IntrShell } from '@/features/intr/components'
import { requireIntrContext } from '@/features/intr/queries'

export default async function NovoIntrTipoComissaoPage() {
  const context = await requireIntrContext()

  return (
    <IntrShell
      active="tiposComissao"
      title="Novo tipo de comissao"
      description="Cadastre percentual e categoria usada no calculo automatico da importação de receitas."
      usuario={context.usuario}
    >
      <IntrComissaoTipoForm action={createIntrComissaoTipoAction} />
    </IntrShell>
  )
}
