import { useState } from "react";

export default function MultiUploader({ onDone }) {
  const [perspectives, setPerspectives] = useState([]);
  const [styles, setStyles] = useState([]);
  const [plants, setPlants] = useState([]);

  function handleUpload(setter) {
    return (e) => {
      const files = Array.from(e.target.files || []);
      setter(files);
    };
  }

  async function fileToBase64(file) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(String(reader.result).split(",")[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  async function submit() {
    if (perspectives.length === 0) {
      alert("Please upload at least one perspective image");
      return;
    }

    const perspective_b64 = await Promise.all(
      perspectives.map((f) => fileToBase64(f))
    );
    const style_b64 = await Promise.all(styles.map((f) => fileToBase64(f)));
    const plant_b64 = await Promise.all(plants.map((f) => fileToBase64(f)));

    onDone({
      perspective_b64,
      style_b64,
      plant_b64,
    });
  }

  return (
    <div className="p-4 space-y-6">

      {/* Perspective Input */}
      <div>
        <label className="font-semibold">Perspective View (upload 1 or more)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload(setPerspectives)}
          className="block w-full border p-2 mt-1"
        />
        <p className="text-sm text-gray-500">{perspectives.length} file(s) selected</p>
      </div>

      {/* Style References */}
      <div>
        <label className="font-semibold">Style Reference Images (multiple allowed)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload(setStyles)}
          className="block w-full border p-2 mt-1"
        />
        <p className="text-sm text-gray-500">{styles.length} file(s) selected</p>
      </div>

      {/* Plants */}
      <div>
        <label className="font-semibold">Plant Reference Images (multiple allowed)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload(setPlants)}
          className="block w-full border p-2 mt-1"
        />
        <p className="text-sm text-gray-500">{plants.length} file(s) selected</p>
      </div>

      <button
        onClick={submit}
        className="px-4 py-2 bg-green-600 text-white rounded shadow"
      >
        Submit All Images
      </button>
    </div>
  );
}