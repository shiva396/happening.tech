export async function initNotifications(root) {
  const toggle = root.querySelector("#push-toggle");
  if (!toggle || toggle.dataset.ready) return;
  toggle.dataset.ready = "true";
  const status = root.querySelector("#push-status");
  if (
    !window.isSecureContext ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    status.textContent =
      "This browser cannot receive push alerts here. On iPhone or iPad, open the site from your Home Screen.";
    return;
  }

  const registrationUrl = new URL("push/worker.js", document.baseURI);
  let subscription;
  let registration;
  async function save(method, data) {
    const result = await fetch(toggle.dataset.endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!result.ok) throw new Error("Subscription was not saved");
  }
  function update() {
    const blocked = Notification.permission === "denied";
    toggle.hidden = blocked && !subscription;
    toggle.textContent = subscription ? "Turn off notifications" : "Enable notifications";
    status.textContent = blocked
      ? "Notifications are blocked in this site’s browser settings."
      : subscription
        ? "Notifications are on for this device."
        : "Notifications are off for this device.";
  }

  try {
    registration = await navigator.serviceWorker.register(registrationUrl, {
      scope: new URL("./", registrationUrl).pathname,
    });
    // The worker lives outside the page scope. navigator.serviceWorker.ready would wait for a different registration.
    const worker = registration.installing || registration.waiting;
    if (!registration.active && worker && worker.state !== "activated") {
      await new Promise((resolve, reject) =>
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") resolve();
          if (worker.state === "redundant") reject(new Error("Worker installation failed"));
        }),
      );
    }
    subscription = await registration.pushManager.getSubscription();
    // A renewed endpoint or an interrupted save can be repaired on the next visit.
    if (subscription) await save("POST", subscription.toJSON());
    update();
  } catch {
    status.textContent = "Couldn’t connect to notifications. Reload the page to try again.";
    return;
  }

  toggle.addEventListener("click", async () => {
    toggle.disabled = true;
    try {
      if (subscription) {
        await save("DELETE", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
        subscription = null;
      } else {
        if ((await Notification.requestPermission()) !== "granted") {
          update();
          return;
        }
        const encoded = toggle.dataset.publicKey.replace(/-/g, "+").replace(/_/g, "/");
        const key = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
        const fresh = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        try {
          await save("POST", fresh.toJSON());
        } catch (error) {
          await fresh.unsubscribe();
          throw error;
        }
        subscription = fresh;
      }
      update();
    } catch {
      status.textContent = "Couldn’t save your preference. Please try again.";
    } finally {
      toggle.disabled = false;
    }
  });
}

void initNotifications(document);
