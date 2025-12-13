export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Simple xorshift32-derived state to keep determinism without external deps
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 0xa5a5a5a5; // avoid zero state
    }
  }

  next(): number {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (this.state & 0xffffffff) / 0xffffffff;
  }

  int(min: number, max: number): number {
    const value = this.next();
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(value * (high - low + 1)) + low;
  }

  real(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  fork(label: string): SeededRng {
    const mixed = this.mix(label);
    return new SeededRng(mixed);
  }

  private mix(label: string): number {
    let hash = this.state ^ 0x9e3779b9;
    for (let i = 0; i < label.length; i++) {
      hash ^= label.charCodeAt(i) + 0x9e3779b9 + (hash << 6) + (hash >>> 2);
    }
    return hash >>> 0;
  }
}
