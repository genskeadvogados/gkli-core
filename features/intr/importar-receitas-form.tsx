'use client'

import { useRef, useState, useTransition } from 'react'
import { importarIntrReceitasXlsx, previewIntrReceitasXlsx } from '@/features/intr/actions'

type ImportResult = Awaited<ReturnType<typeof importarIntrReceitasXlsx>>
type PreviewResult = Awaited<ReturnType<typeof previewIntrReceitasXlsx>>

const moneyFormatter = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' })

export function ImportarReceitasForm() {
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
        setPreview(await previewIntrReceitasXlsx(formData))
        setPreviewedFile(fileKey)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel pre-visualizar o XLSX.')
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
        setResult(await importarIntrReceitasXlsx(formData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel importar o XLSX.')
      }
    })
  }

  return (
    <div className="suite-import-box">
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
              <h2>Preview das receitas</h2>
              <p>Confira receitas, recebedores e comissoes antes de gravar no Intr.</p>
            </div>
          </div>

          <div className="suite-import-stats">
            <span>Linhas <strong>{preview.total}</strong></span>
            <span>Validas <strong>{preview.validas}</strong></span>
            <span>Criar <strong>{preview.criar}</strong></span>
            <span>Comissoes <strong>{preview.comissoesTotal}</strong></span>
            <span>Comissao <strong>{moneyFormatter.format(preview.valorComissaoTotal)}</strong></span>
          </div>

          <div className="suite-table-list suite-import-table">
            {preview.amostras.map((item) => (
              <article key={`${item.linha}-${item.chave}`}>
                <div>
                  <h3>{item.cliente}</h3>
                  <p>
                    {item.categoria ?? 'Sem categoria'} - {item.recebedorNome ?? 'Sem recebedor'} {item.recebedorTipo ? `(${item.recebedorTipo})` : ''}
                  </p>
                </div>
                <span className={`suite-pill ${item.acao === 'criar' ? 'success' : 'primary'}`}>{item.acao}</span>
                <strong>{moneyFormatter.format(item.valorRecebido)}</strong>
                <small>{item.comissoes.length} comissao(oes)</small>
              </article>
            ))}
          </div>

          {preview.ignoradas.length ? (
            <div className="suite-empty-block warning">
              <strong>Linhas que serao ignoradas</strong>
              <ul>
                {preview.ignoradas.slice(0, 12).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="suite-empty-block success">
          <strong>{result.processadas} receita(s) processada(s)</strong>
          <span>
            {result.criadas} criada(s), {result.atualizadas} atualizada(s), {result.comissoes} comissao(oes).
            Total recebido: {moneyFormatter.format(result.valorRecebidoTotal)}; comissoes: {moneyFormatter.format(result.valorComissaoTotal)}.
          </span>
        </section>
      ) : null}
    </div>
  )
}
