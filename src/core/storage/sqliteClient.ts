import { open, type DB, type Scalar } from '@op-engineering/op-sqlite';

type SqlParams = Scalar[];
type SqlTuple = [string] | [string, SqlParams];

let database: DB | null = null;

const getDatabase = (): DB => {
  if (!database) {
    database = open({ name: 'omniplay_hub.db' });
    database.executeSync('PRAGMA foreign_keys = ON;');
    database.executeSync('PRAGMA journal_mode = WAL;');
  }

  return database;
};

export const sqliteClient = {
  getDb: () => getDatabase(),
};

export const executeSql = async (query: string, params: SqlParams = []): Promise<unknown> => {
  const db = getDatabase();
  return db.execute(query, params);
};

export const executeBatch = async (commands: Array<[string, SqlParams?]>): Promise<unknown> => {
  const db = getDatabase();
  const normalizedCommands: SqlTuple[] = commands.map(([query, params]) =>
    params ? [query, params] : [query],
  );

  return db.executeBatch(normalizedCommands as Parameters<DB['executeBatch']>[0]);
};

export default sqliteClient;
