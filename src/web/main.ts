import { createGame, openCell } from '../domain/engine';
import { bindLocalBoard, type BoardSettings } from './board-view';
import './styles.css';

type ControllerEvent = Readonly<{ kind: 'decision' | 'stop'; action?: string; proof?: string; confidence?: number; verified?: boolean; source?: string; reason?: string }>;

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
  return openCell(createGame({ width: nextSettings.width, height: nextSettings.height, mines, seed }), 0, 0);
};
bindLocalBoard(root, createRandomGame(settings), settings, createRandomGame);

const telemetryUrl = params.get('telemetry');
let shownEvents = 0;
if (telemetryUrl) window.setInterval(async () => {
  try {
    const response = await fetch(telemetryUrl);
    if (!response.ok) return;
    const events = await response.json() as ControllerEvent[];
    const log = document.querySelector<HTMLElement>('#controller-log');
    const state = document.querySelector<HTMLElement>('#decision-state');
    if (!log || !state || events.length === shownEvents) return;
    shownEvents = events.length;
    const event = events.at(-1);
    if (!event) return;
    if (event.kind === 'decision') {
      state.textContent = 'VERIFIED';
      log.innerHTML = `<p><b>${event.action}</b><span>${event.source?.toUpperCase()} · ${(event.confidence ?? 0).toFixed(0)}% confidence · proof verified: ${event.verified ? 'YES' : 'NO'}</span><small>${event.proof}</small></p>`;
    } else {
      state.textContent = 'STOPPED';
      log.innerHTML = `<p><b>${event.reason}</b><span>Controller stopped without an unsafe action.</span></p>`;
    }
  } catch {
    // Telemetry is optional; the game remains usable when the controller is offline.
  }
}, 250);
