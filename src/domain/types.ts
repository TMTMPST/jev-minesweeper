export type CellState = 'closed' | 'flag' | 'open';

export type StopReason =
  | 'NO_PROVEN_MOVE'
  | 'INVALID_BOARD'
  | 'UNSAFE_ROUTE'
  | 'DECISION_FAILURE'
  | 'ACTION_UNCONFIRMED'
  | 'GAME_FINISHED';

export type MoveAction =
  | { kind: 'OPEN'; x: number; y: number }
  | { kind: 'FLAG'; x: number; y: number }
  | { kind: 'STOP'; reason: StopReason };

export type VisibleCell = Readonly<{ x: number; y: number; state: CellState; number: number | null }>;
export type VisibleBoard = Readonly<{ width: number; height: number; cells: readonly VisibleCell[] }>;
export type GamePhase = 'ready' | 'playing' | 'won' | 'lost';
export type BoardSnapshot = Readonly<{ board: VisibleBoard; phase: GamePhase }>;
export type Candidate = Readonly<{ action: Exclude<MoveAction, { kind: 'STOP' }>; proof: string }>;
export type DecisionProbability = Readonly<{ option: string; probability: number }>;
export type DecisionResult = Readonly<{ action: MoveAction; confidence: number; source: 'mock' | 'jev'; probabilities?: readonly DecisionProbability[]; latencyMs?: number }>;

export function makeBoard(width: number, height: number, cells: readonly VisibleCell[]): VisibleBoard {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || cells.length !== width * height) {
    throw new Error('VisibleBoard must contain one cell per coordinate');
  }
  const expected = new Set<string>();
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) expected.add(`${x}:${y}`);
  for (const cell of cells) {
    const key = `${cell.x}:${cell.y}`;
    if (!expected.delete(key) || (cell.state === 'open') !== (cell.number !== null)) throw new Error('VisibleBoard has invalid cells');
  }
  return Object.freeze({ width, height, cells: Object.freeze(cells.map((cell) => Object.freeze({ ...cell }))) });
}
