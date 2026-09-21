import { createGame } from '../domain/engine';
import { bindLocalBoard, type BoardSettings } from './board-view';
import './styles.css';

type ControllerEvent = Readonly<{ id: number; kind: 'decision' | 'stop'; action?: string; proof?: string; confidence?: number; verified?: boolean; source?: string; reason?: string; latencyMs?: number; candidates?: readonly Readonly<{ action: string; probability: number }>[] }>;

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
let lastEventId = 0;
let safeActions = 0;
let verifiedProofs = 0;
let optionsSeen = 0;
let totalLatencyMs = 0;
let measuredActions = 0;
if (telemetryUrl) window.setInterval(async () => {
  try {
    const response = await fetch(telemetryUrl);
    if (!response.ok) return;
    const events = await response.json() as ControllerEvent[];
    const updates = events.filter((event) => event.id > lastEventId);
    if (updates.length === 0) return;
    lastEventId = updates.at(-1)!.id;
    for (const event of updates) if (event.kind === 'decision') {
      safeActions += 1;
      if (event.verified) verifiedProofs += 1;
      optionsSeen += event.candidates?.length ?? 0;
      if (event.latencyMs !== undefined) { totalLatencyMs += event.latencyMs; measuredActions += 1; }
    }
    const event = updates.at(-1)!;
    const state = document.querySelector<HTMLElement>('#decision-state');
    const moves = document.querySelector<HTMLElement>('#decision-moves');
    const verified = document.querySelector<HTMLElement>('#decision-verified');
    const candidatesSeen = document.querySelector<HTMLElement>('#decision-candidate-count');
    const averageLatency = document.querySelector<HTMLElement>('#decision-average-latency');
    const confidence = document.querySelector<HTMLElement>('#decision-confidence');
    const latency = document.querySelector<HTMLElement>('#decision-latency');
    const options = document.querySelector<HTMLElement>('#decision-options');
    const proof = document.querySelector<HTMLElement>('#decision-proof');
    if (!state || !moves || !verified || !candidatesSeen || !averageLatency || !confidence || !latency || !options || !proof) return;
    moves.textContent = String(safeActions);
    verified.textContent = String(verifiedProofs);
    candidatesSeen.textContent = String(optionsSeen);
    averageLatency.textContent = measuredActions === 0 ? '—' : `${Math.round(totalLatencyMs / measuredActions)} ms`;
    if (event.kind === 'stop') {
      state.textContent = event.reason === 'NO_PROVEN_MOVE' ? 'Needs a manual move' : 'Stopped safely';
      confidence.textContent = '—';
      latency.textContent = event.reason ?? 'No reason provided';
      options.replaceChildren();
      const message = document.createElement('p');
      message.className = 'empty-state';
      message.textContent = event.reason === 'NO_PROVEN_MOVE' ? 'The current position needs a guess. Jev will wait for your manual move instead.' : `Stopped: ${event.reason}.`;
      options.append(message);
      proof.textContent = 'No unproven action was taken.';
      return;
    }
    state.textContent = event.source === 'jev' ? 'Jev ranked a proven move' : 'Solver chose a proven move';
    confidence.textContent = `${(event.confidence ?? 0).toFixed(0)}%`;
    latency.textContent = event.latencyMs === undefined ? 'Mock decision' : `${event.latencyMs} ms`;
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
    proof.textContent = `${event.action} · ${event.verified ? 'solver proof verified' : 'verification unavailable'}${event.proof ? ` — ${event.proof}` : ''}`;
  } catch {
    // Telemetry is optional; the local board remains usable if the controller is offline.
  }
}, 250);
