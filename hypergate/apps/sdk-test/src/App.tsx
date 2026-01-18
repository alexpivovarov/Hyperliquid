import { HyperGate } from '@hypergate/widget';

export default function App() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#000'
    }}>
      <HyperGate apiKey="lifi_123" />
    </div>
  );
}
