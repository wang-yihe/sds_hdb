import { useEffect, useMemo, useRef, useState } from "react"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export default function UploadBox() {
  const [file, setFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setServerUrl(null)
    setStatus("")
    setFile(f ?? null)

    if (f && f.type.startsWith("image/")) {
      // revoke previous object URL to avoid leaks
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(f)
      objectUrlRef.current = url
      setLocalPreview(url)
    } else {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setLocalPreview(null)
    }
  }

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a file first.")
      return
    }
    setUploading(true)
    setStatus("")
    setServerUrl(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        // Try to parse server message if any
        let msg = `Upload failed (HTTP ${res.status})`
        try {
          const data = await res.json()
          if (data?.detail) msg += `: ${Array.isArray(data.detail) ? data.detail.map((d:any)=>d.msg).join(", ") : data.detail}`
          if (data?.message) msg += `: ${data.message}`
        } catch { /* ignore parse errors */ }
        setStatus(msg)
        return
      }

      const data = await res.json()
      setStatus(data.message ?? "Uploaded!")
      if (data.url) setServerUrl(data.url)
    } catch (err: any) {
      setStatus(`Upload failed: ${err?.message ?? "Network error"}`)
    } finally {
      setUploading(false)
    }
  }

  // Prefer server URL after upload; otherwise show local preview
  const previewSrc = useMemo(() => serverUrl || localPreview, [serverUrl, localPreview])

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "20px",
        maxWidth: "420px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h2 style={{ marginBottom: "10px" }}>Upload a File</h2>

      <input
        type="file"
        onChange={handleChange}
        accept="image/*" // optional: restrict picker to images
      />

      {previewSrc && (
        <div style={{ marginTop: "15px" }}>
          <img
            src={previewSrc}
            alt="Preview"
            style={{
              width: "100%",
              maxHeight: "300px",
              objectFit: "cover",
              borderRadius: "6px",
            }}
          />
          {serverUrl && (
            <p style={{ fontSize: 12, marginTop: 6, wordBreak: "break-all" }}>
              Uploaded to: <a href={serverUrl} target="_blank" rel="noreferrer">{serverUrl}</a>
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: "15px" }}>
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          style={{
            backgroundColor: uploading ? "#94a3b8" : "#2563eb",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: "6px",
            cursor: uploading || !file ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {status && (
        <p style={{ marginTop: "10px", color: status.startsWith("Upload failed") ? "#b91c1c" : "#555" }}>
          {status}
        </p>
      )}
    </div>
  )
}
