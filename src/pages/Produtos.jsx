import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { registrarLog } from '../logger'

const CATEGORIAS_BASE = ['terço', 'escapulário', 'pulseira', 'chaveiro', 'medalhão', 'kit', 'outros']
const CATEGORIAS_SITE = ['Terços', 'Escapulários', 'Pulseiras', 'Medalhas', 'Chaveiros', 'Outros']

function getCategorias() {
  try {
    const salvas = JSON.parse(localStorage.getItem('tdm_categorias') || '[]')
    const todas = [...CATEGORIAS_BASE]
    salvas.forEach(c => { if (!todas.includes(c)) todas.push(c) })
    return todas
  } catch { return CATEGORIAS_BASE }
}

function salvarCategoriaExtra(nova) {
  try {
    const salvas = JSON.parse(localStorage.getItem('tdm_categorias') || '[]')
    if (!salvas.includes(nova)) localStorage.setItem('tdm_categorias', JSON.stringify([...salvas, nova]))
  } catch {}
}

function gerarSlug(nome) {
  return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

const EMBALAGEM_PADRAO = 0.38

const emptyForm = {
  nome: '', categoria: 'terço', custo: '', preco_venda: '',
  estoque_atual: '', estoque_minimo: '5',
  publicar_site: false, slug: '', descricao_publica: '',
  categoria_site: 'Terços', ordem_site: 999, destaque: false, imagens_publicas: [],
}

const emptyPrec = { embalagem: EMBALAGEM_PADRAO, outros: 0, markup: 100, taxaCartao: 0, modoTaxa: 'pix' }

function Precificadora({ custo, onAplicar }) {
  const [prec, setPrec] = useState(emptyPrec)
  const [aberta, setAberta] = useState(false)
  const custoNum = Number(custo) || 0
  const custoTotal = custoNum + Number(prec.embalagem) + Number(prec.outros)
  const precoBase = custoTotal * (1 + Number(prec.markup) / 100)
  const taxaValor = precoBase * Number(prec.taxaCartao)
  const precoFinal = precoBase + taxaValor
  const lucro = precoFinal - custoTotal - taxaValor
  const margemReal = precoFinal > 0 ? ((lucro / precoFinal) * 100) : 0
  const modos = [
    { k: 'pix', l: 'Pix', taxa: 0 }, { k: 'debito', l: 'Débito', taxa: 0.015 },
    { k: 'credito1x', l: 'Créd. 1x', taxa: 0.029 }, { k: 'credito2', l: 'Créd. 2-6x', taxa: 0.035 },
  ]
  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const corMargem = margemReal >= 50 ? 'var(--success)' : margemReal >= 30 ? 'var(--warning)' : 'var(--danger)'
  if (!aberta) return (
    <button type="button" onClick={() => setAberta(true)} style={{ width: '100%', padding: '9px 14px', borderRadius: 8, fontSize: 13, background: 'var(--bege)', border: '1.5px dashed var(--dourado)', color: 'var(--dourado-dark)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>🧮 Usar calculadora de precificação</button>
  )
  return (
    <div style={{ background: 'var(--bege)', borderRadius: 10, border: '1.5px solid var(--dourado)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dourado-dark)' }}>🧮 Calculadora de precificação</span>
        <button type="button" onClick={() => setAberta(false)} style={{ background: 'none', fontSize: 16, color: 'var(--texto-leve)', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div><label style={{ fontSize: 11, color: 'var(--texto-leve)', fontWeight: 600, display: 'block', marginBottom: 4 }}>EMBALAGEM (R$)</label><input className="form-input" type="number" step="0.01" min="0" value={prec.embalagem} onChange={e => setPrec(p => ({ ...p, embalagem: e.target.value }))} style={{ margin: 0, fontSize: 13 }} /></div>
        <div><label style={{ fontSize: 11, color: 'var(--texto-leve)', fontWeight: 600, display: 'block', marginBottom: 4 }}>OUTROS CUSTOS (R$)</label><input className="form-input" type="number" step="0.01" min="0" value={prec.outros} onChange={e => setPrec(p => ({ ...p, outros: e.target.value }))} placeholder="frete rateado, etc." style={{ margin: 0, fontSize: 13 }} /></div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--texto-leve)', fontWeight: 600 }}>MARKUP SOBRE CUSTO</label>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dourado-dark)' }}>{prec.markup}%</span>
        </div>
        <input type="range" min="10" max="300" step="5" value={prec.markup} onChange={e => setPrec(p => ({ ...p, markup: e.target.value }))} style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: 'var(--texto-leve)', fontWeight: 600, display: 'block', marginBottom: 6 }}>FORMA DE PAGAMENTO</label>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {modos.map(m => (
            <button key={m.k} type="button" onClick={() => setPrec(p => ({ ...p, modoTaxa: m.k, taxaCartao: m.taxa }))} style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: prec.modoTaxa === m.k ? 'var(--dourado)' : 'var(--branco)', color: prec.modoTaxa === m.k ? 'white' : 'var(--texto-leve)', border: '1px solid', borderColor: prec.modoTaxa === m.k ? 'var(--dourado)' : 'var(--bege-dark)', cursor: 'pointer' }}>{m.l} {m.taxa > 0 ? `(${(m.taxa*100).toFixed(1)}%)` : ''}</button>
          ))}
        </div>
      </div>
      {custoNum > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            <div style={{ background: 'var(--branco)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--texto-leve)', marginBottom: 2 }}>Custo total</div><div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(custoTotal)}</div></div>
            <div style={{ background: 'var(--branco)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--texto-leve)', marginBottom: 2 }}>Preço sugerido</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dourado-dark)' }}>{fmt(precoFinal)}</div></div>
            <div style={{ background: 'var(--branco)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--texto-leve)', marginBottom: 2 }}>Margem real</div><div style={{ fontSize: 14, fontWeight: 700, color: corMargem }}>{margemReal.toFixed(0)}%</div></div>
          </div>
          <button type="button" onClick={() => onAplicar(precoFinal.toFixed(2))} style={{ width: '100%', padding: '9px', borderRadius: 8, fontSize: 13, background: 'var(--dourado)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>✅ Aplicar preço {fmt(precoFinal)} ao produto</button>
        </>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--texto-leve)', textAlign: 'center', padding: '8px 0' }}>Preencha o custo do produto acima para calcular</div>
      )}
    </div>
  )
}

