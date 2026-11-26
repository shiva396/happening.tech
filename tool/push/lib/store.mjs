import { createHash } from "node:crypto";

export function validEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    const hosts = ["fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"];
    return typeof endpoint === "string" && endpoint.length < 4096 && url.protocol === "https:" &&
      !url.username && !url.password && !url.port && !url.hash && url.pathname.length > 1 &&
      hosts.some(host => url.hostname === host || url.hostname.endsWith("." + host));
  } catch { return false; }
}

export function validKeys(keys) {
  return typeof keys?.auth === "string" && /^[\w-]{22}={0,2}$/.test(keys.auth) &&
    typeof keys.p256dh === "string" && /^[\w-]{87}=?$/.test(keys.p256dh) &&
    Buffer.from(keys.p256dh, "base64url")[0] === 4;
}

export function memberPath(endpoint) {
  return "subscriptions/" + createHash("sha256").update(endpoint).digest("hex") + ".json";
}

export async function openStore() {
  const { PUSH_STORE_REPO: repo, PUSH_STORE_TOKEN: token } = process.env;
  if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repo || "")) throw new Error("Missing private store configuration");
  const api = (path, options) => fetch("https://api.github.com/repos/" + repo + path, {
    ...options, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", Accept: "application/vnd.github+json" },
  });
  const meta = await api("");
  if (!meta.ok || (await meta.json()).private !== true) throw new Error("A private subscription repository is required");
  return api;
}

export async function updateMember(api, method, subscription) {
  const path = "/contents/" + memberPath(subscription.endpoint);
  const content = Buffer.from(JSON.stringify(subscription)).toString("base64");
  for (let attempt = 0; attempt < 3; attempt++) {
    const read = await api(path);
    if (!read.ok && read.status !== 404) throw new Error("Subscription lookup failed");
    const file = read.ok ? await read.json() : null;
    if (method === "DELETE" && !file) return;
    if (method === "PUT" && file?.content.replace(/\s/g, "") === content) return;
    const result = await api(path, { method, body: JSON.stringify({
      message: method === "PUT" ? "Save a subscription" : "Remove a subscription",
      sha: file?.sha, content: method === "PUT" ? content : undefined,
    }) });
    if (result.ok) return;
    if (result.status !== 409 && result.status !== 422) break;
  }
  throw new Error("Subscription update failed");
}
