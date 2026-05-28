import Link from 'next/link'
import { BrandLogo } from '@/features/shared/brand-logo'
import { canAccess } from '@/lib/auth/permissions'
import { requirePlatformContext } from '@/lib/auth/platform'

const moduleArea: Record<string, string> = {
  core: 'Administracao',
  crm: 'Novos negocios',
  ciclo: 'Governanca',
  intr: 'Operacao interna',
  colab: 'Portal do colaborador',
}

const shortcutGroups = [
  {
    codigo: 'core',
    title: 'Core',
    description: 'Administracao e seguranca central.',
    links: [
      { href: '/admin', label: 'Visao geral' },
      { href: '/admin/usuarios', label: 'Usuarios' },
      { href: '/admin/carteiras', label: 'Carteiras' },
      { href: '/admin/perfis', label: 'Perfis' },
      { href: '/admin/permissoes', label: 'Permissoes' },
      { href: '/admin/apps', label: 'Modulos' },
      { href: '/admin/auditoria', label: 'Auditoria' },
    ],
    pending: [],
  },
  {
    codigo: 'crm',
    title: 'CRM',
    description: 'Funcionalidades comerciais ja publicadas no app unificado.',
    links: [
      { href: '/modulos/crm', label: 'Cockpit' },
      { href: '/modulos/crm/dashboard', label: 'Dashboard' },
      { href: '/modulos/crm/oportunidades', label: 'Pipeline' },
      { href: '/modulos/crm/empresas', label: 'Empresas' },
      { href: '/modulos/crm/clientes', label: 'Clientes' },
      { href: '/modulos/crm/contatos', label: 'Contatos' },
      { href: '/modulos/crm/propostas', label: 'Propostas' },
      { href: '/modulos/crm/atividades', label: 'Atividades' },
      { href: '/modulos/crm/interacoes', label: 'Interacoes' },
      { href: '/modulos/crm/importacoes', label: 'Importações' },
      { href: '/modulos/crm/carteiras-usuarios', label: 'Carteiras x Usuarios' },
    ],
    pending: ['Kanban separado, se mantivermos alem do Pipeline'],
  },
  {
    codigo: 'ciclo',
    title: 'Ciclo',
    description: 'Funcionalidades operacionais ja publicadas no app unificado.',
    links: [
      { href: '/modulos/ciclo', label: 'Cockpit' },
      { href: '/modulos/ciclo/dashboard', label: 'Dashboard' },
      { href: '/modulos/ciclo/clientes', label: 'Clientes' },
      { href: '/modulos/ciclo/administradoras', label: 'Administradoras' },
      { href: '/modulos/ciclo/importacoes', label: 'Importações' },
      { href: '/modulos/ciclo/documentos', label: 'Documentos' },
      { href: '/modulos/ciclo/alertas', label: 'Alertas' },
      { href: '/modulos/ciclo/onboarding', label: 'Onboarding' },
      { href: '/modulos/ciclo/regularidade', label: 'Regularidade' },
      { href: '/modulos/ciclo/timeline', label: 'Timeline' },
      { href: '/modulos/ciclo/ocorrencias', label: 'Ocorrencias' },
      { href: '/modulos/ciclo/contratos', label: 'Contratos' },
      { href: '/modulos/ciclo/atas', label: 'Atas' },
    ],
    pending: ['Automacoes', 'IA', 'Carteiras x Usuarios'],
  },
  {
    codigo: 'intr',
    title: 'Intr',
    description: 'Funcionalidades internas ja publicadas no app unificado.',
    links: [
      { href: '/modulos/intr', label: 'Cockpit' },
      { href: '/modulos/intr/colaboradores', label: 'Colaboradores' },
      { href: '/modulos/intr/times', label: 'Times' },
      { href: '/modulos/intr/reembolsos', label: 'Reembolsos' },
      { href: '/modulos/intr/documentos', label: 'Documentos' },
      { href: '/modulos/intr/comunicados', label: 'Comunicados' },
      { href: '/modulos/intr/pagamentos', label: 'Pagamentos' },
      { href: '/modulos/intr/comissoes', label: 'Comissoes' },
      { href: '/modulos/intr/cadastros/tipos-comissao', label: 'Tipos de comissao' },
      { href: '/modulos/intr/receitas', label: 'Receitas' },
      { href: '/modulos/intr/fechamentos', label: 'Fechamentos' },
      { href: '/modulos/intr/cadastros', label: 'Cadastros' },
      { href: '/modulos/intr/importacoes', label: 'Importações' },
      { href: '/modulos/intr/integridade', label: 'Integridade' },
    ],
    pending: ['Fluxos de criacao/edicao detalhados do app antigo'],
  },
  {
    codigo: 'colab',
    title: 'Colab',
    description: 'Portal individual sem menu lateral.',
    links: [
      { href: '/modulos/colab', label: 'Inicio' },
      { href: '/modulos/colab/pagamentos', label: 'Pagamentos' },
      { href: '/modulos/colab/comissoes', label: 'Comissoes' },
      { href: '/modulos/colab/beneficios', label: 'Beneficios' },
      { href: '/modulos/colab/documentos', label: 'Documentos' },
      { href: '/modulos/colab/perfil', label: 'Perfil' },
    ],
    pending: [],
  },
]

