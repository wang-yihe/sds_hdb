// frontend/src/PromptComposer.jsx
import { useState } from "react";

const CATS = ["global", "style", "species", "constraints", "notes"];

export default function PromptComposer({ onChange }) {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [cat, setCat] = useState("global");
  const [weight, setWeight] = useState(1.0);

  function addItem() {
    const t = text.trim();
    if (!t) return;
    const next = [...items, { id: crypto.randomUUID(), text: t, category: cat, weight: Number(weight) }];
    setItems(next);
    setText("");
    onChange?.(next);
  }

  function removeItem(id) {
    const next = items.filter(x => x.id !== id);
    setItems(next);
    onChange?.(next);
  }

  function move(id, dir) {
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return;
    const j = i + (dir === "up" ? -1 : 1);
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    onChange?.(next);
  }

  function updateWeight(id, w) {
    const next = items.map(x => x.id === id ? { ...x, weight: Number(w) } : x);
    setItems(next);
    onChange?.(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={cat} onChange={e => setCat(e.target.value)} className="border p-2">
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          className="flex-1 border p-2"
          placeholder="Add a prompt line (Enter to add)…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" ? addItem() : null}
        />
        <input
          type="number" step="0.1" min="0.1" max="2.0"
          className="w-20 border p-2"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          title="Weight (importance)"
        />
        <button onClick={addItem} className="px-3 py-2 bg-green-600 text-white rounded">Add</button>
      </div>

      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={it.id} className="flex items-center gap-2 border rounded p-2">
            <span className="text-xs px-2 py-1 rounded bg-gray-100">{it.category}</span>
            <span className="flex-1">{it.text}</span>
            <label className="text-xs">w</label>
            <input
              type="number" step="0.1" min="0.1" max="2.0"
              className="w-20 border p-1"
              value={it.weight}
              onChange={e => updateWeight(it.id, e.target.value)}
            />
            <div className="flex flex-col">
              <button onClick={() => move(it.id, "up")} className="text-xs">↑</button>
              <button onClick={() => move(it.id, "down")} className="text-xs">↓</button>
            </div>
            <button onClick={() => removeItem(it.id)} className="text-xs text-red-600">remove</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">No prompts yet. Add a few lines for context and direction.</p>}
      </div>
    </div>
  );
}