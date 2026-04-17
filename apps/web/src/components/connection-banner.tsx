'use client';

import { useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { getSocket } from '../lib/ws-client';

export function ConnectionBanner() {
  const [visible, setVisible] = useState(false);
  const wasConnected = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      wasConnected.current = true;
      setVisible(false);
    }

    function onLost() {
      if (wasConnected.current) {
        setVisible(true);
      }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onLost);

    if (socket.connected) {
      wasConnected.current = true;
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onLost);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-yellow-600/90 px-3 py-1.5 text-xs font-medium text-white">
      <WifiOff size={14} />
      <span>Reconnecting to live data...</span>
    </div>
  );
}
