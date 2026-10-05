import assert from "node:assert/strict";
import { test, afterEach } from "node:test";

import {
  classifyCloudinaryError,
  CloudinaryUploadError,
  getCloudinaryAccounts,
  getCloudinaryUserMessage,
} from "../cloudinaryUpload.js";

const CLOUDINARY_ENV_KEYS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_1_CLOUD_NAME",
  "CLOUDINARY_1_API_KEY",
  "CLOUDINARY_1_API_SECRET",
  "CLOUDINARY_2_CLOUD_NAME",
  "CLOUDINARY_2_API_KEY",
  "CLOUDINARY_2_API_SECRET",
  "CLOUDINARY_3_CLOUD_NAME",
  "CLOUDINARY_3_API_KEY",
  "CLOUDINARY_3_API_SECRET",
] as const;

const originalEnvironment = new Map<string, string | undefined>();

for (const key of CLOUDINARY_ENV_KEYS) {
  originalEnvironment.set(key, process.env[key]);
}

afterEach(() => {
  for (const key of CLOUDINARY_ENV_KEYS) {
    const value = originalEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("preserves legacy Cloudinary credentials as account 1 and appends accounts 2 and 3", () => {
  process.env.CLOUDINARY_CLOUD_NAME = "legacy-cloud";
  process.env.CLOUDINARY_API_KEY = "legacy-key";
  process.env.CLOUDINARY_API_SECRET = "legacy-secret";
  process.env.CLOUDINARY_2_CLOUD_NAME = "second-cloud";
  process.env.CLOUDINARY_2_API_KEY = "second-key";
  process.env.CLOUDINARY_2_API_SECRET = "second-secret";
  process.env.CLOUDINARY_3_CLOUD_NAME = "third-cloud";
  process.env.CLOUDINARY_3_API_KEY = "third-key";
  process.env.CLOUDINARY_3_API_SECRET = "third-secret";

  const accounts = getCloudinaryAccounts();

  assert.deepEqual(
    accounts.map(({ id, cloudName }) => ({ id, cloudName })),
    [
      { id: "cloudinary_1", cloudName: "legacy-cloud" },
      { id: "cloudinary_2", cloudName: "second-cloud" },
      { id: "cloudinary_3", cloudName: "third-cloud" },
    ],
  );
});

test("supports numbered account 1 when legacy credentials are absent", () => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  process.env.CLOUDINARY_1_CLOUD_NAME = "first-cloud";
  process.env.CLOUDINARY_1_API_KEY = "first-key";
  process.env.CLOUDINARY_1_API_SECRET = "first-secret";

  const accounts = getCloudinaryAccounts();

  assert.equal(accounts.length, 1);
  assert.equal(accounts[0]?.id, "cloudinary_1");
  assert.equal(accounts[0]?.cloudName, "first-cloud");
});

test("does not use a partially configured additional account", () => {
  process.env.CLOUDINARY_CLOUD_NAME = "legacy-cloud";
  process.env.CLOUDINARY_API_KEY = "legacy-key";
  process.env.CLOUDINARY_API_SECRET = "legacy-secret";
  process.env.CLOUDINARY_2_CLOUD_NAME = "second-cloud";
  process.env.CLOUDINARY_2_API_KEY = "second-key";
  delete process.env.CLOUDINARY_2_API_SECRET;

  const accounts = getCloudinaryAccounts();

  assert.deepEqual(
    accounts.map(({ id }) => id),
    ["cloudinary_1"],
  );
});

test("classifies provider failures conservatively", () => {
  assert.equal(classifyCloudinaryError({ http_code: 413, message: "too large" }), "upload_size_limit");
  assert.equal(classifyCloudinaryError({ http_code: 429, message: "rate limit exceeded" }), "rate_limited");
  assert.equal(classifyCloudinaryError({ http_code: 401, message: "unauthorized" }), "authentication");
  assert.equal(classifyCloudinaryError({ http_code: 403, message: "forbidden" }), "forbidden");
  assert.equal(classifyCloudinaryError({ http_code: 404, message: "not found" }), "not_found");
  assert.equal(classifyCloudinaryError({ http_code: 500, message: "temporary failure" }), "transient");
  assert.equal(classifyCloudinaryError({ message: "credits exceeded" }), "quota_exhausted");

  const testAccount = {
    id: "cloudinary_1",
    cloudName: "test-cloud",
    apiKey: "test-key",
    apiSecret: "test-secret",
  };
  assert.equal(
    getCloudinaryUserMessage(
      new CloudinaryUploadError("provider says unauthorized", {
        kind: "authentication",
        account: testAccount,
        httpCode: 401,
      }),
    ),
    "Image uploads are temporarily unavailable. Please try again later.",
  );
  assert.equal(
    getCloudinaryUserMessage(
      new CloudinaryUploadError("provider says credits exceeded", {
        kind: "quota_exhausted",
        account: testAccount,
      }),
    ),
    "Image storage is temporarily unavailable. Please try again later.",
  );
});
