(() => {
  const section = document.getElementById("activity");
  if (!section) return;

  const grid = document.getElementById("activity-grid");
  const output = document.getElementById("activity-day");
  const dayMs = 86400000;
  const now = new Date();
  // Use UTC arithmetic on civil dates so DST never adds or skips a square.
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const anniversary = new Date(today);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() - 1);
  const firstDay = anniversary.getTime() + dayMs;
  const mondayOffset = (new Date(firstDay).getUTCDay() + 6) % 7;
  const gridStart = firstDay - mondayOffset * dayMs;
  const weekIndex = date => Math.floor((date - gridStart) / (7 * dayMs));
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const monthLabel = new Intl.DateTimeFormat(undefined, {timeZone: "UTC", month: "short"});
  const entriesByDay = new Map();
  let eventCount = 0;
  for (const entry of section.querySelectorAll("[data-first-day]")) {
    if (Date.parse(entry.dataset.startInstant) > now.getTime()) continue;
    const start = Math.max(firstDay, Date.parse(entry.dataset.firstDay));
    const end = Math.min(today, Date.parse(entry.dataset.lastDay));
    if (end < start) continue;
    eventCount++;
    for (let day = start; day <= end; day += dayMs) {
      if (!entriesByDay.has(day)) entriesByDay.set(day, []);
      entriesByDay.get(day).push(entry);
    }
  }

  function place(element, column, row) {
    element.style.gridColumn = column;
    element.style.gridRow = row;
    grid.append(element);
  }

  function label(text, column, row) {
    const el = document.createElement("span");
    el.className = "activity-label";
    el.textContent = text;
    place(el, column, row);
  }

  let selected;
  function inspect(day, button) {
    selected?.setAttribute("aria-pressed", "false");
    selected = button;
    button.setAttribute("aria-pressed", "true");
    const text = document.createElement("span");
    text.textContent = dateLabel.format(day);
    output.replaceChildren(text);
    for (const entry of entriesByDay.get(day)) {
      const link = document.createElement("a");
      link.href = entry.href;
      link.textContent = entry.textContent;
      output.append(link);
    }
  }

  grid.style.setProperty("--weeks", weekIndex(today) + 1);
  label("Mon", 1, 2);
  label("Wed", 1, 4);
  label("Fri", 1, 6);
  let nextMonthColumn = 0;
  let latest;
  for (let day = firstDay; day <= today; day += dayMs) {
    const date = new Date(day);
    const column = weekIndex(day) + 2;
    if (((day === firstDay && date.getUTCDate() < 16) || date.getUTCDate() === 1) && column >= nextMonthColumn && column <= weekIndex(today) + 1) {
      label(monthLabel.format(day), column, 1);
      nextMonthColumn = column + 3;
    }
    const count = entriesByDay.get(day)?.length || 0;
    const cell = document.createElement(count ? "button" : "span");
    cell.className = "activity-cell level-" + Math.min(count, 4);
    cell.title = dateLabel.format(day) + " · " + count + (count === 1 ? " event" : " events");
    if (count) {
      cell.type = "button";
      cell.setAttribute("aria-label", cell.title);
      cell.setAttribute("aria-pressed", "false");
      cell.addEventListener("click", () => inspect(day, cell));
      latest = {day, cell};
    }
    place(cell, column, (date.getUTCDay() + 6) % 7 + 2);
  }
  const days = entriesByDay.size;
  document.getElementById("activity-summary").textContent =
    eventCount + (eventCount === 1 ? " event" : " events") + " across " +
    days + (days === 1 ? " day" : " days") + " in the past 12 months";
  if (latest) {
    inspect(latest.day, latest.cell);
    const scroll = document.getElementById("activity-scroll");
    scroll.scrollLeft = latest.cell.offsetLeft - grid.offsetLeft - scroll.clientWidth / 2;
  }
})();
