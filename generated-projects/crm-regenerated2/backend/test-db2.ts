import { PGlite } from '@electric-sql/pglite';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { Kysely } from 'kysely';

const dbDir = './data/c_r_m _regenerated 2.db';
const pglite = new PGlite(dbDir);
await pglite.waitReady;
const db = new Kysely<any>({
  dialect: new PGliteDialect(pglite),
});

// Check bus_contact table
const table = await db.selectFrom('sys_table' as any)
  .selectAll()
  .where('table_name' as any, '=', 'bus_contact')
  .executeTakeFirst();

console.log('sys_table entry:', table);

const columns = await db.selectFrom('sys_column' as any)
  .selectAll()
  .where('sys_table_id' as any, '=', (table as any).sys_table_id)
  .execute();

console.log('sys_column entries:', columns.length);
columns.forEach((c: any) => {
  console.log(`  - ${c.column_name}: is_active=${c.is_active}`);
});

await db.destroy();
