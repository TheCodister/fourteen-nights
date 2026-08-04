/* Colour helpers for the night-to-dawn transition. */

/** Linear blend between two #rrggbb strings. `amount` 0 = from, 1 = to. */
export function mixColor(from, to, amount) {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (shift) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}
