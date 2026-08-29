import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  date,
  timestamp,
  pgEnum,
  varchar,
} from "drizzle-orm/pg-core";

export const playerRoleEnum = pgEnum("player_role", [
  "batsman",
  "wicketkeeper",
  "fast_bowler",
  "spinner",
  "all_rounder",
]);

export const bowlerTypeEnum = pgEnum("bowler_type", ["pace", "spin", "swing"]);

export const dismissalTypeEnum = pgEnum("dismissal_type", [
  "caught",
  "lbw",
  "bowled",
  "run_out",
  "stumped",
  "other",
]);

export const inningsPhaseEnum = pgEnum("innings_phase", [
  "overs_1_10",
  "overs_11_40",
  "overs_40_plus",
]);

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roleLabel: text("role_label").notNull(),
  role: playerRoleEnum("role").notNull(),
  photoUrl: text("photo_url"),
  country: text("country").notNull().default("pakistan"),
  cricsheetName: text("cricsheet_name").unique(),
  iccTestRank: integer("icc_test_rank"),
  isCurrentSquad: boolean("is_current_squad").notNull().default(false),
  isCaptain: boolean("is_captain").notNull().default(false),
  // Biographical fields backfilled from CricAPI by a periodic cron (see
  // src/lib/pipeline/refresh-player-bios.ts) rather than fetched live on
  // every page view -- CricAPI's free tier rate-limits hard, and per-view
  // fetching meant the bio card randomly vanished once the day's quota was
  // hit. bioUpdatedAt tracks staleness so the cron knows who to refresh.
  dateOfBirth: date("date_of_birth"),
  placeOfBirth: text("place_of_birth"),
  battingStyle: text("batting_style"),
  bowlingStyleText: text("bowling_style_text"),
  bioUpdatedAt: timestamp("bio_updated_at"),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  cricsheetId: text("cricsheet_id").unique(),
  opponent: text("opponent").notNull(),
  venue: text("venue"),
  startDate: date("start_date").notNull(),
  format: text("format").notNull().default("test"),
  result: text("result"),
});

export const innings = pgTable("innings", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  team: text("team").notNull(),
  inningsNumber: integer("innings_number").notNull(),
});

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  inningsId: integer("innings_id")
    .notNull()
    .references(() => innings.id, { onDelete: "cascade" }),
  over: integer("over").notNull(),
  ball: integer("ball").notNull(),
  batsmanId: integer("batsman_id").references(() => players.id),
  bowlerId: integer("bowler_id").references(() => players.id),
  bowlerType: bowlerTypeEnum("bowler_type"),
  runs: integer("runs").notNull().default(0),
  extras: integer("extras").notNull().default(0),
  // Runs chargeable to the bowler's figures (batter runs + wides + no-balls,
  // excluding byes/leg-byes) -- needed for correct bowling average/economy.
  bowlerRuns: integer("bowler_runs").notNull().default(0),
  // False for wides and no-balls, which don't count toward an over.
  isLegalDelivery: boolean("is_legal_delivery").notNull().default(true),
  isWicket: boolean("is_wicket").notNull().default(false),
  dismissalType: dismissalTypeEnum("dismissal_type"),
  dismissedPlayerId: integer("dismissed_player_id").references(() => players.id),
  phase: inningsPhaseEnum("phase").notNull(),
});

export const iccRankings = pgTable("icc_rankings", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  format: varchar("format", { length: 10 }).notNull().default("test"),
  rank: integer("rank").notNull(),
  points: integer("points"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
