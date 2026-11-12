import assert from "node:assert/strict";
import test from "node:test";
import { buildMessageReportsFilter } from "../messageReportsQuery.js";

test("open message reports filter by status without a nullable SQL parameter", () => {
  const filter = buildMessageReportsFilter("open", null);

  assert.equal(filter.where, "WHERE mr.status = ?");
  assert.deepEqual(filter.params, ["open"]);
  assert.doesNotMatch(filter.where, /IS NULL/i);
});

test("all message reports omit the status condition when no conversation is selected", () => {
  const filter = buildMessageReportsFilter("all", null);

  assert.equal(filter.where, "");
  assert.deepEqual(filter.params, []);
});

test("a supplied conversation ID is added as a parameterized filter", () => {
  const filter = buildMessageReportsFilter("open", 123);

  assert.equal(filter.where, "WHERE mr.status = ?\n  AND mr.conversation_id = ?");
  assert.deepEqual(filter.params, ["open", 123]);
});

test("all-status requests can still be scoped to one conversation", () => {
  const filter = buildMessageReportsFilter("all", 123);

  assert.equal(filter.where, "WHERE mr.conversation_id = ?");
  assert.deepEqual(filter.params, [123]);
});
