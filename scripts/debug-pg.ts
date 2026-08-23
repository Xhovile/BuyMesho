import { Pool } from 'pg';

if (process.env.PG_DEBUG_QUERIES === '1') {
  const poolQuery = Pool.prototype.query;
  Pool.prototype.query = function (...args: Parameters<typeof poolQuery>) {
    const text = typeof args[0] === 'string' ? args[0] : String(args[0]);
    const startedAt = Date.now();
    console.error(`[postgres-debug] START ${text.replace(/\s+/g, ' ').trim().slice(0, 300)}`);
    return poolQuery.apply(this, args).then(
      (result) => {
        console.error(`[postgres-debug] END ${Date.now() - startedAt}ms ${text.replace(/\s+/g, ' ').trim().slice(0, 300)}`);
        return result;
      },
      (error) => {
        console.error(`[postgres-debug] ERROR ${Date.now() - startedAt}ms ${text.replace(/\s+/g, ' ').trim().slice(0, 300)} :: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      },
    );
  } as typeof Pool.prototype.query;

  const poolConnect = Pool.prototype.connect;
  Pool.prototype.connect = function (...args: Parameters<typeof poolConnect>) {
    const startedAt = Date.now();
    console.error('[postgres-debug] CONNECT START');
    return poolConnect.apply(this, args).then((client) => {
      console.error(`[postgres-debug] CONNECT END ${Date.now() - startedAt}ms`);
      const originalClientQuery = client.query.bind(client);
      client.query = (async (...queryArgs: Parameters<typeof client.query>) => {
        const queryText = typeof queryArgs[0] === 'string' ? queryArgs[0] : String(queryArgs[0]);
        const queryStartedAt = Date.now();
        console.error(`[postgres-debug] CLIENT START ${queryText.replace(/\s+/g, ' ').trim().slice(0, 300)}`);
        try {
          const result = await originalClientQuery(...queryArgs as never);
          console.error(`[postgres-debug] CLIENT END ${Date.now() - queryStartedAt}ms ${queryText.replace(/\s+/g, ' ').trim().slice(0, 300)}`);
          return result;
        } catch (error) {
          console.error(`[postgres-debug] CLIENT ERROR ${Date.now() - queryStartedAt}ms ${queryText.replace(/\s+/g, ' ').trim().slice(0, 300)} :: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      }) as typeof client.query;
      return client;
    });
  } as typeof Pool.prototype.connect;
}
