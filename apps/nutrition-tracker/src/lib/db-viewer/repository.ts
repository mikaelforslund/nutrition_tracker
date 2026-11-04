import "server-only";
import type { TransactionSql } from "postgres";
import { getSql, withUser } from "../db";
import { getEnv } from "../env";
import { VIEWER_TABLES, type CellEdit, type ColumnType, type ViewerColumn } from "./tables";

const ROW_LIMIT = 200;

export type ViewerRow = Record<string, unknown>;

export type ViewerTableData = {
  name: string;
  schema: string;
  table: string;
  key: string;
  columns: readonly ViewerColumn[];
  total: number;
  rows: ViewerRow[];
};

/**
 * Reads through withUser, so row level security limits this to the person's rows.
 * Server-only tables can't be read that way, so they're filtered here instead.
 */
export async function readViewerTables(userId: string): Promise<ViewerTableData[]> {
  const tables = await withUser(userId, async (tx) => {
    const tables: ViewerTableData[] = [];

    for (const { schema, table, key, orderBy, columns, serverOnly } of VIEWER_TABLES) {
      if (serverOnly) continue;

      const name = `${schema}.${table}`;
      const [count] = await tx<{ total: number }[]>`
        select count(*)::int as total from ${tx(name)}
      `;
      // orderBy comes from the VIEWER_TABLES constant, never from a request.
      const rows = await tx<{ row: ViewerRow }[]>`
        select to_jsonb(t) as row
        from ${tx(name)} t
        order by ${tx.unsafe(orderBy)}
        limit ${ROW_LIMIT}
      `;

      tables.push({
        name,
        schema,
        table,
        key,
        columns,
        total: count?.total ?? 0,
        rows: rows.map(({ row }) => row),
      });
    }

    return tables;
  });

  if (getEnv().AUTH_MODE !== "mock") return tables;

  for (const { schema, table, key, orderBy, columns, serverOnly } of VIEWER_TABLES) {
    if (!serverOnly) continue;

    const name = `${schema}.${table}`;
    const sql = getSql();
    const rows = await sql<{ row: ViewerRow }[]>`
      select to_jsonb(t) as row
      from ${sql(name)} t
      where t.user_id = ${userId}
      order by ${sql.unsafe(orderBy)}
      limit ${ROW_LIMIT}
    `;

    tables.push({
      name,
      schema,
      table,
      key,
      columns,
      total: rows.length,
      rows: rows.map(({ row }) => row),
    });
  }

  return tables;
}

function typedValue(tx: TransactionSql, type: ColumnType, value: string | null) {
  switch (type) {
    case "integer":
      return tx`${value}::integer`;
    case "numeric":
      return tx`${value}::numeric`;
    case "timestamptz":
      return tx`${value}::timestamptz`;
    case "uuid":
      return tx`${value}::uuid`;
    case "text":
      return tx`${value}::text`;
  }
}

/** Returns false if no visible row matched. The edit must come from parseCellEdit. */
export function updateViewerCell(userId: string, edit: CellEdit): Promise<boolean> {
  const { table, column, rowId, value } = edit;

  return withUser(userId, async (tx) => {
    const updated = await tx`
      update ${tx(`${table.schema}.${table.table}`)}
      set ${tx(column.name)} = ${typedValue(tx, column.type, value)}
      where ${tx(table.key)} = ${rowId}::uuid
      returning 1
    `;
    return updated.length > 0;
  });
}