function SecaoVitrine({ form, setForm }) {
  const fileRef = useRef()
  const [uploadando, setUploadando] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  const getImageUrl = (path) => path?.startsWith('http') ? path : `${SUPABASE_URL}/storage/v1/object/public/produtos-publicos/${path}`

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    if (!form.slug) { setUploadMsg({ text: 'Defina o slug antes de subir fotos', type: 'danger' }); return }
    setUploadando(true); setUploadMsg(null)
    const novasFotos = [...(form.imagens_publicas || [])]
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${form.slug}/foto-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('produtos-publicos').upload(path, file, { upsert: true })
      if (error) { setUploadMsg({ text: 'Erro: ' + error.message, type: 'danger' }); break }
      novasFotos.push(path)
    }
    setForm(f => ({ ...f, imagens_publicas: novasFotos }))
    setUploadando(false)
    setUploadMsg({ text: `${files.length} foto(s) enviada(s)!`, type: 'success' })
    setTimeout(() => setUploadMsg(null), 3000)
    fileRef.current.value = ''
  }

  async function removerFoto(path) {
    if (!confirm('Remover esta foto?')) return
    await supabase.storage.from('produtos-publicos').remove([path])
    setForm(f => ({ ...f, imagens_publicas: f.imagens_publicas.filter(p => p !== path) }))
  }

  return (
    <div style={{ marginTop: 24, borderTop: '2px solid var(--dourado)', paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🌐</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--dourado-dark)' }}>Vitrine do Site</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div onClick={() => setForm(f => ({ ...f, publicar_site: !f.publicar_site }))} style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', background: form.publicar_site ? 'var(--dourado)' : 'var(--bege-dark)', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 3, left: form.publicar_site ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: form.publicar_site ? 'var(--dourado-dark)' : 'var(--texto-leve)' }}>{form.publicar_site ? '✅ Publicado no site' : 'Não publicado'}</span>
        </label>
      </div>
      {!form.publicar_site && <p style={{ fontSize: 12, color: 'var(--texto-leve)', background: 'var(--bege)', padding: '10px 14px', borderRadius: 8 }}>Ative para este produto aparecer no catálogo público.</p>}
      {form.publicar_site && (
        <div>
          <div className="form-group">
            <label className="form-label">Slug (URL do produto) <span style={{ fontSize: 11, color: 'var(--texto-leve)', fontWeight: 400 }}>terrademaria-site.vercel.app/produto/<strong>{form.slug || '...'}</strong></span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" style={{ margin: 0, flex: 1 }} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="ex: terco-perola-6mm" />
              <button type="button" onClick={() => setForm(f => ({ ...f, slug: gerarSlug(f.nome) }))} style={{ padding: '0 14px', borderRadius: 8, background: 'var(--bege)', border: '1.5px solid var(--bege-dark)', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: 'var(--texto-leve)', whiteSpace: 'nowrap' }}>↺ Gerar</button>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Categoria no site</label>
              <select className="form-input" style={{ margin: 0 }} value={form.categoria_site} onChange={e => setForm(f => ({ ...f, categoria_site: e.target.value }))}>
                {CATEGORIAS_SITE.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ordem de exibição</label>
              <input className="form-input" style={{ margin: 0 }} type="number" min="1" max="999" value={form.ordem_site} onChange={e => setForm(f => ({ ...f, ordem_site: Number(e.target.value) }))} placeholder="1 = primeiro" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição pública (visível no site)</label>
            <textarea className="form-input" style={{ margin: 0, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} value={form.descricao_publica} onChange={e => setForm(f => ({ ...f, descricao_publica: e.target.value }))} placeholder="Descrição que o cliente vai ver no site..." />
            <span style={{ fontSize: 11, color: 'var(--texto-leve)' }}>{form.descricao_publica.length} caracteres</span>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.destaque} onChange={e => setForm(f => ({ ...f, destaque: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--dourado)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>⭐ Produto em destaque (aparece na home)</span>
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">Fotos do produto</label>
            {form.imagens_publicas?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {form.imagens_publicas.map((path, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                    <img src={getImageUrl(path)} alt={`foto ${i+1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--bege-dark)' }} />
                    <button type="button" onClick={() => removerFoto(path)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileRef.current.click()} disabled={uploadando || !form.slug} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13, background: form.slug ? 'var(--bege)' : 'var(--bege-dark)', border: '1.5px dashed var(--bege-dark)', color: form.slug ? 'var(--texto)' : 'var(--texto-leve)', fontWeight: 600, cursor: form.slug ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              {uploadando ? '⏳ Enviando...' : '📷 Selecionar fotos'}
            </button>
            {!form.slug && <p style={{ fontSize: 11, color: 'var(--texto-leve)', marginTop: 4 }}>Defina o slug antes de subir fotos.</p>}
            {uploadMsg && <div className={`alert alert-${uploadMsg.type}`} style={{ marginTop: 8, padding: '8px 12px', fontSize: 12 }}>{uploadMsg.text}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [arquivados, setArquivados] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('todas')
  const [msg, setMsg] = useState(null)
  const [aba, setAba] = useState('ativos')
  const [categorias, setCategorias] = useState(getCategorias)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  function adicionarCategoria() {
    const nova = novaCategoria.trim().toLowerCase()
    if (!nova) return
    if (!categorias.includes(nova)) { salvarCategoriaExtra(nova); setCategorias(getCategorias()) }
    setForm(f => ({ ...f, categoria: nova }))
    setNovaCategoria(''); setAddingCat(false)
  }

  useEffect(() => { loadProdutos() }, [])

  async function loadProdutos() {
    setLoading(true)
    const [{ data: ativos }, { data: inativos }] = await Promise.all([
      supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
      supabase.from('produtos').select('*').eq('ativo', false).order('nome'),
    ])
    setProdutos(ativos || []); setArquivados(inativos || []); setLoading(false)
  }

  function abrirModal(produto = null) {
    if (produto) {
      setEditando(produto.id)
      setForm({
        nome: produto.nome, categoria: produto.categoria, custo: produto.custo,
        preco_venda: produto.preco_venda, estoque_atual: produto.estoque_atual, estoque_minimo: produto.estoque_minimo,
        publicar_site: produto.publicar_site || false, slug: produto.slug || '',
        descricao_publica: produto.descricao_publica || '', categoria_site: produto.categoria_site || 'Terços',
        ordem_site: produto.ordem_site || 999, destaque: produto.destaque || false,
        imagens_publicas: produto.imagens_publicas || [],
      })
    } else { setEditando(null); setForm(emptyForm) }
    setModal(true)
  }

  function fecharModal() { setModal(false); setEditando(null); setForm(emptyForm) }

  async function salvar() {
    if (!form.nome.trim()) return showMsg('Informe o nome do produto', 'danger')
    if (!form.preco_venda) return showMsg('Informe o preço de venda', 'danger')
    if (form.publicar_site && !form.slug) return showMsg('Defina o slug para publicar no site', 'danger')
    setSalvando(true)
    const payload = {
      nome: form.nome.trim(), categoria: form.categoria, custo: Number(form.custo) || 0,
      preco_venda: Number(form.preco_venda), estoque_atual: Number(form.estoque_atual) || 0,
      estoque_minimo: Number(form.estoque_minimo) || 5,
      publicar_site: form.publicar_site, slug: form.slug || null,
      descricao_publica: form.descricao_publica || null, categoria_site: form.categoria_site || null,
      ordem_site: Number(form.ordem_site) || 999, destaque: form.destaque,
      imagens_publicas: form.imagens_publicas || [],
    }
    let error
    if (editando) { ;({ error } = await supabase.from('produtos').update(payload).eq('id', editando)) }
    else { ;({ error } = await supabase.from('produtos').insert(payload)) }
    if (error) { showMsg('Erro: ' + error.message, 'danger') }
    else {
      await registrarLog({ acao: editando ? 'editou' : 'cadastrou', modulo: 'produtos', descricao: `${editando ? 'Editou' : 'Cadastrou'} produto "${payload.nome}"${payload.publicar_site ? ' · publicado no site' : ''}` })
      showMsg(editando ? 'Produto atualizado!' : 'Produto cadastrado!', 'success')
      fecharModal(); loadProdutos()
    }
    setSalvando(false)
  }

  async function arquivar(id) {
    if (!confirm('Arquivar este produto?')) return
    const prod = produtos.find(p => p.id === id)
    await supabase.from('produtos').update({ ativo: false }).eq('id', id)
    await registrarLog({ acao: 'arquivou', modulo: 'produtos', descricao: `Arquivou produto "${prod?.nome}"`, referencia_id: id })
    showMsg('Produto arquivado.', 'success'); loadProdutos()
  }

  async function restaurar(id) {
    const prod = arquivados.find(p => p.id === id)
    await supabase.from('produtos').update({ ativo: true }).eq('id', id)
    await registrarLog({ acao: 'restaurou', modulo: 'produtos', descricao: `Restaurou produto "${prod?.nome}"`, referencia_id: id })
    showMsg('Produto restaurado!', 'success'); loadProdutos()
  }

  async function excluir(id) {
    if (!confirm('⚠️ Excluir permanentemente?')) return
    const prod = [...produtos, ...arquivados].find(p => p.id === id)
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) { showMsg('Não foi possível excluir — arquive em vez disso.', 'danger') }
    else {
      await registrarLog({ acao: 'excluiu', modulo: 'produtos', descricao: `Excluiu produto "${prod?.nome}"` })
      showMsg('Produto excluído.', 'success'); loadProdutos()
    }
  }

  function showMsg(text, type = 'success') { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }
  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const margem = (c, v) => v > 0 ? (((v - c) / v) * 100).toFixed(0) + '%' : '—'
  const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) && (catFiltro === 'todas' || p.categoria === catFiltro))
  const estoqueStatus = (p) => {
    if (p.estoque_atual === 0) return { label: 'Zerado', cls: 'badge-danger' }
    if (p.estoque_atual <= p.estoque_minimo) return { label: 'Baixo', cls: 'badge-warning' }
    return { label: 'OK', cls: 'badge-success' }
  }

  return (
    <div>
      {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}
      <div className="page-header">
        <div>
          <h2 className="page-title">Produtos</h2>
          <p className="page-subtitle">{produtos.length} ativo(s) · {arquivados.length} arquivado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => abrirModal()}>+ Novo Produto</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ k: 'ativos', l: `✅ Ativos (${produtos.length})` }, { k: 'arquivados', l: `📦 Arquivados (${arquivados.length})` }].map(a => (
          <button key={a.k} onClick={() => setAba(a.k)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: aba === a.k ? 'var(--dourado)' : 'var(--branco)', color: aba === a.k ? 'white' : 'var(--texto-leve)', border: '1.5px solid', borderColor: aba === a.k ? 'var(--dourado)' : 'var(--bege-dark)' }}>{a.l}</button>
        ))}
      </div>

      {aba === 'ativos' && (
        <>
          <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="form-input" style={{ maxWidth: 220, margin: 0 }} placeholder="🔍  Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['todas', ...categorias].map(c => (
                  <button key={c} onClick={() => setCatFiltro(c)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: catFiltro === c ? 'var(--dourado)' : 'var(--bege)', color: catFiltro === c ? 'white' : 'var(--texto-leve)', border: 'none', textTransform: 'capitalize' }}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          {loading ? <p style={{ color: 'var(--texto-leve)', padding: 24 }}>Carregando...</p> : filtrados.length === 0 ? (
            <div className="card empty-state"><div className="icon">📿</div><h3>Nenhum produto encontrado</h3><p>Cadastre seu primeiro produto</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Produto</th><th>Categoria</th><th>Custo</th><th>Preço Venda</th><th>Margem</th><th>Estoque</th><th>Status</th><th>Site</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
                <tbody>
                  {filtrados.map(p => {
                    const st = estoqueStatus(p)
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.nome}</td>
                        <td><span className="badge badge-nude" style={{ textTransform: 'capitalize' }}>{p.categoria}</span></td>
                        <td style={{ color: 'var(--texto-leve)' }}>{fmt(p.custo)}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(p.preco_venda)}</td>
                        <td><span style={{ fontWeight: 700, fontSize: 13, color: Number(p.preco_venda) > Number(p.custo) ? 'var(--success)' : 'var(--danger)' }}>{margem(p.custo, p.preco_venda)}</span></td>
                        <td><span style={{ fontWeight: 600 }}>{p.estoque_atual}</span><span style={{ color: 'var(--texto-leve)', fontSize: 11 }}> / mín {p.estoque_minimo}</span></td>
                        <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                        <td>{p.publicar_site ? <span className="badge badge-success">🌐 Publicado</span> : <span className="badge badge-nude" style={{ opacity: 0.5 }}>—</span>}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => abrirModal(p)}>✏️ Editar</button>
                            <button style={{ padding: '5px 10px', fontSize: 12, borderRadius: 8, background: 'var(--warning-light)', color: 'var(--warning)', fontWeight: 600 }} onClick={() => arquivar(p.id)}>📦</button>
                            <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => excluir(p.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {aba === 'arquivados' && (
        <>
          <div className="alert alert-warning" style={{ marginBottom: 16 }}>📦 Arquivados ficam ocultos nas vendas mas o histórico é preservado.</div>
          {arquivados.length === 0 ? <div className="card empty-state"><div className="icon">📦</div><h3>Nenhum produto arquivado</h3></div> : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Produto</th><th>Categoria</th><th>Preço Venda</th><th>Estoque</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
                <tbody>
                  {arquivados.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500, opacity: 0.6 }}>{p.nome}</td>
                      <td><span className="badge badge-nude" style={{ textTransform: 'capitalize' }}>{p.categoria}</span></td>
                      <td style={{ color: 'var(--texto-leve)' }}>{fmt(p.preco_venda)}</td>
                      <td style={{ color: 'var(--texto-leve)' }}>{p.estoque_atual} un</td>
                      <td><div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}><button className="btn btn-success" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => restaurar(p.id)}>♻️ Restaurar</button><button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => excluir(p.id)}>🗑️</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--branco)', zIndex: 10, borderBottom: '1px solid var(--bege-dark)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 22 }}>{editando ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={fecharModal} style={{ background: 'none', fontSize: 20, color: 'var(--texto-leve)' }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome do Produto *</label>
                <input className="form-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Terço de Nossa Senhora" />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select className="form-input" style={{ flex: 1, margin: 0 }} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {categorias.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                  </select>
                  {!addingCat && <button type="button" onClick={() => setAddingCat(true)} style={{ padding: '0 14px', borderRadius: 8, background: 'var(--bege)', border: '1.5px solid var(--bege-dark)', fontSize: 18, cursor: 'pointer', color: 'var(--dourado-dark)', fontWeight: 700 }}>+</button>}
                </div>
                {addingCat && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <input className="form-input" style={{ flex: 1, margin: 0 }} placeholder="Nova categoria..." value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') adicionarCategoria(); if (e.key === 'Escape') { setAddingCat(false); setNovaCategoria('') } }} autoFocus />
                    <button type="button" onClick={adicionarCategoria} style={{ padding: '0 14px', borderRadius: 8, background: 'var(--dourado)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Criar</button>
                    <button type="button" onClick={() => { setAddingCat(false); setNovaCategoria('') }} style={{ padding: '0 10px', borderRadius: 8, background: 'var(--bege)', border: '1px solid var(--bege-dark)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                )}
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Custo de compra (R$)</label><input className="form-input" type="number" step="0.01" min="0" value={form.custo} onChange={e => setForm(f => ({ ...f, custo: e.target.value }))} placeholder="0,00" /></div>
                <div className="form-group"><label className="form-label">Preço de Venda (R$) *</label><input className="form-input" type="number" step="0.01" min="0" value={form.preco_venda} onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))} placeholder="0,00" /></div>
              </div>
              {form.custo && form.preco_venda && (
                <div style={{ background: 'var(--bege)', borderRadius: 8, padding: '9px 14px', fontSize: 13, marginBottom: 4 }}>
                  💡 Margem: <strong style={{ color: 'var(--success)' }}>{margem(form.custo, form.preco_venda)}</strong> · Lucro: <strong>{fmt(Number(form.preco_venda) - Number(form.custo))}</strong>
                </div>
              )}
              <div className="form-group" style={{ marginTop: 8 }}>
                <Precificadora custo={form.custo} onAplicar={(preco) => setForm(f => ({ ...f, preco_venda: preco }))} />
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Estoque Atual</label><input className="form-input" type="number" min="0" value={form.estoque_atual} onChange={e => setForm(f => ({ ...f, estoque_atual: e.target.value }))} placeholder="0" /></div>
                <div className="form-group"><label className="form-label">Estoque Mínimo</label><input className="form-input" type="number" min="0" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} placeholder="5" /></div>
              </div>
              <SecaoVitrine form={form} setForm={setForm} />
            </div>
            <div className="modal-footer" style={{ position: 'sticky', bottom: 0, background: 'var(--branco)', zIndex: 10, borderTop: '1px solid var(--bege-dark)', paddingTop: 12 }}>
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
