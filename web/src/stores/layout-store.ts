/**
 * Layout & sidebar UI state store.
 * Manages responsive layout behavior (sidebar visibility, collapse state)
 * and sidebar navigation state (view mode, collapsed groups).
 *
 * Persisted fields (localStorage via Zustand persist):
 *   - desktopSidebarCollapsed: whether desktop sidebar is manually collapsed
 *   - collapsedGroupKeys: workspace group collapse preferences
 *
 * Runtime-only fields (reset on refresh):
 *   - sidebarOpen: mobile/tablet Sheet open state
 *   - sidebarView: current sidebar navigation view (overview / detail)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Sidebar view types ───────────────────────────────────────────────

export type SidebarViewState =
  | { type: 'overview' }
  | { type: 'workspaceDetail'; cwd: string }
  | { type: 'archivedDetail' };

// ── Store interface ──────────────────────────────────────────────────

interface LayoutState {
  // ── Persisted ──────────────────────────────────────────────────────
  /** Whether the desktop sidebar is manually collapsed. */
  desktopSidebarCollapsed: boolean;
  /** Workspace group keys that are collapsed in the sidebar thread list. */
  collapsedGroupKeys: string[];

  // ── Runtime only ───────────────────────────────────────────────────
  /** Whether the mobile/tablet sidebar Sheet is open. */
  sidebarOpen: boolean;
  /** Current sidebar navigation view. Resets to overview on refresh. */
  sidebarView: SidebarViewState;

  // ── Actions ────────────────────────────────────────────────────────
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarOpen: () => void;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
  toggleDesktopSidebarCollapsed: () => void;
  setSidebarView: (view: SidebarViewState) => void;
  /** Toggle a workspace group's collapsed state. */
  toggleCollapsedGroup: (key: string) => void;
  /** Check if a workspace group is collapsed. */
  isGroupCollapsed: (key: string) => boolean;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      // ── Persisted defaults ───────────────────────────────────────────
      desktopSidebarCollapsed: false,
      collapsedGroupKeys: [],

      // ── Runtime defaults ─────────────────────────────────────────────
      sidebarOpen: false,
      sidebarView: { type: 'overview' },

      // ── Actions ──────────────────────────────────────────────────────
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarOpen: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setDesktopSidebarCollapsed: (collapsed) =>
        set({ desktopSidebarCollapsed: collapsed }),
      toggleDesktopSidebarCollapsed: () =>
        set((s) => ({ desktopSidebarCollapsed: !s.desktopSidebarCollapsed })),

      setSidebarView: (view) => set({ sidebarView: view }),

      toggleCollapsedGroup: (key) =>
        set((s) => {
          const keys = s.collapsedGroupKeys;
          return {
            collapsedGroupKeys: keys.includes(key)
              ? keys.filter((k) => k !== key)
              : [...keys, key],
          };
        }),

      isGroupCollapsed: (key) => get().collapsedGroupKeys.includes(key),
    }),
    {
      name: 'codex.webui.layout',
      partialize: (state) => ({
        desktopSidebarCollapsed: state.desktopSidebarCollapsed,
        collapsedGroupKeys: state.collapsedGroupKeys,
      }),
    },
  ),
);
