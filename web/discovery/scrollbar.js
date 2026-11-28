// The reader owns scrollTop. Only its visual track and pointer hit area are curved.
export function mountScrollbar(reader) {
  const frame = reader.closest(".world-frame");
  const svg = "http://www.w3.org/2000/svg";
  const rail = document.createElementNS(svg, "svg");
  rail.classList.add("reader-scrollbar");
  for (const [name, value] of Object.entries({
    role: "scrollbar", tabindex: "0", "aria-label": "Scroll atlas content",
    "aria-controls": reader.id, "aria-orientation": "vertical", "aria-valuemin": "0", "aria-valuemax": "100",
  })) rail.setAttribute(name, value);
  function path(className) {
    const part = document.createElementNS(svg, "path");
    part.setAttribute("class", className);
    rail.append(part);
    return part;
  }
  const track = path("scroll-track"), thumb = path("scroll-thumb"), hit = path("scroll-hit");
  rail.setAttribute("hidden", "");
  frame.append(rail);
  let height = 0, bow = 0, portion = 1, range = 0, gutter, grab, pointer;
  const clamp = (v, max = 1) => Math.max(0, Math.min(max, v));
  const inset = 3, axis = 12;
  // A subcurve of the same quadratic keeps the entire thumb on the track.
  function segment(from, to) {
    const x = t => axis + 4 * bow * t * (1 - t);
    const y = t => inset + (height - 2 * inset) * t;
    const control = x(from) + 2 * bow * (1 - 2 * from) * (to - from);
    return `M ${x(from)} ${y(from)} Q ${control} ${y((from + to) / 2)} ${x(to)} ${y(to)}`;
  }
  function follow() {
    if (range <= 0) return;
    const progress = clamp(reader.scrollTop / range);
    const top = progress * (1 - portion);
    thumb.setAttribute("d", segment(top, top + portion));
    rail.setAttribute("aria-valuenow", String(Math.round(100 * progress)));
  }
  function layout() {
    height = reader.clientHeight;
    const contentHeight = reader.scrollHeight;
    range = height ? contentHeight - height : 0;
    rail.toggleAttribute("hidden", range <= 1);
    if (range <= 1) return;
    const rightEdge = reader.offsetLeft + reader.offsetWidth;
    const topEdge = reader.offsetTop, frameWidth = frame.clientWidth;
    if (gutter === undefined) {
      gutter = reader.offsetWidth - reader.clientWidth;
      reader.style.setProperty("--reader-gutter", gutter + "px");
      reader.classList.add("has-curved-scroll");
    }
    // Read untransformed layout positions during the reader's entrance animation.
    const right = rightEdge - (gutter || 6) / 2;
    bow = clamp(height * .075, Math.min(52, Math.max(0, frameWidth - right - 4)));
    rail.style.left = right - axis + "px";
    rail.style.top = topEdge + "px";
    rail.style.width = bow + 2 * axis + "px";
    rail.style.height = height + "px";
    portion = Math.max(Math.min(.8, 30 / height), height / contentHeight);
    const curve = segment(0, 1);
    track.setAttribute("d", curve);
    hit.setAttribute("d", curve);
    follow();
  }
  function position(e) {
    return clamp((e.clientY - rail.getBoundingClientRect().top - inset) / (height - 2 * inset));
  }
  function drag(e) {
    reader.scrollTop = clamp((position(e) - grab) / (1 - portion)) * range;
  }
  rail.addEventListener("pointerdown", e => {
    if (e.button !== 0 || pointer !== undefined) return;
    e.preventDefault();
    rail.focus({ preventScroll: true });
    const top = clamp(reader.scrollTop / range) * (1 - portion);
    const at = position(e);
    grab = at >= top && at <= top + portion ? at - top : portion / 2;
    pointer = e.pointerId;
    rail.setPointerCapture(pointer);
    drag(e);
  });
  rail.addEventListener("pointermove", e => { if (e.pointerId === pointer) drag(e); });
  rail.addEventListener("lostpointercapture", () => { pointer = undefined; });
  rail.addEventListener("keydown", e => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const page = reader.clientHeight * .9;
    const steps = { ArrowDown: 40, ArrowUp: -40, PageDown: page, PageUp: -page, " ": e.shiftKey ? -page : page };
    if (e.key === "Home") reader.scrollTop = 0;
    else if (e.key === "End") reader.scrollTop = reader.scrollHeight;
    else if (Object.hasOwn(steps, e.key)) reader.scrollTop += steps[e.key];
    else return;
    e.preventDefault();
  });
  rail.addEventListener("wheel", e => {
    if (e.ctrlKey) return;
    e.preventDefault();
    reader.scrollTop += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1);
  }, { passive: false });
  reader.addEventListener("scroll", follow, { passive: true });
  const resize = new ResizeObserver(layout);
  resize.observe(frame);
  resize.observe(reader);
  for (const section of reader.children) resize.observe(section);
}
