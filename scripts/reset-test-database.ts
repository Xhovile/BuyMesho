import { getPaymentDb } from '../server/postgresCompat.js';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Test database reset may only run with NODE_ENV=test.');
}

const db = getPaymentDb();

const tables = db.prepare(`
  SELECT
    quote_ident(schemaname) || '.' || quote_ident(tablename) AS qualified_name
  FROM pg_tables
  WHERE schemaname = current_schema()
  ORDER BY tablename
`).all() as Array<{ qualified_name?: string }>;

if (tables.length > 0) {
  const qualifiedTables = tables
    .map(({ qualified_name }) => qualified_name)
    .filter((name): name is string => Boolean(name));

  if (qualifiedTables.length > 0) {
    db.exec(`TRUNCATE TABLE ${qualifiedTables.join(', ')} RESTART IDENTITY CASCADE;`);
  }
}

console.log(`[CI] Test database reset complete (${tables.length} tables cleared).`);

await db.close();
