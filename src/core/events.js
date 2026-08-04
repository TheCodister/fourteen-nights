/* Minimal pub/sub. Simulation code emits; UI code listens. This is what keeps
   src/game and src/systems free of any import from src/ui. */
const listeners = new Map();

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => listeners.get(event).delete(handler);
}

export function emit(event, payload) {
  for (const handler of listeners.get(event) ?? []) handler(payload);
}

/** Known events, documented in one place. */
export const EVENTS = {
  NIGHT_START: 'night:start',
  NIGHT_SURVIVED: 'night:survived',
  RUN_OVER: 'run:over',
  RUN_WON: 'run:won'
};
