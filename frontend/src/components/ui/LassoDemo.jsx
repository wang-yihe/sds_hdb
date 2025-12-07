import { useEffect, useRef, useState } from "react";

/** Fetch a URL -> base64 (no data: prefix) */
async function urlToBase64(url) {
  const resp = await fetch(url, { cache: "no-store" });
  const blob = await resp.blob();
  const reader = new FileReader();
  return await new Promise((resolve) => {
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
  });
}

/**
 * Props:
 *  - externalSrc: URL of the generated image to edit (string)
 *  - onDone: (newUrl: string) => void   // called with server result path
 */
export default function LassoDemo({ externalSrc, onDone }) {
  const canvasRef = useRef(null);
  const maskPreviewRef = useRef(null);

  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [imgEl, setImgEl] = useState(null);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  // >>> ADDED: gallery state for recent results
  const [results, setResults] = useState([]);

  // ---------- load + draw ----------
  useEffect(() => {
    if (!externalSrc) return;
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => {
      setImgEl(i);
      const c = canvasRef.current;
      c.width = i.naturalWidth;
      c.height = i.naturalHeight;
      resetSelection();
      draw(i, [], false);
    };
    // cache-bust
    i.src = externalSrc + (externalSrc.includes("?") ? "&" : "?") + "v=" + Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSrc]);

  function draw(img = imgEl, pts = points, closed = isClosed) {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    if (img) ctx.drawImage(img, 0, 0, c.width, c.height);

    if (pts.length >= 2) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "cyan";
      ctx.fillStyle = "rgba(0,255,255,0.1)";
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      if (closed) { ctx.closePath(); ctx.fill(); }
      ctx.stroke();
    }
  }

  function resetSelection() {
    setPoints([]);
    setIsClosed(false);
    if (maskPreviewRef.current) maskPreviewRef.current.src = "";
  }

  useEffect(() => { draw(); /* eslint-disable-line */ }, [points, isClosed]);

  // ---------- mouse ----------
  function getCanvasPos(evt) {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const sx = c.width / rect.width;
    const sy = c.height / rect.height;
    return { x: (evt.clientX - rect.left) * sx, y: (evt.clientY - rect.top) * sy };
  }
  function onDown(e) {
    if (isClosed) return;
    setIsDrawing(true);
    const p = getCanvasPos(e);
    setPoints((prev) => [...prev, p.x, p.y]);
  }
  function onMove(e) {
    if (!isDrawing || isClosed) return;
    const p = getCanvasPos(e);
    setPoints((prev) => [...prev, p.x, p.y]);
  }
  function onUp() { setIsDrawing(false); }

  // ---------- lasso actions ----------
  function closeShape() {
    if (points.length >= 6) setIsClosed(true);
    else alert("Draw a bigger shape first.");
  }

  function makeMaskDataURL() {
    if (points.length < 6) return null;
    const base = canvasRef.current;
    const m = document.createElement("canvas");
    m.width = base.width; m.height = base.height;
    const mctx = m.getContext("2d");
    // WHITE = editable, BLACK = keep
    mctx.fillStyle = "black"; mctx.fillRect(0, 0, m.width, m.height);
    mctx.fillStyle = "white";
    mctx.beginPath();
    mctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) mctx.lineTo(points[i], points[i + 1]);
    mctx.closePath();
    mctx.fill();
    return m.toDataURL("image/png");
  }

  function previewMask() {
    const d = makeMaskDataURL();
    if (d && maskPreviewRef.current) maskPreviewRef.current.src = d;
  }

  // >>> ADDED: helper to load a result back onto the canvas (optional)
  async function useResultOnCanvas(url) {
    const i = new Image();
    i.crossOrigin = "anonymous";
    await new Promise((res, rej) => { i.onload = res; i.onerror = rej; i.src = url; });
    setImgEl(i);
    const c = canvasRef.current;
    c.width = i.naturalWidth;
    c.height = i.naturalHeight;
    resetSelection();
    draw(i, [], false);
  }

  // ---------- apply edit ----------
  async function applyEdit() {
    if (!externalSrc) { alert("No image to edit."); return; }
    if (!isClosed || points.length < 6) { alert("Close the lasso first."); return; }

    try {
      setLoading(true);
      const image_b64 = await urlToBase64(externalSrc);
      const maskDataUrl = makeMaskDataURL();
      if (!maskDataUrl) throw new Error("Mask build failed.");
      const mask_b64 = maskDataUrl.split(",")[1];

      const r = await fetch("/api/edit_lasso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_b64,
          mask_b64,             // white=editable (backend inverts alpha for OpenAI)
          prompt,
          size: "natural"
        })
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data?.detail || JSON.stringify(data));

      const url = `${data.resultPath}?v=${Date.now()}`;
      onDone?.(url);                // update parent preview
      resetSelection();             // keep the same image on canvas; user can lasso again
      setResults((prev) => [url, ...prev]);  // remember in a small gallery
    } catch (e) {
      console.error(e);
      alert("Edit failed. Check server logs.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- UI ----------
  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h3>Circle an area to refine</h3>

      <canvas
        ref={canvasRef}
        style={{ maxWidth: "100%", display: "block", borderRadius: 6, border: "1px solid #ddd" }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => { resetSelection(); draw(); }}>Clear</button>
        <button onClick={closeShape}>Close Shape</button>
        <button onClick={previewMask}>Preview Mask</button>
      </div>

      <div>
        <div style={{ fontSize: 12, color: "#666" }}>Mask Preview (white = editable)</div>
        <img ref={maskPreviewRef} alt="mask preview" style={{ maxWidth: "100%", border: "1px solid #eee" }} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what to change inside the lasso"
          style={{ padding: 8, minWidth: 280, flex: 1 }}
        />
        <button onClick={applyEdit} disabled={loading}>
          {loading ? "Editing…" : "Apply Edit"}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Recent results</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {results.map((u, i) => (
              <div key={i} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 6 }}>
                <img src={u} alt={`r${i}`} style={{ height: 1000, display: "block" }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}