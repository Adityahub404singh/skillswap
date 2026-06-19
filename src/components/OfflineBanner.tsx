import { useNetwork } from '../hooks/useNetwork';

export const OfflineBanner = () => {
  const status = useNetwork();
  if (status?.connected) return null;

  return (
    <div style={{ backgroundColor: 'red', color: 'white', padding: '10px', textAlign: 'center' }}>
      You are currently offline. Showing cached data.
    </div>
  );
};