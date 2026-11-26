import { openStore, updateMember, validEndpoint, validKeys } from "../lib/store.mjs";

export default async function subscriptions(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Origin");
  if (!process.env.SITE_ORIGIN || req.headers.origin !== process.env.SITE_ORIGIN) return res.status(403).end();
  res.setHeader("Access-Control-Allow-Origin", process.env.SITE_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["POST", "DELETE"].includes(req.method)) return res.status(405).end();
  const input = req.body;
  if (!validEndpoint(input?.endpoint) || (req.method === "POST" && !validKeys(input.keys))) return res.status(400).end();
  const member = { endpoint: input.endpoint };
  if (req.method === "POST") member.keys = { auth: input.keys.auth, p256dh: input.keys.p256dh };
  try {
    await updateMember(await openStore(), req.method === "POST" ? "PUT" : "DELETE", member);
    return res.status(204).end();
  } catch { return res.status(503).end(); }
}
