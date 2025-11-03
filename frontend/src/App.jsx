import UploadBox from "./components/UploadBox";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#121212", // optional dark background
        color: "white", // makes text readable on dark bg
      }}
    >
      <h1 style={{ marginBottom: "24px", fontSize: "2rem" }}>File Upload Demo</h1>

      <div
        style={{
          border: "1px solid #444",
          borderRadius: "12px",
          padding: "32px",
          backgroundColor: "#1e1e1e",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        <UploadBox />
      </div>
    </div>
  );
}
