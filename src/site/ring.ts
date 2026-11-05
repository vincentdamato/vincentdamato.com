// A quiet old-phone ring built in the browser, so there is no audio file to load.
let ctx: AudioContext | null = null;
let lastRing = 0;
let muted = false;

try {
  muted = localStorage.getItem("vd-office-sound") === "off";
} catch {
  /* Sound simply stays on in this browser. */
}

export const isMuted = () => muted;

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem("vd-office-sound", value ? "off" : "on");
  } catch {
    /* The choice just isn't remembered. */
  }
}

/** Browsers only allow sound after a click or tap, so this runs on the first one. */
export function unlockSound() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function ringPhone() {
  if (muted || !ctx || ctx.state !== "running") return false;
  const now = performance.now();
  if (now - lastRing < 6000) return false;
  lastRing = now;

  // Two soft "brrring, brrring" trills from a low, warm pair of bells.
  const start = ctx.currentTime + 0.02;
  const TRILL = 0.44;
  const master = ctx.createGain();
  master.gain.value = 0.022;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1900;
  filter.Q.value = 0.4;
  master.connect(filter).connect(ctx.destination);

  const BELLS = [
    [880, 1760],
    [1046, 2093],
  ];
  for (const burst of [0, 0.62]) {
    const swell = ctx.createGain();
    const b0 = start + burst;
    swell.gain.setValueAtTime(0.0001, b0);
    swell.gain.exponentialRampToValueAtTime(1, b0 + 0.05);
    swell.gain.setValueAtTime(1, b0 + TRILL - 0.14);
    swell.gain.exponentialRampToValueAtTime(0.0001, b0 + TRILL + 0.16);
    swell.connect(master);
    const strikes = Math.floor(TRILL / 0.055);
    for (let i = 0; i < strikes; i++) {
      const t = b0 + i * 0.055;
      const hit = ctx.createGain();
      hit.gain.setValueAtTime(0.0001, t);
      hit.gain.exponentialRampToValueAtTime(1, t + 0.008);
      hit.gain.exponentialRampToValueAtTime(0.05, t + 0.2);
      hit.connect(swell);
      BELLS[i % 2].forEach((freq, n) => {
        const tone = ctx!.createOscillator();
        tone.type = "sine";
        tone.frequency.value = freq;
        const level = ctx!.createGain();
        level.gain.value = n ? 0.16 : 1;
        tone.connect(level).connect(hit);
        tone.start(t);
        tone.stop(t + 0.22);
      });
    }
  }
  return true;
}
