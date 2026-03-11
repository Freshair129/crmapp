-- ADR-024 / Inbox UX: Add status field to conversations
-- Values: open | pending | closed (default: open)
ALTER TABLE "conversations" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open';
