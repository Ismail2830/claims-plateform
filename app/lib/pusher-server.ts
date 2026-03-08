import PusherServer from 'pusher';

let pusherInstance: PusherServer | null = null;

export function getPusherServer(): PusherServer {
  if (!pusherInstance) {
    pusherInstance = new PusherServer({
      appId:   process.env.PUSHER_APP_ID   ?? '',
      key:     process.env.PUSHER_KEY      ?? '',
      secret:  process.env.PUSHER_SECRET   ?? '',
      cluster: process.env.PUSHER_CLUSTER  ?? 'eu',
      useTLS:  true,
    });
  }
  return pusherInstance;
}
