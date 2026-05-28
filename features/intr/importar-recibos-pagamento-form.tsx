'use client'

import { useRef, useState, useTransition } from 'react'
import { importarIntrRecibosPagamentoPdf, previewIntrRecibosPagamentoPdf } from '@/features/intr/actions'

type ImportResult = Awaited<ReturnType<typeof importarIntrRecibosPagamentoPdf>>
type PreviewResult = Awaited<ReturnType<typeof previewIntrRecibosPagamentoPdf>>

const moneyFormatter = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' })

function actionTone(acao: string) {
  if (acao === 'criar') return 'success'
  if (acao === 'atualizar') return 'primary'
  return 'warning'
}

export function ImportarRecibosPagamentoForm() {
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewedFile, setPreviewedFile] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function getFormData() {
    const file = fileRef.current?.files?.[0]
    if (!file) throw new Error('Selecione um arquivo PDF.')
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
        setPreview(await previewIntrRecibosPagamentoPdf(formData))
        setPreviewedFile(fileKey)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel pre-visualizar o PDF.')
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
        setResult(await importarIntrRecibosPagamentoPdf(formData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel importar o PDF.')
      }
    })
  }

  return (
    <div className="suite-import-box">
      <input
        ref={fileRef}
        accept=".pdf,application/pdf"
        className="input"
        name="arquivo"
        onChange={onFileChange}
        type="file"
      />

      <div className="form-actions">
        <button className="button secondary" disabled={pending} onClick={onPreview} type="button">
          {pending ? 'Validando...' : 'Pre-visualizar'}
        </button>
        <button className="button" disabled={pending || !preview || preview.importaveis === 0} onClick={onConfirm} type="button">
          {pending ? 'Importando...' : 'Confirmar importação'}
        </button>
      </div>

      {error ? <div className="suite-empty-block danger">{error}</div> : null}

      {preview ? (
        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Preview dos recibos</h2>
              <p>Confira os vinculos por nome antes de gravar os pagamentos no Intr.</p>
            </div>
          </div>

          <div className="suite-import-stats">
            <span>Recibos <strong>{preview.total}</strong></span>
            <span>Vinculados <strong>{preview.vinculados}</strong></span>
            <span>Criar <strong>{preview.criar}</strong></span>
            <span>Atualizar <strong>{preview.atualizar}</strong></span>
            <span>Ignorar <strong>{preview.ignorados.length}</strong></span>
          </div>

          <div className="suite-table-list suite-import-table">
            {preview.itens.map((item) => (
              <article key={`${item.page}-${item.nomeRecibo}`}>
                <div>
                  <h3>{item.colaboradorNome ?? item.nomeRecibo}</h3>
                  <p>{item.nomeRecibo} - {item.tipo} - {item.competenciaLabel}</p>
                </div>
                <span className={`suite-pill ${actionTone(item.acao)}`}>{item.acao.replace('_', ' ')}</span>
                <strong>{moneyFormatter.format(item.valorLiquido)}</strong>
                <small>Pagina {item.page}</small>
              </article>
            ))}
          </div>

          {preview.ignorados.length ? (
            <div className="suite-empty-block warning">
              <strong>Recibos que serao ignorados</strong>
              <ul>
                {preview.ignorados.slice(0, 12).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="suite-empty-block success">
          <strong>{result.processados} recibo(s) processado(s)</strong>
          <span>{result.criados} criado(s), {result.atualizados} atualizado(s), {result.ignorados.length} ignorado(s).</span>
        </section>
      ) : null}
    </div>
  )
}
