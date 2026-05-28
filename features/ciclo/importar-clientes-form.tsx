'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { importarClientesXlsx, previewImportacaoClientesXlsx } from '@/features/ciclo/actions'

type ImportResult = Awaited<ReturnType<typeof importarClientesXlsx>>
type PreviewResult = Awaited<ReturnType<typeof previewImportacaoClientesXlsx>>

export function ImportarClientesForm() {
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewedFile, setPreviewedFile] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function getFormData() {
    const file = fileRef.current?.files?.[0]
    if (!file) throw new Error('Selecione um arquivo XLSX.')
    const formData = new FormData()
    formData.set('arquivo', file)
    return { fileKey: `${file.name}:${file.size}:${file.lastModified}`, formData }
  }

  function onFileChange() {
    setPreview(null)
    setResult(null)
    setError(null)
    setPreviewedFile(null)
  }

  function onPreview() {
    setError(null)
    setResult(null)
    setPreview(null)
    startTransition(async () => {
      try {
        const { fileKey, formData } = getFormData()
        setPreview(await previewImportacaoClientesXlsx(formData))
        setPreviewedFile(fileKey)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel pre-visualizar o arquivo.')
      }
    })
  }

  function onConfirm() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const { fileKey, formData } = getFormData()
        if (fileKey !== previewedFile) {
          setPreview(null)
          setError('O arquivo mudou depois do preview. Gere a pre-visualizacao novamente.')
          return
        }
        setResult(await importarClientesXlsx(formData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel importar o arquivo.')
      }
    })
  }

  return (
    <div className="ciclo-import-box">
      <input
        ref={fileRef}
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="input"
        name="arquivo"
        onChange={onFileChange}
        type="file"
      />

      <div className="form-actions">
        <button className="button secondary" disabled={pending} onClick={onPreview} type="button">
          {pending ? 'Validando...' : 'Pre-visualizar'}
        </button>
        <button className="button" disabled={pending || !preview || preview.validas === 0} onClick={onConfirm} type="button">
          {pending ? 'Importando...' : 'Confirmar importação'}
        </button>
      </div>

      {error ? <div className="suite-empty-block danger">{error}</div> : null}

      {preview ? (
        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Preview da carga</h2>
              <p>Confira os totais antes de gravar a importação.</p>
            </div>
          </div>

          <div className="ciclo-import-stats">
            <span>Linhas <strong>{preview.total}</strong></span>
            <span>Validas <strong>{preview.validas}</strong></span>
            <span>Criar <strong>{preview.criar}</strong></span>
            <span>Atualizar <strong>{preview.atualizar}</strong></span>
            <span>Contatos <strong>{preview.contatos}</strong></span>
          </div>

          {preview.amostras.length ? (
            <div className="ciclo-table-list compact">
              {preview.amostras.map((item) => (
                <article key={`${item.linha}-${item.documento}`}>
                  <div>
                    <h3>{item.nome}</h3>
                    <p>{item.documento} - {item.carteira}</p>
                  </div>
                  <span className={`ciclo-pill ${item.acao === 'criar' ? 'success' : 'primary'}`}>{item.acao}</span>
                  <strong>Linha {item.linha}</strong>
                  <small>{item.administradora ?? 'Sem administradora'}</small>
                </article>
              ))}
            </div>
          ) : null}

          {preview.ignorados.length ? (
            <div className="suite-empty-block warning">
              <strong>Linhas que serao ignoradas</strong>
              <ul>
                {preview.ignorados.slice(0, 12).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="suite-empty-block success">
          <strong>{result.criadosOuAtualizados} cliente(s) criado(s) ou atualizado(s)</strong>
          <span>{result.criados} criado(s), {result.atualizados} atualizado(s), {result.contatos} contato(s).</span>
          {result.loteId ? <Link href={`/modulos/ciclo/importacoes/${result.loteId}`}>Ver detalhes do lote</Link> : null}
        </section>
      ) : null}
    </div>
  )
}
