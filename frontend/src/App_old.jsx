import { useState } from 'react'
import './App.css'

function App() {
  // --- State ---
  const [prompt, setPrompt] = useState('Add softscape plants in formal style; realistic lighting; preserve architecture')
  const [size, setSize] = useState('1024x1024')

  // Base image for initial img2img generation
  const [baseFile, setBaseFile] = useState(null)
  const [basePreview, setBasePreview] = useState('')

  // URL returned by your backend after generation (e.g., /api/file/result_xxx.png)
  const [imgUrl, setImgUrl] = useState('')
  // Base64 string of a binary mask (PNG where white = edit, black = keep)
  const [maskB64, setMaskB64] = useState('')
  const [status, setStatus] = useState('Idle')

  // --- Helpers ---
  async function b64FromUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const blob = await res.blob();
    // Read as DataURL to avoid spreading huge arrays
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // reader.result is like "data:image/png;base64,AAA..."
        const s = String(reader.result || "");
        const comma = s.indexOf(",");
        resolve(comma >= 0 ? s.slice(comma + 1) : "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return base64;
  }

  async function fileToB64(file) {
    if (!file) return ''
    const reader = new FileReader()
    return await new Promise((resolve, reject) => {
      reader.onload = () => {
        // reader.result is data URL like "data:image/png;base64,AAAA..."
        const base64 = String(reader.result).split(',')[1] || ''
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // --- 0) Handle base image upload ---
  async function onBaseFileChange(e) {
    const file = e.target.files?.[0]
    setBaseFile(file || null)
    if (file) {
      setBasePreview(URL.createObjectURL(file))
    } else {
      setBasePreview('')
    }
  }

  // --- 1A) Initial GENERATION from ChatGPT Images (TEXT prompt only) ---
  async function generateFromPrompt() {
    try {
      if (!prompt.trim()) { alert('Enter a prompt first'); return }
      setStatus('Generating from prompt...')
      const r = await fetch('/api/generate_chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size })
      })
      const data = await r.json()
      if (!data.ok) throw new Error(data.detail || 'Generate failed')
      setImgUrl(data.resultPath)
      setStatus('Done ✓')
    } catch (e) {
      console.error(e)
      setStatus('Error: ' + e.message)
      alert(e.message)
    }
  }

  // --- 1B) Initial GENERATION from IMAGE + PROMPT (img2img style) ---
  async function generateFromImage() {
    try {
      if (!baseFile) { alert('Upload a base image first'); return }
      if (!prompt.trim()) { alert('Enter a prompt first'); return }
      setStatus('Generating from image + prompt...')
      const image_b64 = await fileToB64(baseFile)
      const r = await fetch('/api/generate_from_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_b64, prompt, size })
      })
      const data = await r.json()
      if (!data.ok) throw new Error(data.detail || 'Generate-from-image failed')
      setImgUrl(data.resultPath)
      setStatus('Done ✓')
    } catch (e) {
      console.error(e)
      setStatus('Error: ' + e.message)
      alert(e.message)
    }
  }

  // --- 2) ChatGPT polish: global (no hard mask) ---
  async function polishFull() {
    try {
      if (!imgUrl) { alert('Set an image URL first'); return }
      setStatus('Polishing (global)...')
      alert("here")
      const b64 = await b64FromUrl(imgUrl)
      const r = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_b64: b64,
          prompt: 'Preserve composition. Gentle color grading for formal tropical garden. Improve foliage realism.',
          size,
          use_mask: false
        })
      })
      const data = await r.json()
      if (!data.ok) throw new Error(data.detail || 'Polish failed')
      setImgUrl(data.resultPathß)
      setStatus('Done ✓')
    } catch (e) {
      console.error(e)
      setStatus('Error: ' + e.message)
      alert(e.message)
    }
  }

  // --- 3) ChatGPT polish: masked (hard composited on server) ---
  async function polishMasked() {
    try {
      if (!imgUrl) { alert('Set an image URL first'); return }
      if (!maskB64) { alert('Upload a mask PNG first'); return }
      setStatus('Polishing (masked)...')
      const b64 = await b64FromUrl(imgUrl)
      const r = await fetch('/api/polish_masked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_b64: b64,
          mask_b64: maskB64,   // white = edit, black = keep
          feather_px: 2,
          poisson: false,
          size,
          prompt: 'Limit visible changes to the masked area. Preserve geometry; enhance realism within mask.'
        })
      })
      const data = await r.json()
      if (!data.ok) throw new Error(data.detail || 'Polish masked failed')
      setImgUrl(data.resultPath)
      setStatus('Done ✓')
    } catch (e) {
      console.error(e)
      setStatus('Error: ' + e.message)
      alert(e.message)
    }
  }

  // --- UI handlers ---
  async function onMaskFileChange(e) {
    const file = e.target.files?.[0]
    const b64 = await fileToB64(file)
    setMaskB64(b64)
  }

  return (
    <>
      <h1>Softscape – ChatGPT Generate & Polish</h1>

      <div className="card">
        <label>Base Image (for image+prompt generation)</label>
        <input type="file" accept="image/*" onChange={onBaseFileChange} />
        {basePreview && (
          <div style={{ marginTop: 8 }}>
            <small>Preview of base image:</small>
            <img src={basePreview} alt="Base preview" style={{ maxWidth: 280, borderRadius: 6, display: 'block', marginTop: 6 }} />
          </div>
        )}

        <label style={{ marginTop: 12 }}>Prompt</label>
        <textarea
          rows={3}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe how to edit/add softscape..."
          style={{ width: '100%' }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ flex: 1 }}>
            Size
            <select value={size} onChange={e => setSize(e.target.value)} style={{ width: '100%', marginTop: 8 }}>
              <option value="512x512">512×512</option>
              <option value="768x768">768×768</option>
              <option value="1024x1024">1024×1024</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={generateFromImage}>Generate from Image + Prompt</button>
          <button type="button" onClick={generateFromPrompt}>Generate from Prompt Only</button>
        </div>
      </div>

      <div className="card">
        <label>Generated Image URL (from backend)</label>
        <input
          placeholder="/api/file/result_123.png or https://..."
          value={imgUrl}
          onChange={e => setImgUrl(e.target.value)}
        />

        <label>Mask PNG (white=edit, black=keep)</label>
        <input type="file" accept="image/png" onChange={onMaskFileChange} />
        <small>{maskB64 ? 'Mask loaded ✓' : 'No mask loaded'}</small>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={polishFull}>ChatGPT Polish (global)</button>
          <button type="button" onClick={polishMasked}>ChatGPT Polish (masked)</button>
        </div>

        <p className="hint">Status: {status}</p>
      </div>

      {imgUrl && (
        <div className="card">
          <h3>Preview</h3>
          <img src={imgUrl} alt="Result" />
          <div><a href={imgUrl} target="_blank" rel="noreferrer">Open image</a></div>
        </div>
      )}
    </>
  )
}

export default App
