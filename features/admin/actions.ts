'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdminAction } from '@/lib/auth/permissions'

type StatusRegistro = 'ativo' | 'inativo' | 'arquivado'
type StatusUsuario = 'ativo' | 'inativo' | 'bloqueado' | 'pendente'
type TipoUsuario = 'admin_global' | 'admin_carteira' | 'gestor' | 'operador' | 'visualizador'

function admin() {
  return createSupabaseAdminClient() as any
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key)
  return value.length ? value : null
}

function boolFromSelect(formData: FormData, key: string, fallback = true) {
  const value = text(formData, key)
  if (!value) return fallback
  return value === 'true'
}

function ids(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean)
}

function required(value: string, label: string) {
  if (!value) throw new Error(`${label} é obrigatório.`)
  return value
}

function uuid(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} inválido.`)
  }
  return value
}

function codigo(value: string) {
  if (!/^[a-z0-9_]+$/.test(value)) {
    throw new Error('Código inválido. Use letras minúsculas, números e underline.')
  }
  return value
}

type AuditTarget = {
  app_codigo?: string | null
  carteira_id?: string | null
  entidade_schema?: string | null
  entidade_tabela?: string | null
  entidade_id?: string | null
}

async function logEvent(
  usuarioId: string,
  acao: string,
  descricao: string,
  metadata: Record<string, unknown> = {},
  target: AuditTarget = {}
) {
  try {
    await admin().schema('audit').from('eventos').insert({
      usuario_id: usuarioId,
      acao,
      descricao,
      metadata,
      app_codigo: target.app_codigo ?? null,
      carteira_id: target.carteira_id ?? null,
      entidade_schema: target.entidade_schema ?? null,
      entidade_tabela: target.entidade_tabela ?? null,
      entidade_id: target.entidade_id ?? null,
    })
  } catch {
    // Não quebra a ação principal.
  }
}

export async function createCarteiraAction(formData: FormData) {
  const { authUser } = await requireAdminAction('admin.carteiras.write')

  const nome = required(text(formData, 'nome'), 'Nome')

  const { data, error } = await admin().schema('core').from('carteiras').insert({
    nome,
    descricao: nullableText(formData, 'descricao'),
    logo_url: nullableText(formData, 'logo_url'),
    cor_primaria: nullableText(formData, 'cor_primaria'),
    status: (text(formData, 'status') || 'ativo') as StatusRegistro,
  }).select('id').single()

  if (error) throw new Error(error.message)

  await logEvent(authUser.id, 'carteira.criada', `Carteira criada: ${nome}`, { id: data.id }, {
    entidade_schema: 'core',
    entidade_tabela: 'carteiras',
    entidade_id: data.id,
  })
  revalidatePath('/admin')
  revalidatePath('/admin/carteiras')
  redirect('/admin/carteiras')
}

export async function updateCarteiraAction(formData: FormData) {
  const { authUser } = await requireAdminAction('admin.carteiras.write')

  const id = uuid(text(formData, 'id'), 'Carteira')
  const nome = required(text(formData, 'nome'), 'Nome')

  const { error } = await admin().schema('core').from('carteiras').update({
    nome,
    descricao: nullableText(formData, 'descricao'),
    logo_url: nullableText(formData, 'logo_url'),
    cor_primaria: nullableText(formData, 'cor_primaria'),
    status: (text(formData, 'status') || 'ativo') as StatusRegistro,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  await logEvent(authUser.id, 'carteira.atualizada', `Carteira atualizada: ${nome}`, { id }, {
    entidade_schema: 'core',
    entidade_tabela: 'carteiras',
    entidade_id: id,
  })
  revalidatePath('/admin')
  revalidatePath('/admin/carteiras')
  redirect('/admin/carteiras')
}

export async function updateAppAction(formData: FormData) {
  const { authUser } = await requireAdminAction('admin.apps.write')

  const id = uuid(text(formData, 'id'), 'App')
  const nome = required(text(formData, 'nome'), 'Nome')

  const { error } = await admin().schema('core').from('apps').update({
    nome,
    descricao: nullableText(formData, 'descricao'),
    status: (text(formData, 'status') || 'ativo') as StatusRegistro,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  await logEvent(authUser.id, 'app.atualizado', `App atualizado: ${nome}`, { id }, {
    entidade_schema: 'core',
    entidade_tabela: 'apps',
    entidade_id: id,
  })
  revalidatePath('/admin')
  revalidatePath('/admin/apps')
  redirect('/admin/apps')
}

export async function createUsuarioTipoAction(formData: FormData) {
  const { authUser } = await requireAdminAction('admin.usuarios.write')

  const nome = required(text(formData, 'nome'), 'Nome')
  const cod = codigo(required(text(formData, 'codigo'), 'Codigo'))

  const { data, error } = await admin().schema('core').from('usuario_tipos').insert({
    nome,
    codigo: cod,
    descricao: nullableText(formData, 'descricao'),
    ativo: boolFromSelect(formData, 'ativo'),
  }).select('id').single()

  if (error) throw new Error(error.message)

  await logEvent(authUser.id, 'usuario_tipo.criado', `Tipo de usuario criado: ${nome}`, { id: data.id, codigo: cod }, {
    entidade_schema: 'core',
    entidade_tabela: 'usuario_tipos',
    entidade_id: data.id,
  })
  revalidatePath('/admin')
  revalidatePath('/admin/tipos-usuario')
  redirect('/admin/tipos-usuario')
}

export async function updateUsuarioTipoAction(formData: FormData) {
  const { authUser } = await requireAdminAction('admin.usuarios.write')

  const id = uuid(text(formData, 'id'), 'Tipo de usuario')
  const nome = required(text(formData, 'nome'), 'Nome')

  const { data: atual } = await admin()
    .schema('core')
    .from('usuario_tipos')
    .select('codigo')
    .eq('id', id)
    .single()

  const sistema = ['colaborador', 'cliente', 'prestador', 'outros'].includes(String(atual?.codigo ?? ''))

  const { error } = await admin().schema('core').from('usuario_tipos').update({
    nome,
    ...(sistema ? {} : { codigo: codigo(required(text(formData, 'codigo'), 'Codigo')) }),
    descricao: nullableText(formData, 'descricao'),
    ativo: boolFromSelect(formData, 'ativo'),
  }).eq('id', id)

  if (error) throw new Error(error.message)

  await logEvent(authUser.id, 'usuario_tipo.atualizado', `Tipo de usuario atualizado: ${nome}`, { id }, {
    entidade_schema: 'core',
    entidade_tabela: 'usuario_tipos',
    entidade_id: id,
  })
  revalidatePath('/admin')
  revalidatePath('/admin/tipos-usuario')
  revalidatePath(`/admin/tipos-usuario/${id}`)
  redirect('/admin/tipos-usuario')
}

export async function createPerfilAction(formData: FormData) {
  const { authUser } = await requireAdminAction('admin.perfis.write')

  const nome = required(text(formData, 'nome'), 'Nome')
  const cod = codigo(required(text(formData, 'codigo'), 'Código'))
  const nivel = Number(text(formData, 'nivel') || 50)
  const permissaoIds = ids(formData, 'permissoes')

  const { data, error } = await admin().schema('security').from('perfis').insert({
    nome,
    codigo: cod,
    descricao: nullableText(formData, 'descricao'),
    nivel,
    app_id: nullableText(formData, 'app_id'),
    status: (text(formData, 'status') || 'ativo') as StatusRegistro,
    sistema: false,
  }).select('id').single()

  if (error) throw new Error(error.message)

  if (permissaoIds.length) {
    const { error: relError } = await admin().schema('security').from('perfil_permissoes').insert(
      permissaoIds.map((permissao_id) => ({ perfil_id: data.id, permissao_id }))
    )
    if (relError) throw new Error(relError.message)
  }

  await logEvent(authUser.id, 'perfil.criado', `Perfil criado: ${nome}`, { id: data.id, codigo: cod }, {
    entidade_schema: 'security',
    entidade_tabela: 'perfis',
    entidade_id: data.id,
  })
  revalidatePath('/admin')
  revalidatePath('/admin/perfis')
  redirect('/admin/perfis')
}

export async function updatePerfilAction(formData: FormData) {
  const { authUser } = await requireAdminAction('admin.perfis.write')

  const id = uuid(text(formData, 'id'), 'Perfil')
  const nome = required(text(formData, 'nome'), 'Nome')
  const nivel = Number(text(formData, 'nivel') || 50)
  const permissaoIds = ids(formData, 'permissoes')

  const { error } = await admin().schema('security').from('perfis').update({
    nome,
    descricao: nullableText(formData, 'descricao'),
    nivel,
    app_id: nullableText(formData, 'app_id'),
    status: (text(formData, 'status') || 'ativo') as StatusRegistro,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  const { error: delError } = await admin().schema('security').from('perfil_permissoes').delete().eq('perfil_id', id)
  if (delError) throw new Error(delError.message)

  if (permissaoIds.length) {
    const { error: relError } = await admin().schema('security').from('perfil_permissoes').insert(
      permissaoIds.map((permissao_id) => ({ perfil_id: id, permissao_id }))
    )
    if (relError) throw new Error(relError.message)
  }

  await logEvent(authUser.id, 'perfil.atualizado', `Perfil atualizado: ${nome}`, { id }, {
    entidade_schema: 'security',
    entidade_tabela: 'perfis',
    entidade_id: id,
  })
  revalidatePath('/admin')
  revalidatePath('/admin/perfis')
  redirect('/admin/perfis')
}

async function replaceRelations(usuarioId: string, table: string, column: string, selectedIds: string[]) {
  const supabase = admin()

  const { error: delError } = await supabase.schema('security').from(table).delete().eq('usuario_id', usuarioId)
  if (delError) throw new Error(delError.message)

  if (!selectedIds.length) return

  const rows = selectedIds.map((id, index) => ({
    usuario_id: usuarioId,
    [column]: id,
    ativo: true,
    ...(table === 'usuario_carteiras' ? { principal: index === 0 } : {}),
  }))

  const { error } = await supabase.schema('security').from(table).insert(rows)
  if (error) throw new Error(error.message)
}

export async function createUsuarioAction(formData: FormData) {
  const { authUser } = await requireAdminAction('admin.usuarios.write')

  const email = required(text(formData, 'email').toLowerCase(), 'E-mail')
  const nome = required(text(formData, 'nome'), 'Nome')
  const password = text(formData, 'password')
  const supabase = admin()

  if (password && password.length < 8) {
    throw new Error('Senha provisória deve ter pelo menos 8 caracteres.')
  }

  const { data: authData, error: authError } = password
    ? await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome,
        full_name: nome,
      },
    })
    : await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        nome,
        full_name: nome,
      },
    })

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? 'Não foi possível criar o usuário no Supabase Auth.')
  }

  const id = authData.user.id

  const { error } = await supabase.schema('security').from('usuarios').insert({
    id,
    nome,
    email,
    tipo: 'operador' as TipoUsuario,
    tipo_id: nullableText(formData, 'tipo_id'),
    status: (text(formData, 'status') || 'pendente') as StatusUsuario,
    avatar_url: nullableText(formData, 'avatar_url'),
  })

  if (error) {
    await supabase.auth.admin.deleteUser(id)
    throw new Error(error.message)
  }

  await replaceRelations(id, 'usuario_carteiras', 'carteira_id', ids(formData, 'carteiras'))
  await replaceRelations(id, 'usuario_app_acessos', 'app_id', ids(formData, 'apps'))
  await replaceRelations(id, 'usuario_perfis', 'perfil_id', ids(formData, 'perfis'))

  await logEvent(authUser.id, 'usuario.criado', `Usuário criado: ${email}`, { id, convite_enviado: !password }, {
    entidade_schema: 'security',
    entidade_tabela: 'usuarios',
    entidade_id: id,
  })
  revalidatePath('/admin')
  revalidatePath('/admin/usuarios')
  redirect('/admin/usuarios')
}

export async function saveUsuarioForm(formData: FormData) {
  const { authUser } = await requireAdminAction('admin.usuarios.write')

  const id = uuid(text(formData, 'id'), 'Usuário')
  const email = required(text(formData, 'email').toLowerCase(), 'E-mail')
  const nome = required(text(formData, 'nome'), 'Nome')

  const supabase = admin()

  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    email,
    user_metadata: {
      nome,
      full_name: nome,
    },
  })

  if (authError) throw new Error(`Auth: ${authError.message}`)

  const { error } = await supabase.schema('security').from('usuarios').update({
    nome,
    email,
    tipo_id: nullableText(formData, 'tipo_id'),
    status: (text(formData, 'status') || 'pendente') as StatusUsuario,
    avatar_url: nullableText(formData, 'avatar_url'),
  }).eq('id', id)

  if (error) throw new Error(`Security: ${error.message}`)

  await replaceRelations(id, 'usuario_carteiras', 'carteira_id', ids(formData, 'carteiras'))
  await replaceRelations(id, 'usuario_app_acessos', 'app_id', ids(formData, 'apps'))
  await replaceRelations(id, 'usuario_perfis', 'perfil_id', ids(formData, 'perfis'))

  await logEvent(authUser.id, 'usuario.atualizado', `Usuário atualizado: ${email}`, { id }, {
    entidade_schema: 'security',
    entidade_tabela: 'usuarios',
    entidade_id: id,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/usuarios')
  return id
}

export async function updateUsuarioAction(formData: FormData) {
  const id = await saveUsuarioForm(formData)
  revalidatePath(`/admin/usuarios/${id}`)
  redirect('/admin/usuarios')
}
