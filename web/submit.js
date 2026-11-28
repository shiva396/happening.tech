(() => {
  "use strict";

  const studio = document.getElementById("entry-studio");
  if (!studio) return;
  const form = studio.querySelector("form");
  const field = (name) => form.elements.namedItem(name);
  const value = (name) => field(name).value.trim();
  const node = (name) => document.getElementById("entry-" + name);
  const art = node("art");
  const repository = studio.dataset.repository;
  const hasRepository = /^[\w.-]+\/[\w.-]+$/.test(repository);
  let fileUrl;
  for (const anchor of studio.querySelectorAll(".entry-jump")) {
    anchor.href = location.pathname + location.search + anchor.hash;
  }

  const zones = Intl.supportedValuesOf?.("timeZone") || [];
  field("timezone").value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  for (const zone of new Set(["UTC", field("timezone").value, ...zones])) {
    const option = document.createElement("option");
    option.value = zone;
    node("timezones").append(option);
  }

  function update() {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      fileUrl = null;
    }
    node("output").hidden = true;
    const online = value("attendance") === "Online";
    node("place").hidden = online;
    for (const name of ["city", "country", "venue", "latitude", "longitude"]) field(name).disabled = online;
    node("registration").hidden = !value("registration_url");
    field("end_date").min = value("start_date");
    field("start_time").required = Boolean(value("end_time"));
    field("end_time").required = Boolean(value("start_time"));
    if (errorField?.disabled) clearError();
    const signature = Array.from(value("title")).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    art.src = "art/atlas-print-" + (signature % 3) + ".svg";
    node("format").textContent = value("category");
    node("year").textContent = value("start_date").slice(0, 4);
    node("preview-place").textContent = online ? "Online" : value("city") || "Your city";
    node("preview-title").textContent = value("title") || "Your event";
    node("preview-host").textContent = value("community_id")
      ? field("community_id").selectedOptions[0].textContent
      : "Your community";
    node("preview-description").textContent = value("description") || "Your description will appear here.";
    const start = field("start_date").valueAsDate;
    node("preview-date").textContent = start
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "long",
          timeZone: "UTC",
        }).format(start)
      : "Event date";
  }

  // Match the host's wall clock against the offsets on either side of the
  // event. This also detects the missing and repeated hours during DST changes.
  function instant(day, clock, zone) {
    const local = day + "T" + clock + ":00Z";
    const target = Date.parse(local);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    function wallTime(timestamp) {
      const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(({ type, value }) => [type, value]));
      return Date.parse(
        parts.year +
          "-" +
          parts.month +
          "-" +
          parts.day +
          "T" +
          parts.hour +
          ":" +
          parts.minute +
          ":" +
          parts.second +
          "Z",
      );
    }
    const offsets = new Set([-86400000, 0, 86400000].map((delta) => wallTime(target + delta) - (target + delta)));
    const matches = [...offsets].map((offset) => target - offset).filter((time) => wallTime(time) === target);
    return matches.length === 1 ? new Date(matches[0]).toISOString() : null;
  }

  const missing = {
    title: "Give your event a name.",
    community_id: "Choose the organizing community.",
    description: "Tell people what they’ll do at the event.",
    start_date: "Choose the day your event starts.",
    timezone: "Choose the time zone at the venue.",
    start_time: "Add a start time to go with the end time.",
    end_time: "Add an end time to go with the start time.",
    city: "Which city is hosting the event?",
    country: "Add the country where the event takes place.",
    venue: "Add the venue, or enter “To be announced”.",
    url: "Add the organizer’s official event link.",
  };
  let errorField;
  const hint = document.createElement("span");
  hint.className = "entry-error";
  hint.id = "entry-field-error";

  function clearError() {
    if (!errorField) return;
    errorField.removeAttribute("aria-invalid");
    errorField.removeAttribute("aria-describedby");
    errorField.setCustomValidity("");
    hint.remove();
    errorField = null;
  }

  function invalid(name, message) {
    clearError();
    const input = field(name);
    const collapsed = input.closest("details");
    if (collapsed) collapsed.open = true;
    const caption = input.labels[0].querySelector("span");
    caption.id = "entry-label-" + name;
    input.setAttribute("aria-labelledby", caption.id);
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", hint.id);
    input.setCustomValidity(message);
    if (document.activeElement === input) hint.setAttribute("role", "alert");
    else hint.removeAttribute("role");
    hint.textContent = message;
    input.after(hint);
    errorField = input;
    input.focus();
  }

  function slugFor(title, day) {
    const base = title
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80)
      .replace(/-$/g, "");
    if (base) return base + "-" + day;
    const signature = Array.from(new TextEncoder().encode(title)).reduce(
      (hash, byte) => Math.imul(hash ^ byte, 16777619) >>> 0,
      2166136261,
    );
    return "event-" + signature.toString(36) + "-" + day;
  }

  function onEdit(event) {
    if (
      errorField === event.target ||
      (errorField &&
        ["timezone", "start_date", "end_date", "start_time", "end_time"].includes(event.target.name) &&
        ["end_date", "start_time", "end_time"].includes(errorField.name))
    )
      clearError();
    update();
  }

  form.noValidate = true;
  form.addEventListener("input", onEdit);
  form.addEventListener("change", onEdit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();
    update();
    for (const input of form.querySelectorAll("input, select, textarea")) {
      if (!input.willValidate) continue;
      if (input.validity.badInput) return invalid(input.name, "Finish entering the date or time.");
      if (input.required && !input.value.trim()) return invalid(input.name, missing[input.name]);
      if (input.validity.typeMismatch)
        return invalid(input.name, "Enter a full link beginning with https:// or http://.");
      if (input.name === "end_date" && input.validity.rangeUnderflow)
        return invalid(input.name, "Choose a last day on or after the start date.");
      if (!input.validity.valid) return invalid(input.name, input.validationMessage);
    }
    for (const name of ["url", "registration_url"]) {
      const raw = value(name);
      if (!raw) continue;
      let link;
      try {
        link = new URL(raw);
      } catch {
        /* Show the same validation below. */
      }
      if (
        !link ||
        !/^https?:\/\//i.test(raw) ||
        !link.host ||
        link.username ||
        link.password ||
        /[\s\\]/.test(raw)
      ) {
        return invalid(name, "Enter a full HTTP or HTTPS link without spaces or account credentials.");
      }
    }

    const timezone = value("timezone");
    try {
      if (/^[+-]/.test(timezone)) throw new RangeError();
      Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      return invalid("timezone", "Choose a time zone such as Asia/Kolkata or Europe/London.");
    }
    const day = value("start_date");
    let start = day;
    let end = value("end_date") || day;
    if (value("start_time")) {
      start = instant(day, value("start_time"), timezone);
      end = instant(end, value("end_time"), timezone);
      if (!start || !end) {
        return invalid(
          !start ? "start_time" : "end_time",
          "The clock changes around this time. Enter both times in UTC and select UTC as the event time zone.",
        );
      }
      if (end <= start)
        return invalid("end_time", "Choose an end after the start. For an overnight event, set its last day.");
    }

    const online = value("attendance") === "Online";
    const entry = {
      title: value("title"),
      community_id: value("community_id"),
      category: value("category"),
      attendance: value("attendance"),
      updated_at: new Date().toISOString(),
      start,
      end,
      timezone: Intl.DateTimeFormat("en", {
        timeZone: timezone,
      }).resolvedOptions().timeZone,
      description: value("description"),
      url: value("url"),
    };
    if (!online) {
      entry.city = value("city");
      entry.country = value("country");
      if (value("venue")) entry.venue = value("venue");
      for (const name of ["latitude", "longitude"]) {
        if (!value(name)) continue;
        const other = name === "latitude" ? "longitude" : "latitude";
        if (!value(other)) return invalid(other, "Supply both coordinates to place this event on the globe.");
        entry[name] = Number(value(name));
      }
    }
    if (value("registration_url")) {
      entry.registration_url = value("registration_url");
      entry.registration_label = value("registration_label");
    }
    if (value("price")) entry.price = value("price");

    // JSON's quoted strings use TOML-compatible escapes. DEL also requires
    // escaping in a TOML basic string.
    const contents =
      Object.entries(entry)
        .map(([key, val]) => key + " = " + JSON.stringify(val).replace(/\x7f/g, "\\u007f"))
        .join("\n") + "\n";
    const filename = slugFor(entry.title, day) + ".toml";
    fileUrl = URL.createObjectURL(new Blob([contents], { type: "application/toml;charset=utf-8" }));
    node("download").href = fileUrl;
    node("download").download = filename;
    node("github").hidden = !hasRepository;
    if (hasRepository) {
      const url = new URL("https://github.com/" + repository + "/new/main");
      url.searchParams.set("filename", "events/" + filename);
      url.searchParams.set("value", contents);
      node("github").href = url.href;
    }
    node("outcome").textContent = hasRepository
      ? "Continue on GitHub, commit the file to a new branch, then open a pull request for a maintainer to review."
      : "Download the TOML file to keep your listing. When the project repository opens, add it to the events folder in a pull request.";
    node("output").hidden = false;
    node(hasRepository ? "github" : "download").focus();
  });

  node("submit").disabled = false;
  node("note").textContent = "You can review your file before sharing it with the directory.";
  update();
})();
