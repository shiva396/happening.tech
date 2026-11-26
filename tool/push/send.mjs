import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import webpush from "web-push";
import { openStore, validEndpoint, validKeys } from "./lib/store.mjs";

const events = JSON.parse(await readFile(process.argv[2], "utf8"));
if (events.length) {
  const api = await openStore();
  webpush.setVapidDetails(process.env.PAGE_URL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const listing = await api("/git/trees/HEAD?recursive=1");
  if (!listing.ok) throw new Error("Could not read subscriber list");
  const { tree, truncated } = await listing.json();
  if (truncated) throw new Error("Subscriber list exceeded the Git tree response limit");
  let failures = 0;
  for (const file of tree.filter(f => /^subscriptions\/[a-f0-9]{64}\.json$/.test(f.path))) {
    const blob = await api("/git/blobs/" + file.sha);
    if (!blob.ok) throw new Error("Subscription lookup failed");
    const member = JSON.parse(Buffer.from((await blob.json()).content, "base64").toString());
    if (!validEndpoint(member.endpoint) || !validKeys(member.keys)) throw new Error("Invalid saved subscription");
    for (const event of events) {
      try {
        const topic = createHash("sha256").update(event.slug).digest("base64url").slice(0, 32);
        await webpush.sendNotification(member, JSON.stringify(event), { TTL: 86400, topic, timeout: 15000 });
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          const removal = await api("/contents/" + file.path, { method: "DELETE", body: JSON.stringify({
            sha: file.sha, message: "Retire an expired subscription",
          }) });
          if (!removal.ok && ![404, 409].includes(removal.status)) failures++;
          break;
        }
        failures++;
      }
    }
  }
  if (failures) throw new Error(failures + " push delivery or cleanup requests failed");
}