const executiveFlow = [
  { codigo: 'crm', title: 'Conquistar', description: 'CRM registra oportunidades, empresas e interacoes.' },
  { codigo: 'ciclo', title: 'Acompanhar', description: 'Ciclo assume onboarding e vida diaria do cliente.' },
  { codigo: 'intr', title: 'Operar', description: 'Intr consolida receitas, comissoes, pagamentos e fechamentos.' },
  { codigo: 'colab', title: 'Publicar', description: 'Colab mostra pagamentos e comissoes para cada colaborador.' },
]

export default async function PainelPage() {
  const context = await requirePlatformContext('/modulos/painel')
  const hasAdmin = canAccess(context.permissions, 'admin.dashboard.read')
  const availableCodes = new Set(context.modules.map((modulo) => modulo.codigo))
  const availableShortcutGroups = shortcutGroups.filter((group) => (
    group.codigo === 'core' ? hasAdmin : availableCodes.has(group.codigo)
  ))
  const modules = [
    ...(hasAdmin
      ? [{ codigo: 'core', nome: 'GKLI Core', descricao: 'Usuarios, perfis, carteiras e permissoes.', href: '/admin' }]
      : []),
    ...context.modules,
  ]
  const operationalModules = executiveFlow.filter((item) => availableCodes.has(item.codigo))
  const publishedShortcutCount = availableShortcutGroups.reduce((sum, group) => sum + group.links.length, 0)
  const pendingCount = availableShortcutGroups.reduce((sum, group) => sum + group.pending.length, 0)

  return (
    <main className="suite-page">
      <div className="platform-bg" />
      <div className="suite-wrap no-sidebar">
        <header className="suite-topbar">
          <Link className="button secondary" href="/plataforma">Voltar</Link>
          <div className="module-user">
            <strong>{context.usuario.nome}</strong>
            <span>{context.usuario.email}</span>
          </div>
        </header>

        <section className="suite-hero-card">
          <div className="suite-hero-main">
            <BrandLogo className="suite-brand-mark" label="Suite GKLI" />
            <div>
              <p className="platform-kicker">Painel</p>
              <h1>Suite GKLI</h1>
              <p>Entrada unificada para os modulos internos, com sessao unica e acesso determinado pelo Core.</p>
            </div>
          </div>
        </section>

        <section className="suite-executive-grid">
          <article className="suite-executive-card featured">
            <span>Fluxo operacional</span>
            <h2>{operationalModules.length} de {executiveFlow.length} modulos ativos</h2>
            <p>Leitura executiva da esteira: venda, onboarding, operacao interna e publicacao ao colaborador.</p>
          </article>
          <article className="suite-executive-card">
            <span>Atalhos publicados</span>
            <h2>{publishedShortcutCount}</h2>
            <p>Acessos principais visiveis conforme permissoes do Core.</p>
          </article>
          <article className="suite-executive-card">
            <span>Pontos de atencao</span>
            <h2>{pendingCount}</h2>
            <p>Itens mapeados para evolucao, sem bloquear o uso atual.</p>
          </article>
        </section>

        <section className="suite-flow-map">
          {executiveFlow.map((item) => {
            const active = availableCodes.has(item.codigo)
            return (
              <article className={active ? 'active' : ''} key={item.codigo}>
                <span>{moduleArea[item.codigo]}</span>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </article>
            )
          })}
        </section>

        <section className="suite-module-grid">
          {modules.map((modulo) => (
            <Link className="suite-module-card" href={modulo.href} key={`${modulo.codigo}-${modulo.href}`}>
              <span>{moduleArea[modulo.codigo] ?? 'Modulo GKLI'}</span>
              <h2>{modulo.nome}</h2>
              <p>{modulo.descricao}</p>
              <strong>Acessar</strong>
            </Link>
          ))}
        </section>

        <section className="suite-shortcut-grid">
          {availableShortcutGroups.map((group) => (
            <article className="suite-shortcut-card" key={group.title}>
              <div>
                <span>{group.title}</span>
                <h2>{group.description}</h2>
              </div>

              <div className="suite-shortcut-links">
                {group.links.map((link) => (
                  <Link href={link.href} key={link.href}>{link.label}</Link>
                ))}
              </div>

              {group.pending.length ? (
                <details>
                  <summary>{group.pending.length} itens pendentes de migracao</summary>
                  <p>{group.pending.join(', ')}</p>
                </details>
              ) : (
                <p className="suite-shortcut-complete">Atalhos principais publicados.</p>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
