import { createGame } from '../domain/engine';
import { bindLocalBoard } from './board-view';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const integer = (name: string, fallback: number) => {
  const value = Number(params.get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
};
const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('missing application root');
bindLocalBoard(root, createGame({ width: integer('width', 12), height: integer('height', 12), mines: integer('mines', 22), seed: integer('seed', 7) }));
