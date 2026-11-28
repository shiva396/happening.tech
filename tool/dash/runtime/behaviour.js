// Durations and movement limits are shared by the scheduler and the renderer.
// Each gesture returns to the model's authored resting pose.
export const DASH_MOTION = Object.freeze({
  idleDelay: [14000, 33000],
  cooldown: 1600,
  tapWindow: 1900,
  maxPixelRatio: 2,
  maxTextureSize: 384,
  duration: {
    observing: 1800, flying: 1800, landing: 760, resting: 1800,
    sleeping: 3800, celebrating: 2200, reacting: 980, transitioning: 1360,
  },
});

export const REST_POSE = Object.freeze({
  yaw: 0, lean: 0, lift: 0, stretch: 0, wing: 0, blink: 0, travel: 0,
});

const contextual = {
  event: 'flying', community: 'observing', country: 'reacting', program: 'transitioning',
  world: 'landing', orbit: 'flying', footer: 'resting', continents: 'celebrating', empty: 'observing',
};

export class DashBehaviour {
  state = 'idle';
  since = 0;
  readyAt = 0;
  direction = 1;
  taps = [];

  start(state, at, direction = 1) {
    this.state = state;
    this.since = at;
    this.direction = Math.max(-1, Math.min(1, direction));
    this.readyAt = at + DASH_MOTION.duration[state] + DASH_MOTION.cooldown;
  }

  react(type, at, direction) {
    if (type === 'tap') {
      this.taps = this.taps.filter(time => at - time < DASH_MOTION.tapWindow);
      this.taps.push(at);
      if (this.taps.length === 3) {
        this.taps = [];
        this.start('celebrating', at);
        return true;
      }
    }
    if (at < this.readyAt) return false;
    const state = type === 'tap' ? 'reacting' : contextual[type];
    if (!state) return false;
    this.start(state, at, direction);
    return true;
  }

  ambient(at, random = Math.random()) {
    if (at < this.readyAt) return false;
    const state = random < .56 ? 'observing' : random < .9 ? 'resting' : 'sleeping';
    this.start(state, at, random < .5 ? -1 : 1);
    return true;
  }

  sample(at) {
    if (this.state === 'idle') return REST_POSE;
    const elapsed = (at - this.since) / DASH_MOTION.duration[this.state];
    if (elapsed >= 1) {
      if (this.state === 'flying') this.start('landing', at, this.direction);
      else this.state = 'idle';
      return REST_POSE;
    }
    const phase = Math.PI * Math.max(0, elapsed);
    const ease = Math.sin(phase) ** 2;
    const pose = { ...REST_POSE };
    const side = this.direction;
    switch (this.state) {
      case 'observing':
        pose.yaw = side * .46 * ease;
        pose.lean = side * .08 * ease;
        break;
      case 'reacting':
        pose.lean = -.115 * ease;
        pose.wing = .23 * Math.sin(phase * 4) * ease;
        pose.stretch = .025 * ease;
        break;
      case 'flying':
      case 'transitioning':
        pose.lift = .13 * ease;
        pose.lean = side * .14 * ease;
        pose.yaw = side * .55 * ease;
        pose.wing = .37 * Math.sin(phase * 6) * ease;
        pose.travel = side * .18 * ease;
        break;
      case 'landing':
        pose.stretch = -.07 * ease;
        pose.wing = .15 * ease;
        break;
      case 'resting':
      case 'sleeping':
        pose.lean = .055 * ease;
        pose.stretch = -.042 * ease;
        pose.blink = this.state === 'sleeping' ? Math.min(1, ease * 2) : Math.sin(phase * 3) ** 16 * ease;
        break;
      case 'celebrating':
        pose.yaw = .4 * Math.sin(phase * 3) * ease;
        pose.lean = .17 * Math.sin(phase * 4) * ease;
        pose.wing = .4 * Math.sin(phase * 6) * ease;
        pose.lift = .16 * Math.abs(Math.sin(phase * 2)) * ease;
        break;
    }
    return pose;
  }
}
