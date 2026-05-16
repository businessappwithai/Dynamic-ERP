import { PGlite } from '@electric-sql/pglite';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { Kysely } from 'kysely';

const dbDir = './data/c_r_m _regenerated 2.db';
const pglite = new PGlite(dbDir);
await pglite.waitReady;
const db = new Kysely<any>({
  dialect: new PGliteDialect(pglite),
});

const tables = await db.selectFrom('sys_table' as any).selectAll().execute();
console.log('Tables in sys_table:', tables.map((t: any) => t.table_name));

const cols = await db.selectFrom('sys_column' as any).selectAll().limit(5).execute();
console.log('Sample columns:', cols.length, 'total');

await db.destroy();
