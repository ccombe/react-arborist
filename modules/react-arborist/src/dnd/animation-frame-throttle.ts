export type AnimationFrameThrottle = {
  /** Run the callback on the next animation frame. When schedule is called
   * multiple times before that frame, only the last callback runs. */
  schedule: (callback: () => void) => void;
  /** Forget the callback that is waiting for the next frame. */
  cancel: () => void;
};

/** Runs callbacks at most once per animation frame. */
export function createAnimationFrameThrottle(): AnimationFrameThrottle {
  let frame: number | null = null;
  let pending: (() => void) | null = null;

  return {
    schedule(callback) {
      pending = callback;
      if (frame !== null) return;

      frame = requestAnimationFrame(() => {
        frame = null;
        const run = pending;
        pending = null;
        run?.();
      });
    },

    cancel() {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      pending = null;
    },
  };
}
