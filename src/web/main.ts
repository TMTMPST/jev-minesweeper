import { createGame } from '../domain/engine';
import { bindLocalBoard, type BoardSettings } from './board-view';
import './styles.css';

type ControllerEvent = Readonly<{ kind: 'decision' | 'stop'; action?: string; proof?: string; confidence?: number; verified?: boolean; source?: string; reason?: string; latencyMs?: number; candidates?: readonly Readonly<{ action: string; probability: number }>[] }>;

const params = new URLSearchParams(window.location.search);
const integer = (name: string, fallback: number) => {
  const value = Number(params.get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
};
const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('missing application root');
const settings: BoardSettings = { width: integer('width', 12), height: integer('height', 12), mines: integer('mines', 22), cellSize: integer('cellSize', 40) };
const configuredSeed = params.has('seed') ? integer('seed', 1) : undefined;
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!;
let firstSeed = configuredSeed;
const createRandomGame = (nextSettings: BoardSettings) => {
  const seed = firstSeed ?? randomSeed();
  firstSeed = undefined;
  const mines = Math.min(nextSettings.mines, nextSettings.width * nextSettings.height - 1);
  return createGame({ width: nextSettings.width, height: nextSettings.height, mines, seed });
};
bindLocalBoard(root, createRandomGame(settings), settings, createRandomGame);

const telemetryUrl = params.get('telemetry');
let shownEvents = 0;
if (telemetryUrl) window.setInterval(async () => {
  try {
    const response = await fetch(telemetryUrl);
    if (!response.ok) return;
    const events = await response.json() as ControllerEvent[];
    if (events.length === shownEvents) return;
    shownEvents = events.length;
    const event = events.at(-1);
    const state = document.querySelector<HTMLElement>('#decision-state');
    const confidence = document.querySelector<HTMLElement>('#decision-confidence');
    const latency = document.querySelector<HTMLElement>('#decision-latency');
    const options = document.querySelector<HTMLElement>('#decision-options');
    const proof = document.querySelector<HTMLElement>('#decision-proof');
    if (!event || !state || !confidence || !latency || !options || !proof) return;
    if (event.kind === 'stop') {
      state.textContent = 'Stopped';
      confidence.textContent = '—';
      latency.textContent = '—';
      options.replaceChildren();
      const message = document.createElement('p');
      message.className = 'empty-state';
      message.textContent = event.reason === 'GAME_FINISHED' ? 'Board is ready. Press Start Jev to begin.' : `Stopped: ${event.reason}. Start a new board when ready.`;
      options.append(message);
      proof.textContent = 'No unproven action was taken.';
      return;
    }
    state.textContent = 'Verified';
    confidence.textContent = `${(event.confidence ?? 0).toFixed(0)}%`;
    latency.textContent = event.latencyMs === undefined ? '—' : `${event.latencyMs} ms`;
    options.replaceChildren();
    for (const candidate of event.candidates ?? []) {
      const row = document.createElement('div');
      row.className = 'option-row';
      const label = document.createElement('span');
      label.textContent = candidate.action;
      const track = document.createElement('i');
      const fill = document.createElement('b');
      fill.style.width = `${Math.round(candidate.probability * 100)}%`;
      track.append(fill);
      const percentage = document.createElement('strong');
      percentage.textContent = `${Math.round(candidate.probability * 100)}%`;
      row.append(label, track, percentage);
      options.append(row);
    }
    proof.textContent = `${event.action} · ${event.source?.toUpperCase()} · proof verified: ${event.verified ? 'YES' : 'NO'}${event.proof ? ` — ${event.proof}` : ''}`;
  } catch {
    // Telemetry is optional; the local board remains usable if the controller is offline.
  }
}, 250);
