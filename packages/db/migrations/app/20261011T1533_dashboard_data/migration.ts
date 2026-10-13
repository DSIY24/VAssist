#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/28e82fa9918a80c47d4912762c0f09158f11670aca5f9f9988f45ee09a33d80a/contract';
import endContract from '../../snapshots/28e82fa9918a80c47d4912762c0f09158f11670aca5f9f9988f45ee09a33d80a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5d6e7ea740e8b33e901bd71f94c45dd5872b022f058aab560b87cc24c2dca5b5/contract';
import startContract from '../../snapshots/5d6e7ea740e8b33e901bd71f94c45dd5872b022f058aab560b87cc24c2dca5b5/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'conversations',
        columns: [
          col('closed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('handoff_reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', {
            notNull: true,
            default: fn('gen_random_uuid()'),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('last_message_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('state', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('visitor_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'conversations_handoff_reason_check_ae20b9e1',
            `"handoff_reason" IN ('low_confidence', 'no_relevant_knowledge', 'visitor_requested', 'agent_off')`,
          ),
          checkExpression(
            'conversations_state_check_c0b30865',
            `"state" IN ('ai', 'waiting', 'human', 'closed')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'messages',
        columns: [
          col('attachments', 'jsonb', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/jsonb@1' },
          }),
          col('author', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('classification', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('conversation_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('declined', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn('gen_random_uuid()'),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('member_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('notice', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'messages_author_check_8d9bb6ef',
            `"author" IN ('visitor', 'agent', 'member', 'system')`,
          ),
          checkExpression(
            'messages_classification_check_2c7798de',
            `"classification" IN ('support_question', 'small_talk', 'off_topic', 'human_request')`,
          ),
          checkExpression(
            'messages_notice_check_f83bec50',
            `"notice" IN ('greeting', 'handoff', 'take_over', 'hand_back', 'closed')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'sources',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', {
            notNull: true,
            default: fn('gen_random_uuid()'),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('revision', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('size_bytes', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('uploaded'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('storage_key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('text', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('sources_kind_check_6299d266', `"kind" IN ('file', 'text')`),
          checkExpression(
            'sources_status_check_fde2d523',
            `"status" IN ('uploaded', 'processing', 'ready', 'failed')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'visitors',
        columns: [
          col('browser', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('country', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('device', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('first_seen_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn('gen_random_uuid()'),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('language', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('last_seen_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('os', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('page', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('referrer', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('timezone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('token_hash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('visit_count', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('agent_avatar_key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('agent_name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('allowed_domains', 'text[]', {
          notNull: true,
          default: fn("'{}'::text[]"),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('greeting', 'text', {
          notNull: true,
          default: lit('Hi! How can we help?'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('snippet_installed_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('suggested_questions', 'text[]', {
          notNull: true,
          default: fn("'{}'::text[]"),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('widget_color', 'text', {
          notNull: true,
          default: lit('blue'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('widget_position', 'text', {
          notNull: true,
          default: lit('bottom_right'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'sources',
        constraint: 'sources_workspace_id_name_key',
        columns: ['workspace_id', 'name'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'workspaces',
        constraint: 'workspaces_allowed_domains_elem_not_null_50f9fffb',
        expression: 'array_position("allowed_domains", NULL) IS NULL',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'workspaces',
        constraint: 'workspaces_suggested_questions_elem_not_null_4bc52d93',
        expression: 'array_position("suggested_questions", NULL) IS NULL',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'workspaces',
        constraint: 'workspaces_widget_color_check_eb1bcf52',
        expression: `"widget_color" IN ('blue', 'indigo', 'violet', 'pink', 'red', 'orange', 'green')`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'workspaces',
        constraint: 'workspaces_widget_position_check_a167cc03',
        expression: `"widget_position" IN ('bottom_left', 'bottom_right')`,
      }),
      this.createIndex({
        schema: 'public',
        table: 'conversations',
        index: 'conversations_inbox_8233c50f',
        expression: 'workspace_id, last_message_at DESC, id DESC',
      }),
      this.createIndex({
        schema: 'public',
        table: 'conversations',
        index: 'conversations_open_visitor_bef67027',
        columns: ['visitor_id'],
        extras: { where: "state <> 'closed'", unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'conversations',
        index: 'conversations_visitor_id_idx_f711bdfd',
        columns: ['visitor_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'conversations',
        index: 'conversations_workspace_id_idx_90a9f461',
        columns: ['workspace_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'messages',
        index: 'messages_conversation_id_idx_0c3639df',
        columns: ['conversation_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'messages',
        index: 'messages_history_c21a8864',
        expression: 'conversation_id, created_at, id',
      }),
      this.createIndex({
        schema: 'public',
        table: 'messages',
        index: 'messages_workspace_id_idx_90a9f461',
        columns: ['workspace_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sources',
        index: 'sources_workspace_id_idx_90a9f461',
        columns: ['workspace_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'visitors',
        index: 'visitors_workspace_id_idx_90a9f461',
        columns: ['workspace_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'conversations',
        foreignKey: {
          name: 'conversations_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'conversations',
        foreignKey: {
          name: 'conversations_visitor_id_fkey',
          columns: ['visitor_id'],
          references: { schema: 'public', table: 'visitors', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'messages',
        foreignKey: {
          name: 'messages_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'messages',
        foreignKey: {
          name: 'messages_conversation_id_fkey',
          columns: ['conversation_id'],
          references: { schema: 'public', table: 'conversations', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sources',
        foreignKey: {
          name: 'sources_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'visitors',
        foreignKey: {
          name: 'visitors_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
