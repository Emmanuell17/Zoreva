import assert from "node:assert/strict";
import test from "node:test";
import { prefersRedirectGoogleSignIn } from "@/lib/firebase/auth";

const chrome =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const safari =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const edge =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";

test("desktop Safari uses a full-page Google sign-in", () => {
  assert.equal(prefersRedirectGoogleSignIn(safari), true);
});

test("desktop Chrome and Edge keep the Google popup", () => {
  assert.equal(prefersRedirectGoogleSignIn(chrome), false);
  assert.equal(prefersRedirectGoogleSignIn(edge), false);
});
