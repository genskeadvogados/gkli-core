import Link from 'next/link'

export function PageHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string
  subtitle?: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>

      {actionHref && actionLabel ? (
        <Link className="button" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

export function StatusBadge({ value }: { value?: string | null }) {
  const rawStatus = value || '-'
  const status = rawStatus.replace(/_/g, ' ')
  const cls = rawStatus === 'ativo' ? 'ok' : rawStatus === 'pendente' ? 'warn' : 'off'
  return <span className={`badge ${cls}`}>{status}</span>
}

export function EmptyState({ label = 'Nenhum registro encontrado.' }: { label?: string }) {
  return <div className="card empty-state">{label}</div>
}

export function ListToolbar({
  query,
  status,
  statusOptions,
}: {
  query?: string
  status?: string
  statusOptions?: Array<{ value: string; label: string }>
}) {
  return (
    <form className="list-toolbar">
      <input
        className="input"
        name="q"
        placeholder="Buscar"
        defaultValue={query ?? ''}
      />
      {statusOptions ? (
        <select className="select" name="status" defaultValue={status ?? ''}>
          <option value="">Todos os status</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : null}
      <button className="button" type="submit">Filtrar</button>
      {(query || status) ? <Link className="button secondary" href="?">Limpar</Link> : null}
    </form>
  )
}

export function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
  minLength,
}: {
  label: string
  name: string
  defaultValue?: string | number | null
  type?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input
        className="input"
        id={name}
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue ?? ''}
      />
    </div>
  )
}

export function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string
  name: string
  defaultValue?: string | null
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select className="select" id={name} name={name} defaultValue={defaultValue ?? ''}>
        {children}
      </select>
    </div>
  )
}
