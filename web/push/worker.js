const site = new URL("../", self.location.href);

self.addEventListener("push", event => {
  if (!event.data) return;
  const { slug, title, body } = event.data.json();
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return;
  event.waitUntil(self.registration.showNotification(title, {
    body, tag: "event-" + slug, icon: new URL("favicon.ico", site).href,
    data: { url: new URL("events/" + slug + "/", site).href },
  }));
});

self.addEventListener("notificationclick", event => {
  const url = event.notification.data?.url;
  event.notification.close();
  if (!url || !url.startsWith(site.href + "events/")) return;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => client.url === url);
    if (existing) await existing.focus();
    else await clients.openWindow(url);
  })());
});
