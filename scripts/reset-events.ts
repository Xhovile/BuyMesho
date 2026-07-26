import { closePool, withTransaction } from "../server/postgres.js";

async function main() {
  const confirmed = process.argv.includes("--confirm");

  if (!confirmed) {
    console.error("Refusing to delete event data. Re-run with: npm run reset:events -- --confirm");
    process.exitCode = 1;
    return;
  }

  let deletedEvents = 0;
  let deletedConversations = 0;

  await withTransaction(async (client) => {
    const conversationIdsResult = await client.query<{ id: number }>(
      `
        SELECT id
        FROM conversations
        WHERE event_id IS NOT NULL
      `
    );

    const conversationIds = conversationIdsResult.rows.map((row) => row.id);

    if (conversationIds.length > 0) {
      const reportsResult = await client.query(
        `
          DELETE FROM message_reports
          WHERE conversation_id = ANY($1::int[])
        `,
        [conversationIds],
      );

      const messagesResult = await client.query(
        `
          DELETE FROM messages
          WHERE conversation_id = ANY($1::int[])
        `,
        [conversationIds],
      );

      const participantsResult = await client.query(
        `
          DELETE FROM conversation_participants
          WHERE conversation_id = ANY($1::int[])
        `,
        [conversationIds],
      );

      const conversationsResult = await client.query(
        `
          DELETE FROM conversations
          WHERE id = ANY($1::int[])
        `,
        [conversationIds],
      );

      deletedConversations = conversationsResult.rowCount ?? conversationIds.length;
      console.log(`Deleted ${reportsResult.rowCount ?? 0} message reports, ${messagesResult.rowCount ?? 0} messages, and ${participantsResult.rowCount ?? 0} conversation participants tied to events.`);
    }

    const eventActivityResult = await client.query(
      `
        DELETE FROM event_activity
        WHERE event_id IN (SELECT id FROM events)
      `,
    );

    const eventsResult = await client.query(
      `
        DELETE FROM events
      `,
    );

    deletedEvents = eventsResult.rowCount ?? 0;
    console.log(`Deleted ${eventActivityResult.rowCount ?? 0} event activity rows.`);
  });

  console.log(`Hard delete complete. Removed ${deletedEvents} events and ${deletedConversations} event conversations.`);
}

main()
  .catch((error) => {
    console.error("Event hard delete failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closePool();
    } catch {
      // ignore pool shutdown errors
    }
  });