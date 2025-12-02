import { Tldraw } from "tldraw";

const TestCanvas = () => {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw />
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        background: 'white', 
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000 
      }}>
        Tldraw Test - If you see this, tldraw is working!
      </div>
    </div>
  );
};

export default TestCanvas;
