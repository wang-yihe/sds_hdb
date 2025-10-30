import { useEffect, useRef, useState } from "react";
import sampleImg from "../assets/drag and drop image.webp";

export default function LassoDemo() {
  const canvasRef = useRef(null);
  const maskPreviewRef = useRef(null);

  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [imgEl, setImgEl] = useState(null);
  const [fallback, setFallback] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false); // highlight flag
  const [prompt, setPrompt] = useState("fill plausibly");
  const [results, setResults] = useState([]);   // array of result image URLs
  const [loading, setLoading] = useState(false);

  // ---------- Draw ----------
  function draw(img = imgEl, pts = points, closed = isClosed) {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    if (img) ctx.drawImage(img, 0, 0, c.width, c.height);
    else {
      ctx.fillStyle = "#eee"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#ccc"; ctx.fillRect(20, 20, c.width - 40, c.height - 40);
    }

    if (pts.length >= 2) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "cyan";
      ctx.fillStyle = "rgba(0,255,255,0.08)";
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

  function loadHTMLImage(src) {
    return new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = src;
    });
  }

  async function setCanvasImageFromSrc(src) {
    try {
      const i = await loadHTMLImage(src);
      setImgEl(i);
      setFallback(false);
      const c = canvasRef.current;
      c.width = i.naturalWidth;
      c.height = i.naturalHeight;
      resetSelection();
      draw(i, [], false);
    } catch {
      setImgEl(null);
      setFallback(true);
      const c = canvasRef.current;
      c.width = 800;
      c.height = 500;
      resetSelection();
      draw(null, [], false);
    }
  }

  useEffect(() => {
    setCanvasImageFromSrc(sampleImg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Mouse ----------
  function getCanvasPos(evt) {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
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

  useEffect(() => { draw(); /* eslint-disable-next-line */ }, [points, isClosed]);

  // ---------- Actions ----------
  function closeShape() {
    if (points.length >= 6) setIsClosed(true);
    else alert("Draw a bigger shape first.");
  }

  function makeMask() {
    if (points.length < 6) { alert("Draw a closed shape first."); return; }
    if (!isClosed) setIsClosed(true);

    const base = canvasRef.current;
    const m = document.createElement("canvas");
    m.width = base.width; m.height = base.height;
    const mctx = m.getContext("2d");

    mctx.fillStyle = "black";
    mctx.fillRect(0, 0, m.width, m.height);

    mctx.fillStyle = "white";
    mctx.beginPath();
    mctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) mctx.lineTo(points[i], points[i + 1]);
    mctx.closePath();
    mctx.fill();

    const dataUrl = m.toDataURL("image/png");
    if (maskPreviewRef.current) maskPreviewRef.current.src = dataUrl;
  }

  async function generateWithSD() {
    if (!canvasRef.current) return;
  
    // Base image = whatever is currently on the canvas
    const baseDataUrl = canvasRef.current.toDataURL("image/png");
  
    // Build a fresh binary mask (white = change, black = keep)
    if (points.length < 6) { alert("Draw & close a shape first."); return; }
    const m = document.createElement("canvas");
    m.width = canvasRef.current.width;
    m.height = canvasRef.current.height;
    const mctx = m.getContext("2d");
    mctx.fillStyle = "black"; mctx.fillRect(0,0,m.width,m.height);
    mctx.fillStyle = "white"; mctx.beginPath();
    mctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) mctx.lineTo(points[i], points[i+1]);
    mctx.closePath(); mctx.fill();
    const maskDataUrl = m.toDataURL("image/png");
  
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("http://localhost:5050/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: baseDataUrl,
          mask: maskDataUrl,
          prompt,
          num: 3,                 // number of variations to return
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { images } = await res.json();
      setResults(images || []);
    } catch (e) {
      console.error(e);
      alert("Inpaint failed. Check the server terminal for details.");
    } finally {
      setLoading(false);
    }
  }

  async function generateWithSD() {
    if (!canvasRef.current) return;
  
    // Base image = whatever is currently on the canvas
    const baseDataUrl = canvasRef.current.toDataURL("image/png");
  
    // Build a fresh binary mask (white = change, black = keep)
    if (points.length < 6) { alert("Draw & close a shape first."); return; }
    const m = document.createElement("canvas");
    m.width = canvasRef.current.width;
    m.height = canvasRef.current.height;
    const mctx = m.getContext("2d");
    mctx.fillStyle = "black"; mctx.fillRect(0,0,m.width,m.height);
    mctx.fillStyle = "white"; mctx.beginPath();
    mctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) mctx.lineTo(points[i], points[i+1]);
    mctx.closePath(); mctx.fill();
    const maskDataUrl = m.toDataURL("image/png");
  
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("http://localhost:5050/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: baseDataUrl,
          mask: maskDataUrl,
          prompt,
          num: 3,                 // number of variations to return
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { images } = await res.json();
      setResults(images || []);
    } catch (e) {
      console.error(e);
      alert("Inpaint failed. Check the server terminal for details.");
    } finally {
      setLoading(false);
    }
  }
  // ---------- Upload + Drag ----------
  async function onFilePicked(file) {
    if (!file) return;
    const ok = /image\/(png|jpeg|jpg|webp)/i.test(file.type);
    if (!ok) { alert("Please choose a PNG/JPG/WebP image."); return; }
    const reader = new FileReader();
    reader.onload = async (e) => await setCanvasImageFromSrc(e.target.result);
    reader.readAsDataURL(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDraggingOver(false);
    const f = e.dataTransfer.files?.[0];
    onFilePicked(f);
  }
  function onDragOver(e) { e.preventDefault(); setIsDraggingOver(true); }
  function onDragLeave(e) { e.preventDefault(); setIsDraggingOver(false); }

  // ---------- UI ----------
  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2>Lasso test {fallback ? "(fallback mode)" : ""}</h2>

      {/* Upload controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={(e) => onFilePicked(e.target.files?.[0])}
        />
        <button onClick={() => setCanvasImageFromSrc(sampleImg)}>Use sample</button>
        <span style={{ fontSize: 12, color: "#666" }}>
          Tip: Drag & drop an image onto the dashed box below.
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          style={{
            position: "relative",
            border: isDraggingOver ? "3px dashed #00b4ff" : "2px dashed #bbb",
            borderRadius: 8,
            padding: 6,
            transition: "border 0.2s",
            background: isDraggingOver ? "rgba(0,180,255,0.05)" : "transparent",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ maxWidth: "100%", display: "block", borderRadius: 6 }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
          />
          {isDraggingOver && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "rgba(0,180,255,0.1)",
                color: "#0077b6",
                fontWeight: 600,
                fontSize: 20,
                borderRadius: 8,
              }}
            >
              Drop image here 📁
            </div>
          )}
        </div>

        <div>
  <h3>Mask Preview (white = change, black = keep)</h3>
  <img
    ref={maskPreviewRef}
    alt="mask preview"
    style={{
      maxWidth: "100%",
      border: "1px solid #ddd",
      borderRadius: 8,
      background: "#fafafa",
    }}
  />

  {results.length > 0 && (
    <>
      <h3 style={{ marginTop: 12 }}>Results</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {results.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`result ${i}`}
            style={{ width: "100%", border: "1px solid #ddd", borderRadius: 8 }}
          />
        ))}
      </div>
    </>
  )}
</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
  <button onClick={() => { resetSelection(); draw(); }}>Clear</button>
  <button onClick={closeShape}>Close Shape</button>
  <button onClick={makeMask}>Make Mask</button>

  <input
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    placeholder="Describe what to add/replace"
    style={{ padding: 6, minWidth: 240 }}
  />
  <button onClick={generateWithSD} disabled={loading}>
    {loading ? "Generating…" : "Generate (Stable Diffusion)"}
  </button>
</div>

      <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
        Click and drag to draw a lasso. Drop or upload a new image anytime to reset.
      </div>
    </div>
  );
}