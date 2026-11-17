// Measures how fast a running total grows, averaged over a recent window.
export class RateMeter {
  constructor(windowSeconds = 60) {
    this.windowSeconds = windowSeconds;
    this.samples = [];   // [time in seconds, total]
  }

  sample(time, total) {
    const last = this.samples[this.samples.length - 1];
    if (last && time - last[0] < 1) return;
    if (last && total < last[1]) this.samples = [];   // the total was reset
    this.samples.push([time, total]);
    while (this.samples.length > 2 && time - this.samples[1][0] >= this.windowSeconds) this.samples.shift();
  }

  // Growth per minute, or null until there are minSeconds of samples.
  perMinute(minSeconds = 10) {
    if (this.samples.length < 2) return null;
    const [t0, v0] = this.samples[0], [t1, v1] = this.samples[this.samples.length - 1];
    if (t1 - t0 < minSeconds) return null;
    return (v1 - v0) / (t1 - t0) * 60;
  }

  reset() {
    this.samples = [];
  }
}
