/** MCP-related notification payload types (server-push, not in generated SDK). */

export type McpServerStartupState =
  | 'starting'
  | 'ready'
  | 'failed'
  | 'cancelled';

export type McpAuthStatus =
  | 'unsupported'
  | 'notLoggedIn'
  | 'bearerToken'
  | 'oAuth';

export interface McpServerStatus {
  name: string;
  tools: Record<string, unknown>;
  resources: unknown[];
  resourceTemplates: unknown[];
  authStatus: McpAuthStatus;
}

export interface McpServerStatusUpdatedNotification {
  name: string;
  status: McpServerStartupState;
  error: string | null;
}
