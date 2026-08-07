/* One requestAnimationFrame driver for both simulation and render. dt is capped
   so a backgrounded tab cannot teleport the horde through the barricade.

   update() and render() are guarded separately. Without this, a single throw
   anywhere in the game skipped the line that schedules the next frame, so the
   whole thing froze on a still image with nothing in the console loop — the
   worst possible failure to diagnose. Now a broken system is survivable: the
   frame is abandoned, the error is reported once, and the loop keeps running. */
const MAX_DT = 0.033;
/** Each distinct message is logged once; a per-frame throw would flood otherwise. */
const reported = new Set();

function guard(stage, fn, dt) {
  try {
    fn(dt);
    return true;
  } catch (error) {
    const signature = `${stage}: ${error?.message || error}`;
    if (!reported.has(signature)) {
      reported.add(signature);
      console.error(`[fourteen-nights] ${stage} failed and was skipped this frame.`, error);
    }
    return false;
  }
}

/** Distinct errors seen so far, for the smoke test and for debugging. */
export function loopErrors() {
  return [...reported];
}

export function startLoop(update, render) {
  let last = 0;
  const frame = (time) => {
    const dt = Math.min(MAX_DT, (time - last) / 1000 || 0);
    last = time;
    guard('update', update, dt);
    guard('render', render, dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
