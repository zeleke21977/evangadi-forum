import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

// Same base URL the REST API uses (see api.client.js) — Socket.IO and Axios
// talk to the same backend, just over different protocols.
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3777';

const SocketContext = createContext(null);

/**
 * One authenticated Socket.IO connection for the whole app.
 *
 * Notifications, unread badges, chat/discussion threads and RAG document
 * status all share it, so a user holds a single connection no matter how many
 * features are listening. It is opened when someone is logged in and closed on
 * logout. Default transports are kept on purpose: the browser tries WebSocket
 * and quietly falls back to long-polling only if a proxy blocks the upgrade.
 */
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId || !localStorage.getItem('token')) return undefined;

    const instance = io(SOCKET_URL, {
      // A function, so every (re)connect sends the latest token.
      auth: callback => callback({ token: localStorage.getItem('token') }),
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The socket is an external resource created here; React needs to know when it is ready.
    setSocket(instance);

    return () => {
      instance.disconnect();
      setSocket(null);
    };
  }, [userId]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- Hooks live beside their provider, as in the other contexts.
export function useSocket() {
  return useContext(SocketContext);
}

/** Run `handler` every time the server pushes `event`. Always uses the latest handler. */
// eslint-disable-next-line react-refresh/only-export-components
export function useSocketEvent(event, handler) {
  const socket = useSocket();
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (...args) => latest.current(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}

/**
 * Run `handler` after the socket RE-connects (e.g. wifi dropped, server
 * restarted). Events pushed while offline are lost, so listeners use this to
 * fetch fresh data once and catch up. Does not fire for the first connection.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSocketResync(handler) {
  const socket = useSocket();
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!socket) return undefined;
    let first = true;
    const onConnect = () => {
      if (first) {
        first = false;
        return;
      }
      latest.current();
    };
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, [socket]);
}
