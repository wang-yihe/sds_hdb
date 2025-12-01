import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export default function TestCanvas() {
  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}>
      <h1 style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, background: 'yellow', padding: '10px' }}>
        TLDRAW TEST - If you see this, React is working
      </h1>
      <Tldraw />
    </div>
  );
}
