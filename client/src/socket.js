
import { io } from 'socket.io-client';

// Use Render in production and localhost during local development
const socket = io(
  import.meta.env.VITE_API_URL || 'http://localhost:5000',
  {
    autoConnect: false,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  }
);

export default socket;
