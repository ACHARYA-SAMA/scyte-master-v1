"use client";

/**
 * Shader warm-up. The canvas holds its frames while a scene compiles, so its first
 * frame does not compile every program on the main thread. compileAsync uses
 * KHR_parallel_shader_compile where the browser has it (Chrome on Windows does).
 *
 * Measured on an integrated GPU under Direct3D: the home scene's first frame went
 * from about a second to under 200 ms. The environment map's filter shader and the
 * post passes still compile on first use; warming them ahead (via PMREMGenerator's
 * private fields and the composer's materials) made no measurable difference there,
 * so it was taken out. See docs/performance.md.
 */
let pending = 0;

export const warming = () => pending > 0;

/** Hold frames until `work` settles, or for 4 s at most if a driver stalls. */
export const hold = (work: Promise<unknown>) => {
  pending++;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    pending--;
  };
  const t = window.setTimeout(finish, 4000);
  void work.catch(() => undefined).finally(() => {
    window.clearTimeout(t);
    finish();
  });
  return finish;
};
