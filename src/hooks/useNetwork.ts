import { useEffect, useState } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';

export const useNetwork = () => {
  const [status, setStatus] = useState<ConnectionStatus>();

  useEffect(() => {
    const handle = Network.addListener('networkStatusChange', status => {
      setStatus(status);
    });
    Network.getStatus().then(setStatus);
    return () => { handle.then(h => h.remove()); };
  }, []);

  return status;
};