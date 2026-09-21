import { afterEach, describe, expect, it } from 'vitest';
import { startTelemetryServer, type ControllerTelemetryEvent } from '../../src/cli/telemetry-server';

let close: (() => Promise<void>) | undefined;
afterEach(async () => { await close?.(); close = undefined; });

describe('telemetry server', () => {
  it('assigns increasing event IDs so clients can observe updates after the event buffer rolls', async () => {
    const telemetry = await startTelemetryServer();
    close = telemetry.close;
    for (let index = 0; index < 101; index += 1) telemetry.publish({ kind: 'decision', action: `OPEN ${index},0` });
    const events = await fetch(telemetry.url).then(async (response) => response.json() as Promise<ControllerTelemetryEvent[]>);
    expect(events).toHaveLength(100);
    expect(events[0]?.id).toBe(2);
    expect(events.at(-1)?.id).toBe(101);
  });
});
