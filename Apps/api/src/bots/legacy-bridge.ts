/**
 * The single place the API reaches into the legacy CommonJS tree.
 *
 * These modules predate the TypeScript API and are still owned by the Discord
 * process (they read/write the shared JSON-era helpers through the Prisma
 * caches). Keeping every `require` here means the rest of the API stays fully
 * typed, and when a module is finally ported to a package only this file
 * changes.
 *
 * A literal relative path is deliberate: `Apps/api/src/bots` and
 * `Apps/api/dist/bots` are at the same depth, so the same specifier resolves in
 * dev (ts-node) and in production (compiled) without depending on __filename.
 */

type TokenStore = {
  get(key: string): any;
  set(key: string, value: any): Promise<any>;
  delete?(key: string): Promise<any>;
  push(key: string, value: any): Promise<any>;
  pull(key: string, value: any): Promise<any>;
};

export type LifecycleDeps = {
  db2: TokenStore;
  db222: TokenStore;
  rundb: TokenStore;
  tokenPoolDb: TokenStore;
  expiredTokensDb?: TokenStore;
};

export type GraceSnapshot = Record<string, any> & { ClientID?: string };

export type Lifecycle = {
  findBotForRenew(
    clientId: string,
    db2: TokenStore,
    db222: TokenStore,
  ): Promise<{ bot: any; source: string | null; list: any[] }>;
  getGraceSnapshot(db222: TokenStore, clientId: string): GraceSnapshot | null;
  restoreFromGrace(
    clientId: string,
    patch: Record<string, unknown>,
    deps: LifecycleDeps,
  ): Promise<{ ok: boolean; bot?: any; reason?: string }>;
  purgeBot(bot: any, deps: LifecycleDeps): Promise<{ ok: boolean; already?: boolean }>;
  enterGrace(bot: any, deps: LifecycleDeps): Promise<{ ok: boolean; graceUntil?: any }>;
  formatBotDate(value: Date | string | number | null | undefined): string | null;
};

export type MainDb = {
  Database: new (path: string) => TokenStore;
  bots: {
    setAllBots(list: any[]): Promise<unknown>;
    deleteBotData(clientId: string): Promise<unknown>;
  };
  runtimes: { setRunning(clientId: string, running: boolean): Promise<unknown> };
};

export type BalanceApi = {
  getUserBalance(userId: string, guildId: string | null): Promise<number>;
  addBalance(userId: string, guildId: string | null, amount: number): Promise<unknown>;
};

export const lifecycle: Lifecycle = require('../../../../src/shared/services/subscriptionLifecycle');

export const mainDb: MainDb = require('../../../../src/shared/services/mainDb');

export const balance: BalanceApi = require('../../../../src/shared/services/balanceService');
