import { createServer } from 'node:http';

export type ControllerTelemetry = Readonly<{ kind: 'decision' | 'stop'; action?: string; proof?: string; confidence?: number; verified?: boolean; source?: string; reason?: string }>;

export async function startTelemetryServer(): Promise<{ url: string; publish: (event: ControllerTelemetry) => void; close: () => Promise<void> }> {
  const events: ControllerTelemetry[] = [];
  const server = createServer((request, response) => {
    if (request.url !== '/telemetry') { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' });
    response.end(JSON.stringify(events));
  });
  const listening = Promise.withResolvers<void>();
  server.once('error', listening.reject);
  server.listen(0, '127.0.0.1', listening.resolve);
  await listening.promise;
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('telemetry server did not bind a TCP port');
  return {
    url: `http://127.0.0.1:${address.port}/telemetry`,
    publish: (event) => { events.push(event); if (events.length > 30) events.shift(); },
    close: () => {
      const closed = Promise.withResolvers<void>();
      server.close((error) => error ? closed.reject(error) : closed.resolve());
      return closed.promise;
    },
  };
}
