import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_THEME_PREFERENCE,
  getOppositeTheme,
  isThemePreference,
  resolveThemePreference,
} from "./theme";

test("system is the default theme preference", () => {
  assert.equal(DEFAULT_THEME_PREFERENCE, "system");
});

test("only supported appearance preferences are accepted", () => {
  assert.equal(isThemePreference("system"), true);
  assert.equal(isThemePreference("light"), true);
  assert.equal(isThemePreference("dark"), true);
  assert.equal(isThemePreference("auto"), false);
  assert.equal(isThemePreference(null), false);
});

test("system preference follows the device appearance", () => {
  assert.equal(resolveThemePreference("system", "light"), "light");
  assert.equal(resolveThemePreference("system", "dark"), "dark");
});

test("explicit preferences override the device appearance", () => {
  assert.equal(resolveThemePreference("light", "dark"), "light");
  assert.equal(resolveThemePreference("dark", "light"), "dark");
});

test("quick toggle resolves to the opposite active appearance", () => {
  assert.equal(getOppositeTheme("light"), "dark");
  assert.equal(getOppositeTheme("dark"), "light");
});
