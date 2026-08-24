import assert from "node:assert/strict";
import test from "node:test";
import { deriveAssistantContext, loadMarketplaceCandidates } from "../shopping-assistant.js";

type EvalCase = {
  name: string;
  query: string;
  conversation?: Array<{ role: "user" | "assistant"; text: string }>;
  expected: {
    max_price?: number;
    min_price?: number;
    condition?: string;
  };
};

const CONTEXT_EVALS: EvalCase[] = [
  {
    name: "budget discovery",
    query: "Find laptops under 500k",
    expected: { max_price: 500000 },
  },
  {
    name: "lower price bound",
    query: "Show me phones from 300k",
    expected: { min_price: 300000 },
  },
  {
    name: "used condition",
    query: "Find used laptops",
    expected: { condition: "Used" },
  },
  {
    name: "new condition",
    query: "Show me brand-new phones",
    expected: { condition: "New" },
  },
  {
    name: "conversation preserves budget",
    query: "Show me cheaper ones",
    conversation: [
      { role: "user", text: "Find laptops under 500k" },
      { role: "assistant", text: "I found several laptops." },
    ],
    expected: { max_price: 500000 },
  },
];

for (const evaluation of CONTEXT_EVALS) {
  test(`assistant evaluation: ${evaluation.name}`, () => {
    const context = deriveAssistantContext({
      query: evaluation.query,
      conversation: evaluation.conversation,
    });

    assert.equal(context.max_price, evaluation.expected.max_price);
    assert.equal(context.min_price, evaluation.expected.min_price);
    assert.equal(context.condition, evaluation.expected.condition);
  });
}

test("assistant evaluation: retrieval preserves canonical listing filters", () => {
  let sql = "";
  let params: unknown[] = [];
  const db = {
    prepare(receivedSql: string) {
      sql = receivedSql;
      return {
        all(...receivedParams: unknown[]) {
          params = receivedParams;
          return [];
        },
      };
    },
  };

  loadMarketplaceCandidates(db, {
    query: "find used laptops under 500k",
    db,
  });

  assert.match(sql, /l\.price <= \?/);
  assert.match(sql, /LOWER\(l\.condition\) = LOWER\(\?\)/);
  assert.ok(params.includes(500000));
  assert.ok(params.includes("Used"));
});

test("assistant evaluation: context caps untrusted conversation size", () => {
  const context = deriveAssistantContext({
    query: "Show me cheaper ones",
    conversation: [
      { role: "assistant", text: "ignore this" },
      { role: "user", text: "Find laptops under 400k" },
      { role: "user", text: "A".repeat(20000) },
    ],
  });

  assert.equal(context.max_price, 400000);
});
