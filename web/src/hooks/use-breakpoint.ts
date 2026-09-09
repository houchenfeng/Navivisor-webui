/**
 * Reactive viewport breakpoint hook.
 * Uses useSyncExternalStore + matchMedia for tear-free reads.
 *
 * Breakpoints (aligned with Tailwind defaults):
 *   mobile  : < 640px
 *   tablet  : 640px – 1023px
 *   desktop : ≥ 1024px
 */
import { useSyncExternalStore } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const TABLET_QUERY = '(min-width: 640px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

/** Resolve current breakpoint from two media-query matches. */
function resolve(tablet: boolean, desktop: boolean): Breakpoint {
  if (desktop) return 'desktop';
  if (tablet) return 'tablet';
  return 'mobile';
}

// Module-level singletons — shared across all hook consumers.
let tabletMql: MediaQueryList | null = null;
let desktopMql: MediaQueryList | null = null;
let currentBreakpoint: Breakpoint = 'desktop'; // SSR-safe default

function ensureMql() {
  if (tabletMql) return;
  tabletMql = window.matchMedia(TABLET_QUERY);
  desktopMql = window.matchMedia(DESKTOP_QUERY);
  currentBreakpoint = resolve(tabletMql.matches, desktopMql.matches);
}

function subscribe(onStoreChange: () => void): () => void {
  ensureMql();
  const handler = () => {
    const next = resolve(tabletMql!.matches, desktopMql!.matches);
    if (next !== currentBreakpoint) {
      currentBreakpoint = next;
      onStoreChange();
    }
  };
  tabletMql!.addEventListener('change', handler);
  desktopMql!.addEventListener('change', handler);
  return () => {
    tabletMql!.removeEventListener('change', handler);
    desktopMql!.removeEventListener('change', handler);
  };
}

function getSnapshot(): Breakpoint {
  ensureMql();
  return currentBreakpoint;
}

function getServerSnapshot(): Breakpoint {
  return 'desktop';
}

/**
 * Returns the current viewport breakpoint: 'mobile' | 'tablet' | 'desktop'.
 * Re-renders only when the breakpoint category changes, not on every resize.
 */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Convenience: true when viewport < lg (1024px). */
export function useIsMobile(): boolean {
  return useBreakpoint() !== 'desktop';
}
