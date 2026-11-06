import assert from "node:assert/strict";
import test from "node:test";
import { authDomainForHost } from "@/lib/firebase/config";

const configured = "zoreva-b9b8d.firebaseapp.com";

test("deployed hosts use the page as the Google auth domain", () => {
  assert.equal(authDomainForHost(configured, "zoreva.vercel.app"), "zoreva.vercel.app");
  assert.equal(authDomainForHost(configured, "zorevashift.xyz"), "zorevashift.xyz");
});

test("local and IP hosts keep the Firebase auth domain", () => {
  assert.equal(authDomainForHost(configured, null), configured);
  assert.equal(authDomainForHost(configured, "localhost:3003"), configured);
  assert.equal(authDomainForHost(configured, "127.0.0.1:3000"), configured);
  assert.equal(authDomainForHost(configured, "192.168.1.8:3003"), configured);
  assert.equal(authDomainForHost(configured, "[::1]:3000"), configured);
});
