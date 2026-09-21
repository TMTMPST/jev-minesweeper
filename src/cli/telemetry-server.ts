import { createServer } from 'node:http';

export type ControllerTelemetry = Readonly<{ kind: 'decision' | 'stop'; action?: string; proof?: string; confidence?: number; verified?: boolean; guess?: boolean; mineRisk?: number; source?: string; reason?: string; latencyMs?: number; candidates?: readonly Readonly<{ action: string; probability: number }>[] }>;
export type ControllerTelemetryEvent = ControllerTelemetry & Readonly<{ id: number }>;

export async function startTelemetryServer(): Promise<{ url: string; publish: (event: ControllerTelemetry) => void; close: () => Promise<void> }> {
  const events: ControllerTelemetryEvent[] = [];
  let nextEventId = 1;
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
    publish: (event) => {
      events.push({ ...event, id: nextEventId });
      nextEventId += 1;
      if (events.length > 100) events.shift();
    },
    close: () => {
      const closed = Promise.withResolvers<void>();
      server.close((error) => error ? closed.reject(error) : closed.resolve());
      return closed.promise;
    },
  };
}
