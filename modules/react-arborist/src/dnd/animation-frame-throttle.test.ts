import { createAnimationFrameThrottle } from "./animation-frame-throttle.js";

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

test("only the last callback scheduled before a frame runs", async () => {
  const throttle = createAnimationFrameThrottle();
  const first = jest.fn();
  const second = jest.fn();
  const last = jest.fn();

  throttle.schedule(first);
  throttle.schedule(second);
  throttle.schedule(last);
  expect(last).not.toHaveBeenCalled();

  await nextFrame();
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  expect(last).toHaveBeenCalledTimes(1);
});

test("a callback scheduled after a frame runs on the next one", async () => {
  const throttle = createAnimationFrameThrottle();
  const first = jest.fn();
  const second = jest.fn();

  throttle.schedule(first);
  await nextFrame();
  throttle.schedule(second);
  await nextFrame();

  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
});

test("cancel() keeps the waiting callback from ever running", async () => {
  const throttle = createAnimationFrameThrottle();
  const callback = jest.fn();

  throttle.schedule(callback);
  throttle.cancel();

  await nextFrame();
  await nextFrame();
  expect(callback).not.toHaveBeenCalled();
});

test("cancel() leaves the throttle usable", async () => {
  const throttle = createAnimationFrameThrottle();
  const cancelled = jest.fn();
  const callback = jest.fn();

  throttle.schedule(cancelled);
  throttle.cancel();
  throttle.schedule(callback);

  await nextFrame();
  expect(cancelled).not.toHaveBeenCalled();
  expect(callback).toHaveBeenCalledTimes(1);
});
