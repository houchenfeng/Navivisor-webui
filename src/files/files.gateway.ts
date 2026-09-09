/**
 * WebSocket gateway for file system change notifications.
 * Currently a no-op stub — chokidar watchers were removed due to
 * expensive close() blocking the event loop on large directories.
 * File tree data is fetched on-demand via REST instead.
 */
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class FilesGateway {
  @WebSocketServer()
  server!: Server;

  /** No-op: watcher removed. Kept so existing clients don't error on emit. */
  @SubscribeMessage('fs.subscribe')
  handleSubscribe(): { ok: boolean } {
    return { ok: true };
  }

  /** No-op: watcher removed. */
  @SubscribeMessage('fs.unsubscribe')
  handleUnsubscribe(): { ok: boolean } {
    return { ok: true };
  }
}
