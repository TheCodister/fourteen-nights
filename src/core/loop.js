/* One requestAnimationFrame driver for both simulation and render. dt is capped
   so a backgrounded tab cannot teleport the horde through the barricade. */
const MAX_DT = 0.033;

export function startLoop(update, render) {
  let last = 0;
  const frame = (time) => {
    const dt = Math.min(MAX_DT, (time - last) / 1000 || 0);
    last = time;
    update(dt);
    render(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
