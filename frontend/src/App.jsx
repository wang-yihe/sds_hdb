// frontend/src/App.jsx
import { useState } from "react";
import MultiUploader from "./MultiUploader";
import PromptComposer from "./PromptComposer";

export default function App() {
  const [persp, setPersp] = useState([]);
  const [styles, setStyles] = useState([]);
  const [plants, setPlants] = useState([]);
  const [suggestedPlants, setSuggestedPlants] = useState([]); // new
  const [prompts, setPrompts] = useState([]);
  const [resultUrl, setResultUrl] = useState("");
  const [status, setStatus] = useState("Idle");

  function onUploads({ perspective_b64, style_b64, plant_b64, suggested_plant_b64 }) {
    setPersp(perspective_b64);
    setStyles(style_b64);
    setPlants(plant_b64);
    setSuggestedPlants(suggested_plant_b64 || []); // new
  }

  async function generateAll() {
    if (persp.length === 0) {
      alert("Upload at least one perspective image.");
      return;
    }
    setStatus("Generating…");
    const body = {
      base_image_b64: persp[0],
      style_refs_b64: styles,
      plant_refs_b64: plants,
      suggested_plant_refs_b64: suggestedPlants, // new
      user_prompts: prompts.map((p) => ({ text: p.text, category: p.category, weight: p.weight })),
      size: "1024x1024",
    };
    const r = await fetch("/api/generate_all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!data.ok) {
      setStatus("Error: " + (data.detail || "unknown"));
      return;
    }
    setResultUrl(data.resultPath);
    setStatus("Done ✅");
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Rooftop Garden Generator</h1>

      <MultiUploader onDone={onUploads} />

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">Prompts (multi-line context)</h2>
        <PromptComposer onChange={setPrompts} />
      </div>

      <button onClick={generateAll} className="px-4 py-2 bg-blue-600 text-white rounded">
        Generate (one click)
      </button>
      <div>Status: {status}</div>

      {resultUrl && (
        <div className="mt-4">
          <img src={resultUrl} alt="result" className="max-w-full rounded border" />
          <div>
            <a href={resultUrl} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
