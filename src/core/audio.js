/* Blip generator. The AudioContext is created lazily on first enabled tone so
   browsers that require a gesture before audio never log a warning. */
let enabled = false;
let ctx;

export function isAudioEnabled() {
  return enabled;
}

export function toggleAudio() {
  enabled = !enabled;
  return enabled;
}

export function tone(freq, duration = 0.06, type = 'square', volume = 0.025) {
  if (!enabled) return;
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

/** Named cues so callers don't hardcode frequencies. */
export const SFX = {
  shot: (weapon) => tone(weapon.heavy ? 72 : weapon.moon ? 410 : 125, 0.07, weapon.moon ? 'sine' : 'square', 0.035),
  reload: () => tone(280, 0.05, 'square', 0.018),
  kill: (headshot) => tone(headshot ? 220 : 150, 0.06, 'sawtooth', 0.018)
};
