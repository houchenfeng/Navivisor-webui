/** Realtime MCP server startup status overlay from websocket notifications. */
import { create } from 'zustand';
import type {
  McpServerStartupState,
  McpServerStatusUpdatedNotification,
} from '@/types/mcp';

export interface McpServerRuntimeStatus {
  name: string;
  status: McpServerStartupState;
  error: string | null;
  updatedAt: number;
}

interface McpState {
  statuses: Record<string, McpServerRuntimeStatus>;
  setServerStatus: (payload: McpServerStatusUpdatedNotification) => void;
  clear: () => void;
}

export const useMcpStore = create<McpState>((set) => ({
  statuses: {},

  setServerStatus: (payload) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        [payload.name]: {
          name: payload.name,
          status: payload.status,
          error: payload.error,
          updatedAt: Date.now(),
        },
      },
    })),

  clear: () => set({ statuses: {} }),
}));
