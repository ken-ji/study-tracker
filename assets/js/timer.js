import { getTimerState, saveTimerState } from './storage.js';

export function start(subjectId) {
  const elapsed = getElapsedSeconds();
  saveTimerState({ subjectId, startedAt: new Date().toISOString(), elapsed });
}

export function pause() {
  const elapsed = getElapsedSeconds();
  const state = getTimerState();
  saveTimerState({ ...state, startedAt: null, elapsed });
}

export function reset() {
  saveTimerState({ subjectId: null, startedAt: null, elapsed: 0 });
}

export function getElapsedSeconds() {
  const state = getTimerState();
  if (state.startedAt === null) return state.elapsed;
  return state.elapsed + Math.floor((Date.now() - Date.parse(state.startedAt)) / 1000);
}

export function getState() {
  return getTimerState();
}
