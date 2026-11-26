(() => {
  const section = document.getElementById("activity");
  if (!section) return;

  const grid = document.getElementById("activity-grid");
  const dayMs = 86400000;
  const now = new Date();
  // Use UTC arithmetic on civil dates so DST never adds or skips a square.
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const anniversary = new Date(today);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() - 1);
  const firstDay = anniversary.getTime() + dayMs;
  const scroll = document.getElementById("activity-scroll");
  const preview = document.getElementById("activity-preview");
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const monthLabel = new Intl.DateTimeFormat(undefined, {timeZone: "UTC", month: "short"});
  const entriesByDay = new Map();
  for (const entry of section.querySelectorAll("[data-first-day]")) {
    if (Date.parse(entry.dataset.startInstant) > now.getTime()) continue;
    const start = Math.max(firstDay, Date.parse(entry.dataset.firstDay));
    const end = Math.min(today, Date.parse(entry.dataset.lastDay));
    if (end < start) continue;
    for (let day = start; day <= end; day += dayMs) {
      if (!entriesByDay.has(day)) entriesByDay.set(day, []);
      entriesByDay.get(day).push(entry);
    }
  }

  let anchor;
  let hideTimer;

  function dismiss() {
    clearTimeout(hideTimer);
    if (!anchor) return;
    const previous = anchor;
    anchor = null;
    previous.setAttribute("aria-expanded", "false");
    preview.hidden = true;
  }

  function positionPreview() {
    if (!anchor) return;
    const tile = anchor.getBoundingClientRect();
    const frame = scroll.getBoundingClientRect();
    if (tile.right < frame.left || tile.left > frame.right || tile.bottom < 0 || tile.top > innerHeight) {
      dismiss();
      return;
    }
    const style = getComputedStyle(preview);
    const edge = Number(style.getPropertyValue("--activity-preview-edge-px"));
    const gap = Number(style.getPropertyValue("--activity-preview-gap-px"));
    const width = preview.offsetWidth;
    const height = preview.offsetHeight;
    const left = Math.min(innerWidth - width - edge, Math.max(edge, tile.left + tile.width / 2 - width / 2));
    const top = tile.top >= height + edge ? tile.top - height - gap : Math.min(innerHeight - height - edge, tile.bottom + gap);
    preview.style.left = left + "px";
    preview.style.top = Math.max(edge, top) + "px";
  }

  function showPreview(day, button) {
    clearTimeout(hideTimer);
    if (anchor === button) return;
    dismiss();
    anchor = button;
    const heading = document.createElement("strong");
    heading.className = "day-preview-date";
    heading.textContent = dateLabel.format(day);
    preview.replaceChildren(heading);
    for (const entry of entriesByDay.get(day)) {
      const link = document.createElement("a");
      link.className = "day-preview-event";
      link.href = entry.href;
      const title = document.createElement("strong");
      title.textContent = entry.textContent;
      const byline = document.createElement("span");
      byline.textContent = entry.dataset.host + " · " + entry.dataset.place;
      link.append(title, byline);
      preview.append(link);
    }
    button.setAttribute("aria-expanded", "true");
    preview.hidden = false;
    positionPreview();
  }

  function scheduleDismiss(event) {
    if (event.pointerType === "touch") return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(dismiss, 150);
  }
  section.addEventListener("pointerleave", scheduleDismiss);
  preview.addEventListener("pointerenter", () => clearTimeout(hideTimer));
  preview.addEventListener("pointerleave", scheduleDismiss);
  preview.addEventListener("focusout", event => {
    if (!preview.contains(event.relatedTarget) && event.relatedTarget !== anchor) dismiss();
  });
  document.addEventListener("pointerdown", event => {
    if (anchor && !preview.contains(event.target) && !anchor.contains(event.target)) dismiss();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && anchor) {
      const previous = anchor;
      if (preview.contains(document.activeElement)) previous.focus({preventScroll: true});
      dismiss();
    }
  });
  document.addEventListener("scroll", positionPreview, true);
  window.addEventListener("resize", positionPreview);

  const weekdays = document.createElement("div");
  weekdays.className = "activity-weekdays";
  for (const [index, name] of ["Mon", "", "Wed", "", "Fri", "", ""].entries()) {
    if (!name) continue;
    const label = document.createElement("span");
    label.style.gridRow = index + 2;
    label.textContent = name;
    weekdays.append(label);
  }
  grid.append(weekdays);
  let monthGrid, monthStart, offset, latest;
  for (let day = firstDay; day <= today; day += dayMs) {
    const date = new Date(day);
    if (day === firstDay || date.getUTCDate() === 1) {
      monthStart = day;
      offset = (date.getUTCDay() + 6) % 7;
      const month = document.createElement("div");
      month.className = "activity-month";
      const heading = document.createElement("span");
      heading.className = "activity-label";
      heading.textContent = monthLabel.format(day);
      heading.title = heading.textContent + " " + date.getUTCFullYear();
      monthGrid = document.createElement("div");
      monthGrid.className = "activity-weeks";
      month.append(heading, monthGrid);
      grid.append(month);
    }
    const index = (day - monthStart) / dayMs + offset;
    const count = entriesByDay.get(day)?.length || 0;
    const cell = document.createElement(count ? "button" : "span");
    cell.className = "activity-cell level-" + Math.min(count, 4);
    cell.style.gridColumn = Math.floor(index / 7) + 1;
    cell.style.gridRow = index % 7 + 1;
    if (count) {
      cell.type = "button";
      cell.setAttribute("aria-label", dateLabel.format(day) + " · " + count + (count === 1 ? " event" : " events"));
      cell.setAttribute("aria-haspopup", "dialog");
      cell.setAttribute("aria-controls", preview.id);
      cell.setAttribute("aria-expanded", "false");
      cell.style.setProperty("--glow-phase", -(day / dayMs % 11));
      cell.addEventListener("pointerenter", event => {
        if (event.pointerType !== "touch") showPreview(day, cell);
      });
      cell.addEventListener("pointerleave", scheduleDismiss);
      cell.addEventListener("focus", () => showPreview(day, cell));
      cell.addEventListener("blur", event => {
        if (!preview.contains(event.relatedTarget) && cell === anchor) dismiss();
      });
      cell.addEventListener("click", event => {
        showPreview(day, cell);
        if (event.detail === 0) preview.querySelector("a").focus({preventScroll: true});
      });
      latest = cell;
    }
    monthGrid.append(cell);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => section.classList.toggle("activity-offscreen", !entry.isIntersecting));
    observer.observe(section);
  }
  if (latest) {
    scroll.scrollLeft += latest.getBoundingClientRect().left - scroll.getBoundingClientRect().left - scroll.clientWidth / 2;
  }
})();
