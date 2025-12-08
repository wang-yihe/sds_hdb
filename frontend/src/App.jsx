import { useState } from "react";
import LassoDemo from "./components/ui/LassoDemo";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [perspective, setPerspective] = useState(null);
  const [styles, setStyles] = useState([]);
  const [plants, setPlants] = useState([]);
  const [greenMask, setGreenMask] = useState(null);
  const [speciesName, setSpeciesName] = useState("");

  const [maskPreviewUrl, setMaskPreviewUrl] = useState(null);
  const [hardMaskUrl, setHardMaskUrl] = useState(null);
  const [softMaskUrl, setSoftMaskUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [prompts, setPrompts] = useState([{ text: "" }]);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  async function handleUpload(e, setter, multiple = false) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (multiple) {
      const arr = [];
      for (const f of files) {
        const b64 = await fileToBase64(f);
        arr.push(b64);
      }
      setter(arr);
    } else {
      const b64 = await fileToBase64(files[0]);
      setter(b64);
    }
  }

  function updatePrompt(idx, value) {
    const arr = [...prompts];
    arr[idx].text = value;
    setPrompts(arr);
  }

  function addPrompt() {
    setPrompts([...prompts, { text: "" }]);
  }

  async function generate() {
    if (!perspective) {
      alert("Please upload a perspective view image first.");
      return;
    }

    setLoading(true);

    const body = {
      base_image_b64: perspective,
      style_refs_b64: styles,
      plant_refs_b64: plants,
      user_prompts: prompts.filter(p => p.text.trim() !== "").map(p => ({
        text: p.text,
        category: "global",
        weight: 1.0
      })),
      species_name: speciesName?.trim() || null,
      green_overlay_b64: greenMask,
      size: "1024x1024",
      stage3_use_soft_mask: false
    };

    const r = await fetch("/api/generate_all_smart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    setLoading(false);

    if (!data.ok) {
      alert("Error: " + JSON.stringify(data));
      return;
    }

    setPreviewUrl(data.finalPath);
  }

  async function previewMask() {
    if (!perspective) { alert("Upload a perspective image first."); return; }
    if (!greenMask)   { alert("Upload a GREEN planting mask first."); return; }
  
    setPreviewLoading(true);
    setMaskPreviewUrl(null);
    setHardMaskUrl(null);
    setSoftMaskUrl(null);
  
    const r = await fetch("/api/preview_mask", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        base_image_b64: perspective,
        green_overlay_b64: greenMask
      })
    });
  
    const data = await r.json();
    setPreviewLoading(false);
  
    if (!data.ok) { alert("Preview failed: " + JSON.stringify(data)); return; }
  
    // Backend returns raw base64 strings — convert to data URLs for <img>
    setMaskPreviewUrl(`data:image/png;base64,${data.previewB64}`);
    setHardMaskUrl(`data:image/png;base64,${data.hardMaskB64}`);
    setSoftMaskUrl(`data:image/png;base64,${data.softMaskB64}`);
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🌿 Rooftop Garden AI — Prototype</h1>

      <h2>1. Perspective Image</h2>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleUpload(e, setPerspective, false)}
      />
      {perspective && <p>✔ Uploaded</p>}

      <h2>2. Style Reference Images (multi)</h2>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleUpload(e, setStyles, true)}
      />
      <p>{styles.length} uploaded</p>

      <h2>3. Plant Reference Images (multi)</h2>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleUpload(e, setPlants, true)}
      />
      <p>{plants.length} uploaded</p>

      <div style={{ marginTop: 8 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          Plant / species name (optional)
        </label>
        <input
          value={speciesName}
          onChange={(e) => setSpeciesName(e.target.value)}
          placeholder="e.g., Archontophoenix alexandrae (Alexander palm)"
          style={{ width: "80%", padding: "8px 10px", borderRadius: 6, border: "1px solid #444", background: "#111", color: "#fff" }}
        />
        <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
          This is sent to the prompt model with high priority to enforce species anatomy & colour.
        </div>
      </div>

      <h2>4. Green Mask (optional)</h2>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleUpload(e, setGreenMask, false)}
      />
      {greenMask && <p>✔ Green mask uploaded</p>}

      <h2>5. Prompts (context + direction)</h2>
      {prompts.map((p, idx) => (
        <div key={idx}>
          <input
            value={p.text}
            placeholder="e.g. Use palms to frame the walkway"
            onChange={(e) => updatePrompt(idx, e.target.value)}
            style={{ width: "80%", margin: "6px 0" }}
          />
        </div>
      ))}
      <button onClick={addPrompt}>+ Add another prompt</button>

      <hr style={{ margin: "2rem 0" }} />

      <button
        onClick={generate}
        disabled={loading}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.2rem",
          background: "#2D7B52",
          color: "white",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer"
        }}
      >
        {loading ? "Generating…" : "Generate Design"}
      </button>

      {/* {previewUrl && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Final Output</h2>
          <img
            src={previewUrl}
            alt="result"
            style={{ maxWidth: "100%", border: "1px solid #ccc" }}
          />
        </div>
      )} */}

      {previewUrl && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Final Output</h2>
          <img
            src={previewUrl}
            alt="result"
            style={{ maxWidth: "100%", border: "1px solid #ccc", borderRadius: 8 }}
          />
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setShowEditor(true)}
              style={{
                padding: "0.6rem 1rem",
                background: "#0f766e",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer"
              }}
            >
              ✏️ Edit this result
            </button>
          </div>
        </div>
      )}

      {showEditor && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Mask & Regenerate Editor</h2>
          {/* Pass the server URL (or data URL) of your generated image */}
          <LassoDemo externalSrc={previewUrl}/>
        </div>
      )}
    </div>
  );
}