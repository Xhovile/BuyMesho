import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import type { AddressInfo } from "node:net";
import type { RequestHandler } from "express";
import express from "express";
import { createAdminActionsRouter } from "../admin.actions.routes.js";

test("admin actions cursor pagination preserves rows tied on created_at", async () => {
  const rows: any[] = [];
  let nextId = 1;
  const db = {
    exec: () => undefined,
    prepare: (sql: string) => ({
      run: (...params: any[]) => {
        if (/INSERT INTO admin_actions/i.test(sql)) {
          rows.push({ id: nextId++, admin_uid: params[0], admin_email: params[1], action_type: params[2], target_type: params[3], target_id: params[4], details: params[5], created_at: params[6] });
        }
      },
      all: (...params: any[]) => rows
        .filter((row) => !params[0] || row.created_at < params[0] || (row.created_at === params[0] && row.id < params[1]))
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .slice(0, Number(params.at(-1) ?? 20)),
      get: () => undefined,
    }),
  } as any;
  db.exec(`
    CREATE TABLE admin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_uid TEXT,
      admin_email TEXT,
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const insertAction = db.prepare(`
    INSERT INTO admin_actions (admin_uid, admin_email, action_type, target_type, target_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let index = 1; index <= 5; index += 1) {
    insertAction.run(
      "admin-uid",
      "admin@example.com",
      "report_resolved",
      "content_report",
      `report-${index}`,
      null,
      "2026-05-19 13:00:00",
    );
  }

  insertAction.run(
    "admin-uid",
    "admin@example.com",
    "report_resolved",
    "content_report",
    "older-report",
    null,
    "2026-05-19 12:59:59",
  );

  const app = express();
  const requireAuth: RequestHandler = (req, _res, next) => {
    req.user = { uid: "admin-uid", email: "admin@example.com", is_admin: true };
    next();
  };
  app.use("/api/admin", createAdminActionsRouter({ requireAuth, db }));

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}/api/admin/actions`;

    const firstResponse = await fetch(`${baseUrl}?limit=2`);
    assert.equal(firstResponse.status, 200);
    const firstPage = await firstResponse.json();
    assert.deepEqual(
      firstPage.rows.map((row: { id: number }) => row.id),
      [5, 4],
    );
    assert.equal(firstPage.nextCursor, "2026-05-19 13:00:00|4");

    const secondResponse = await fetch(
      `${baseUrl}?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
    );
    assert.equal(secondResponse.status, 200);
    const secondPage = await secondResponse.json();
    assert.deepEqual(
      secondPage.rows.map((row: { id: number }) => row.id),
      [3, 2],
    );
    assert.equal(secondPage.nextCursor, "2026-05-19 13:00:00|2");

    const thirdResponse = await fetch(
      `${baseUrl}?limit=2&cursor=${encodeURIComponent(secondPage.nextCursor)}`,
    );
    assert.equal(thirdResponse.status, 200);
    const thirdPage = await thirdResponse.json();
    assert.deepEqual(
      thirdPage.rows.map((row: { id: number }) => row.id),
      [1, 6],
    );
  } finally {
    server.close();
    db.close();
  }
});
