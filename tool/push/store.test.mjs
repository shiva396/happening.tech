import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import test from "node:test";
import { memberPath, openStore, updateMember, validEndpoint, validKeys } from "./lib/store.mjs";
import subscriptions from "./api/subscriptions.mjs";

const endpoint = "https://fcm.googleapis.com/fcm/send/example";
const ec = createECDH("prime256v1");
const member = { endpoint, keys: { p256dh: ec.generateKeys().toString("base64url"), auth: randomBytes(16).toString("base64url") } };

test("accept browser subscriptions and reject invalid endpoints and keys", () => {
  assert(validEndpoint(endpoint));
  assert(validKeys(member.keys));
  for (const url of ["http://fcm.googleapis.com/a", "https://fakepush.apple.com/a", "https://user@fcm.googleapis.com/a", "https://localhost/abc"])
    assert.equal(validEndpoint(url), false);
  assert.equal(validKeys({ ...member.keys, auth: "" }), false);
  assert.match(memberPath(endpoint), /^subscriptions\/[a-f0-9]{64}\.json$/);
});

test("the store rejects a public repository before reading or writing subscriptions", async t => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.PUSH_STORE_TOKEN = "test-only";
  process.env.PUSH_STORE_REPO = "sample/private";
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ private: false }));
  await assert.rejects(openStore(), /private/);
  assert.equal(fetch.mock.callCount(), 1);
});

test("repeat saves and removals are idempotent, including a concurrent first save", async () => {
  let file, writes = 0;
  const api = async (_path, options) => {
    if (!options) return file ? Response.json(file) : new Response(null, {status:404});
    writes++;
    if (writes === 1) return new Response(null, {status:409});
    const body = JSON.parse(options.body);
    if (options.method === "PUT") file = { content: body.content, sha: "sha" };
    else { assert.equal(body.sha, file.sha); file = undefined; }
    return new Response(null, {status:204});
  };
  for (const method of ["PUT","PUT","DELETE","DELETE"]) await updateMember(api, method, member);
  assert.equal(writes, 3);
});

test("foreign origins and malformed subscriptions are rejected before storage", async () => {
  const res = { code:0, setHeader(){}, status(code){this.code=code; return this;}, end(){} };
  const origin = process.env.SITE_ORIGIN;
  process.env.SITE_ORIGIN = "https://site.example";
  try {
    await subscriptions({method:"POST",headers:{origin:"https://other.example"},body:member},res);
    assert.equal(res.code,403);
    await subscriptions({method:"OPTIONS",headers:{origin:"https://site.example"}},res);
    assert.equal(res.code,204);
    await subscriptions({method:"POST",headers:{origin:"https://site.example"},body:{endpoint}},res);
    assert.equal(res.code,400);
  } finally {
    if (origin === undefined) delete process.env.SITE_ORIGIN;
    else process.env.SITE_ORIGIN=origin;
  }
});
