import assert from "node:assert/strict";
import test from "node:test";
import {
  getGeminiConfigurationDiagnostics,
  validateGeminiConfiguration,
} from "../gemini.js";

const ORIGINAL_ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GEMINI_FALLBACK_MODELS: process.env.GEMINI_FALLBACK_MODELS,
  NODE_ENV: process.env.NODE_ENV,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test.afterEach(restoreEnv);

test("Gemini diagnostics validate approved production models without exposing the key", () => {
  process.env.GEMINI_API_KEY = "secret-value";
  process.env.GEMINI_MODEL = "gemini-3.6-flash";
  process.env.GEMINI_FALLBACK_MODELS = "gemini-3.5-flash,gemini-3.5-flash-lite";

  const diagnostics = getGeminiConfigurationDiagnostics();

  assert.equal(diagnostics.apiKeyConfigured, true);
  assert.deepEqual(diagnostics.invalidModels, []);
  assert.equal(diagnostics.valid, true);
  assert.deepEqual(diagnostics.models, [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
  ]);
  assert.equal(JSON.stringify(diagnostics).includes("secret-value"), false);
});

test("strict Gemini validation rejects unsupported configured models", () => {
  process.env.GEMINI_MODEL = "gemini-not-real";
  process.env.GEMINI_FALLBACK_MODELS = "gemini-3.5-flash-lite";

  const diagnostics = getGeminiConfigurationDiagnostics();
  assert.deepEqual(diagnostics.invalidModels, ["gemini-not-real"]);
  assert.equal(diagnostics.valid, false);
  assert.throws(
    () => validateGeminiConfiguration({ strict: true }),
    /Unsupported Gemini production model configuration: gemini-not-real/,
  );
});
