/**
 * TanStack Router configuration with code-based route tree.
 * Auth guard on the root layout redirects unauthenticated users to /login.
 */
import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { getApiToken } from '@/auth-token';
import { BASE_PATH } from '@/base-path';
import { IntegrationsPage } from '@/components/integrations/integrations-page';
import { ExperimentDemo } from '@/components/research-experiment/experiment-demo';
import { SubmissionPage } from '@/components/research-submission/submission-page';
import { TopicPage } from '@/components/research-topic/topic-page';
import { WritingPage } from '@/components/research-writing/writing-page';
import { SettingsPage } from '@/components/settings/settings-page';
import { AuthenticatedLayout } from './authenticated-layout';
import { ChatView } from './chat-view';
import { DiagnosticsRoute } from './diagnostics-route';
import { FilesRoute } from './files-route';
import { LoginRoute } from './login-route';
import { TerminalRoute } from './terminal-route';
import { ThreadView } from './thread-view';

export type LoginSearch = { redirect: string };
export type IntegrationsSearch = { tab: 'plugins' | 'apps' | 'mcps' };

const INTEGRATION_TABS = ['plugins', 'apps', 'mcps'] as const;

function sanitizeIntegrationsSearch(search: Record<string, unknown>): IntegrationsSearch {
  const tab = search.tab;
  return {
    tab: INTEGRATION_TABS.includes(tab as IntegrationsSearch['tab'])
      ? (tab as IntegrationsSearch['tab'])
      : 'plugins',
  };
}

/** Sanitizes redirect target to prevent open-redirect attacks. */
function sanitizeRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  if (value.startsWith('/api/')) return '/';
  return value;
}

/** Bare root — just renders child routes. */
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

/** Login route — redirects to / if already authenticated. */
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    if (getApiToken()) {
      throw redirect({ to: search.redirect });
    }
  },
  component: LoginRoute,
});

/** Authenticated layout — sidebar + header + outlet. */
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: ({ location }) => {
    if (!getApiToken()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

/** Index route — empty chat state (no thread selected). */
const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: ChatView,
});

/** Thread route — specific thread by id. */
export const threadRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/t/$threadId',
  component: ThreadView,
});

/** Global files view. */
const filesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/files',
  component: FilesRoute,
});

/** Global terminal view. */
const terminalRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/terminal',
  component: TerminalRoute,
});

/** Navivisor research workflow modules. */
const proposalRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/research/topic',
  component: TopicPage,
});

const experimentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/research/experiment',
  beforeLoad: () => { throw redirect({ to: '/research/experiment/intake' }); },
});

const experimentIntakeRoute = createRoute({ getParentRoute: () => authenticatedRoute, path: '/research/experiment/intake', component: ExperimentDemo });
const experimentPlanRoute = createRoute({ getParentRoute: () => authenticatedRoute, path: '/research/experiment/plan', component: ExperimentDemo });
const experimentModeRoute = createRoute({ getParentRoute: () => authenticatedRoute, path: '/research/experiment/mode', component: ExperimentDemo });
const experimentSimulateRoute = createRoute({ getParentRoute: () => authenticatedRoute, path: '/research/experiment/simulate', component: ExperimentDemo });
const experimentRunRoute = createRoute({ getParentRoute: () => authenticatedRoute, path: '/research/experiment/run', component: ExperimentDemo });
const experimentResultsRoute = createRoute({ getParentRoute: () => authenticatedRoute, path: '/research/experiment/results', component: ExperimentDemo });

const writingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/research/paper',
  component: WritingPage,
});

const submissionRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/research/submit',
  component: SubmissionPage,
});

/** Diagnostics panel. */
const diagnosticsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/diagnostics',
  component: DiagnosticsRoute,
});

/** Settings page. */
const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: SettingsPage,
});

/** Integrations page (plugins, apps, MCPs). */
const integrationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/integrations',
  validateSearch: sanitizeIntegrationsSearch,
  component: IntegrationsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([
    indexRoute,
    threadRoute,
    filesRoute,
    terminalRoute,
    proposalRoute,
    experimentRoute,
    writingRoute,
    submissionRoute,
    experimentIntakeRoute,
    experimentPlanRoute,
    experimentModeRoute,
    experimentSimulateRoute,
    experimentRunRoute,
    experimentResultsRoute,
    diagnosticsRoute,
    settingsRoute,
    integrationsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  basepath: BASE_PATH || '/',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
