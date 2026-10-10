import { pgTable, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import type domain from '../games/xiangqi/domain.cjs';
export const xiangqiRooms = pgTable('xiangqi_rooms', {
  code: text('code').primaryKey(),
  state: jsonb('state').$type<domain.Room>().notNull(),
  version: integer('version').notNull(),
  expiresAt: timestamp('expires_at', {withTimezone:true}).notNull(),
}, table => [index('xiangqi_rooms_expiry_idx').on(table.expiresAt)]);
