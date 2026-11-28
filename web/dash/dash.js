import { DASH_MOTION, DashBehaviour, REST_POSE } from './behaviour.js';

function mountDash(host) {
  const poster = host.querySelector('img');
  if (!poster) return;

  const behaviour = new DashBehaviour();
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const lifecycle = new AbortController();
  const events = { signal: lifecycle.signal };
  let motionEnabled = true, visible = false, frame = 0, ambient = 0;
  let renderer, canvas, loading, failed = false;

  const active = () => motionEnabled && !media.matches && visible && !document.hidden;

  function schedule() {
    clearTimeout(ambient);
    if (!active()) return;
    const [min, max] = DASH_MOTION.idleDelay;
    ambient = setTimeout(() => {
      if (!active()) return;
      behaviour.ambient(performance.now());
      animate();
    }, min + Math.random()*(max-min));
  }

  function stop() {
    clearTimeout(ambient);
    cancelAnimationFrame(frame);
    frame = 0;
    behaviour.state = 'idle';
    behaviour.readyAt = 0;
    if (renderer) renderer.render();
    poster.style.transform = '';
    delete host.dataset.dashState;
  }

  function disposeModel() {
    loading?.abort();
    loading = null;
    renderer?.dispose();
    renderer = null;
    canvas?.remove();
    canvas = null;
    poster.style.opacity = '';
  }

  async function enhance() {
    if (failed || renderer || loading || !active() || navigator.connection?.saveData) return;
    const request = new AbortController();
    loading = request;
    const surface = document.createElement('canvas');
    surface.setAttribute('aria-hidden','true');
    surface.style.cssText = 'pointer-events:none;position:absolute;inset:0;width:100%;height:100%;opacity:0;';
    canvas = surface;
    host.append(surface);
    try {
      const { createRenderer } = await import('./renderer.js');
      if (request.signal.aborted) return;
      const model = await createRenderer(surface, request.signal);
      if (!model) throw Error('WebGL unavailable');
      if (request.signal.aborted) { model.dispose(); return; }
      renderer = model;
      renderer.render();
      surface.style.opacity = '1';
      poster.style.opacity = '0';
      surface.addEventListener('webglcontextlost', () => {
        if (canvas !== surface) return;
        failed = true;
        disposeModel();
      }, { once: true });
    } catch {
      if (!request.signal.aborted) {
        failed = true;
        surface.remove();
        poster.style.opacity = '';
      }
    } finally {
      if (loading === request) loading = null;
    }
  }

  function tick(now) {
    if (!active()) { stop(); return; }
    const pose = behaviour.sample(now);
    host.dataset.dashState = behaviour.state;
    if (renderer) renderer.render(pose);
    else poster.style.transform = pose === REST_POSE ? '' :
      `translate(${pose.travel*35}%,${-pose.lift*35}%) rotate(${-pose.lean}rad) scaleY(${1+pose.stretch})`;
    if (behaviour.state !== 'idle') frame = requestAnimationFrame(tick);
    else { frame = 0; schedule(); }
  }

  function animate() {
    if (!active() || frame) return;
    clearTimeout(ambient);
    void enhance();
    frame = requestAnimationFrame(tick);
  }

  function react(type, direction) {
    if (active() && behaviour.react(type, performance.now(), direction)) animate();
  }

  function visibilityChanged() {
    if (active()) schedule();
    else {
      stop();
      disposeModel();
    }
  }

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visibilityChanged();
  });
  intersection.observe(host);
  const resize = new ResizeObserver(() => { if (active() && !frame) renderer?.render(); });
  resize.observe(host);
  media.addEventListener('change', visibilityChanged, events);
  document.addEventListener('visibilitychange', visibilityChanged, events);
  host.addEventListener('click', () => react('tap'), events);
  document.addEventListener('atlas:reaction', ({detail = {}}) => {
    if (detail.type === 'motion') {
      motionEnabled = detail.enabled !== false;
      visibilityChanged();
    } else react(detail.type, Number.isFinite(detail.direction) ? detail.direction : 1);
  }, events);
  window.addEventListener('pagehide', event => {
    stop();
    disposeModel();
    if (!event.persisted) {
      intersection.disconnect();
      resize.disconnect();
      lifecycle.abort();
    }
  }, events);
  window.addEventListener('pageshow', visibilityChanged, events);
}

document.querySelectorAll('[data-dash]').forEach(mountDash);
