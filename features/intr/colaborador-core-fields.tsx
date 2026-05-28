'use client'

import { useMemo, useState } from 'react'
import type { IntrFormOption } from '@/features/intr/types'

export function ColaboradorCoreFields({
  coreUsuarios,
  email,
  nome,
  usuarioId,
}: {
  coreUsuarios: IntrFormOption[]
  email?: string | null
  nome?: string | null
  usuarioId?: string | null
}) {
  const [selectedUserId, setSelectedUserId] = useState(usuarioId ?? '')
  const [manualEmail, setManualEmail] = useState(email ?? '')
  const [manualNome, setManualNome] = useState(nome ?? '')
  const selectedUser = useMemo(
    () => coreUsuarios.find((usuario) => usuario.id === selectedUserId),
    [coreUsuarios, selectedUserId],
  )
  const usesCoreUser = Boolean(selectedUserId)

  return (
    <>
      <div className="module-form-wide">
        <label className="label" htmlFor="usuario_id">Usuario Core</label>
        <select
          className="select"
          id="usuario_id"
          name="usuario_id"
          onChange={(event) => setSelectedUserId(event.target.value)}
          value={selectedUserId}
        >
          <option value="">Sem usuario vinculado</option>
          {coreUsuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="nome">Nome</label>
        <input
          className="input"
          id="nome"
          name="nome"
          readOnly={usesCoreUser}
          required
          value={usesCoreUser ? selectedUser?.nome ?? manualNome : manualNome}
          onChange={(event) => setManualNome(event.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input
          className="input"
          id="email"
          name="email"
          readOnly={usesCoreUser}
          required
          type="email"
          value={usesCoreUser ? selectedUser?.email ?? manualEmail : manualEmail}
          onChange={(event) => setManualEmail(event.target.value)}
        />
      </div>
    </>
  )
}
