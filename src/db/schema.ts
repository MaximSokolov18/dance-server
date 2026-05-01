import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    date,
    time,
    integer,
    decimal,
    pgEnum,
    unique,
} from 'drizzle-orm/pg-core';
import {relations} from 'drizzle-orm';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const subscriptionStatusEnum = pgEnum('subscription_status', [
    'active',
    'expired',
    'frozen',
]);

// ── Tables ────────────────────────────────────────────────────────────────────

export const clients = pgTable('clients', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    telegram: text('telegram'),
    illnesses: integer('illnesses'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

export const groups = pgTable('groups', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    weekDays: text('week_days').array().notNull().default([]),
    classTime: time('class_time').notNull(),
    durationMin: integer('duration_min').notNull(),
    maxCapacity: integer('max_capacity').notNull(),
    classesPerPeriod: integer('classes_per_period').notNull(),
});

export const enrollments = pgTable('enrollments', {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
        .notNull()
        .references(() => clients.id, {onDelete: 'cascade'}),
    groupId: uuid('group_id')
        .notNull()
        .references(() => groups.id, {onDelete: 'cascade'}),
    enrolledAt: date('enrolled_at').notNull(),
    leftAt: date('left_at'),
});

export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
        .notNull()
        .references(() => clients.id, {onDelete: 'cascade'}),
    groupId: uuid('group_id')
        .notNull()
        .references(() => groups.id, {onDelete: 'cascade'}),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    classesTotal: integer('classes_total').notNull(),
    classesUsed: integer('classes_used').notNull().default(0),
    amountPaid: decimal('amount_paid', {precision: 10, scale: 2}).notNull(),
    status: subscriptionStatusEnum('status').notNull().default('active'),
});

export const holidays = pgTable(
    'holidays',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        date: date('date').notNull(),
        name: text('name').notNull(),
        affectsAllGroups: boolean('affects_all_groups').notNull().default(true),
    },
    (t) => [unique('holidays_date_unique').on(t.date)],
);

export const sessions = pgTable('sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
        .notNull()
        .references(() => groups.id, {onDelete: 'cascade'}),
    sessionDate: date('session_date').notNull(),
    sessionTime: time('session_time').notNull(),
    cancelled: boolean('cancelled').notNull().default(false),
    holidayId: uuid('holiday_id').references(() => holidays.id, {onDelete: 'set null'}),
});

export const attendance = pgTable('attendance', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
        .notNull()
        .references(() => sessions.id, {onDelete: 'cascade'}),
    clientId: uuid('client_id')
        .notNull()
        .references(() => clients.id, {onDelete: 'cascade'}),
    subscriptionId: uuid('subscription_id')
        .notNull()
        .references(() => subscriptions.id, {onDelete: 'cascade'}),
    present: boolean('present').notNull(),
    note: text('note'),
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const clientsRelations = relations(clients, ({many}) => ({
    enrollments: many(enrollments),
    subscriptions: many(subscriptions),
    attendance: many(attendance),
}));

export const groupsRelations = relations(groups, ({many}) => ({
    enrollments: many(enrollments),
    subscriptions: many(subscriptions),
    sessions: many(sessions),
}));

export const enrollmentsRelations = relations(enrollments, ({one}) => ({
    client: one(clients, {fields: [enrollments.clientId], references: [clients.id]}),
    group: one(groups, {fields: [enrollments.groupId], references: [groups.id]}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one, many}) => ({
    client: one(clients, {fields: [subscriptions.clientId], references: [clients.id]}),
    group: one(groups, {fields: [subscriptions.groupId], references: [groups.id]}),
    attendance: many(attendance),
}));

export const holidaysRelations = relations(holidays, ({many}) => ({
    sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({one, many}) => ({
    group: one(groups, {fields: [sessions.groupId], references: [groups.id]}),
    holiday: one(holidays, {fields: [sessions.holidayId], references: [holidays.id]}),
    attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({one}) => ({
    session: one(sessions, {fields: [attendance.sessionId], references: [sessions.id]}),
    client: one(clients, {fields: [attendance.clientId], references: [clients.id]}),
    subscription: one(subscriptions, {
        fields: [attendance.subscriptionId],
        references: [subscriptions.id],
    }),
}));
