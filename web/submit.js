(() => {
  "use strict";

  const studio = document.getElementById("entry-studio");
  if (!studio) return;
  const form = studio.querySelector("form");
  const field = (name) => form.elements.namedItem(name);
  const value = (name) => field(name).value.trim();
  const node = (name) => document.getElementById("entry-" + name);
  const repository = studio.dataset.repository;
  const hasRepository = /^[\w.-]+\/[\w.-]+$/.test(repository);
  let fileUrl;
  for (const anchor of studio.querySelectorAll(".entry-jump")) {
    anchor.href = location.pathname + location.search + anchor.hash;
  }

  const zones = Intl.supportedValuesOf?.("timeZone") || [];
  field("timezone").value =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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
    const online = field("online").checked;
    node("place").hidden = online;
    for (const name of ["city", "country", "venue"])
      field(name).disabled = online;
    node("registration").hidden = !value("registration_url");
    field("end_date").min = value("start_date");
    field("start_time").required = Boolean(value("end_time"));
    field("end_time").required = Boolean(value("start_time"));
    for (const input of form.elements) {
      if (typeof input.setCustomValidity === "function")
        input.setCustomValidity("");
    }
    const topic = value("topic").toLowerCase();
    const tones = ["iris", "moss", "ember"];
    let sum = 0;
    for (let i = 0; i < value("community").length; i++)
      sum += value("community").charCodeAt(i);
    const tone =
      { flutter: "iris", python: "ember", "open source": "moss" }[topic] ||
      tones[sum % 3];
    node("poster").className = "poster " + tone;
    node("art").src =
      "/art/fold-" + ["iris", "ember", "moss"].indexOf(tone) + ".webp";
    node("format").textContent = value("format");
    node("year").textContent = value("start_date").slice(0, 4);
    node("preview-place").textContent = online
      ? "Online"
      : value("city") || "Your city";
    node("preview-title").textContent = value("title") || "Your event";
    node("preview-host").textContent = value("community") || "Your community";
    node("preview-description").textContent =
      value("description") || "Your description will appear here.";
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
      const parts = Object.fromEntries(
        formatter
          .formatToParts(timestamp)
          .map(({ type, value }) => [type, value]),
      );
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
    const offsets = new Set(
      [-86400000, 0, 86400000].map(
        (delta) => wallTime(target + delta) - (target + delta),
      ),
    );
    const matches = [...offsets]
      .map((offset) => target - offset)
      .filter((time) => wallTime(time) === target);
    return matches.length === 1 ? new Date(matches[0]).toISOString() : null;
  }

  function invalid(name, message) {
    const input = field(name);
    input.setCustomValidity(message);
    const collapsed = input.closest("details");
    if (collapsed) collapsed.open = true;
    input.reportValidity();
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

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener(
    "invalid",
    (event) => {
      const collapsed = event.target.closest("details");
      if (collapsed) collapsed.open = true;
    },
    true,
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    update();
    if (!form.reportValidity()) return;
    for (const input of form.querySelectorAll("[required]:enabled")) {
      if (!input.value.trim())
        return invalid(input.name, "Please enter a value.");
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
        return invalid(
          name,
          "Enter a full HTTP or HTTPS link without spaces or account credentials.",
        );
      }
    }

    const timezone = value("timezone");
    try {
      if (/^[+-]/.test(timezone)) throw new RangeError();
      Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      return invalid(
        "timezone",
        "Choose a time zone such as Asia/Kolkata or Europe/London.",
      );
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
        return invalid(
          "end_time",
          "Choose an end after the start. For an overnight event, set its last day.",
        );
    }

    const online = field("online").checked;
    const entry = {
      title: value("title"),
      city: online ? "Online" : value("city"),
      country: online ? "Worldwide" : value("country"),
      community: value("community"),
      topic: value("topic"),
      format: value("format"),
      start,
      end,
      timezone: Intl.DateTimeFormat("en", {
        timeZone: timezone,
      }).resolvedOptions().timeZone,
      venue: online ? "Online" : value("venue"),
      description: value("description"),
      url: value("url"),
    };
    if (value("registration_url")) {
      entry.registration_url = value("registration_url");
      entry.registration_label = value("registration_label");
    }
    if (value("price")) entry.price = value("price");

    // JSON's quoted strings use TOML-compatible escapes. DEL also requires
    // escaping in a TOML basic string.
    const contents =
      Object.entries(entry)
        .map(
          ([key, val]) =>
            key + " = " + JSON.stringify(val).replace(/\x7f/g, "\\u007f"),
        )
        .join("\n") + "\n";
    const filename = slugFor(entry.title, day) + ".toml";
    fileUrl = URL.createObjectURL(
      new Blob([contents], { type: "application/toml;charset=utf-8" }),
    );
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
      ? "Open the file on GitHub and propose it for review, or keep a local copy."
      : "Download the TOML file to keep your listing. When the project repository opens, add it to the events folder in a pull request.";
    node("output").hidden = false;
    node("download").focus();
  });

  node("submit").disabled = false;
  node("note").textContent =
    "You can review your file before sharing it with the directory.";
  update();
})();
