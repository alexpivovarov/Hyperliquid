import './App.css'

function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <h1>HyperGate Widget Library</h1>
      <p>This is the component library dev server.</p>
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#222' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#A855F7' }}>Looking for the Demo?</h2>
        <p>Please access the full demo application on port <b>5173</b>:</p>
        <a
          href="http://localhost:5173"
          style={{
            display: 'inline-block',
            marginTop: '10px',
            padding: '10px 20px',
            backgroundColor: '#A855F7',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}
        >
          Go to Demo App →
        </a>
      </div>
    </div>
  )
}

export default App
