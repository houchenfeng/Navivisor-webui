/**
 * Zustand store for WebSocket connection state.
 */
import { create } from 'zustand';

interface ConnectionState {
  connected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connected: false,
  setConnected: (connected: boolean) => set({ connected }),
}));
