// GlobalLoader.jsx
import { useSelector } from 'react-redux';

function GlobalLoader() {
  const { isLoading, message } = useSelector(state => state.globalLoader);

  if (!isLoading) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div>Loading...</div>
        {message && <div style={{ marginTop: '10px' }}>{message}</div>}
      </div>
    </div>
  );
}

export default GlobalLoader;