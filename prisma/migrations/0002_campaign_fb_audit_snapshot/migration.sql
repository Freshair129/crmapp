-- Migration: 0002_campaign_fb_audit_snapshot
-- Purpose: Add Facebook API audit snapshot fields to campaigns table.
--          These values are pulled directly from the Facebook Campaign Insights API
--          and stored for reconciliation against bottom-up calculated metrics (ADR-024).
-- Fields (all nullable — populated by sync worker, not on creation):
--   fb_spend       : Total spend reported by Facebook
--   fb_clicks      : Total clicks reported by Facebook
--   fb_leads       : Total leads (form/message actions) reported by Facebook
--   fb_revenue     : Total revenue (action_values) reported by Facebook
--   fb_snapshot_at : Timestamp when the Facebook snapshot was last fetched

ALTER TABLE "campaigns"
  ADD COLUMN "fb_spend"       DOUBLE PRECISION,
  ADD COLUMN "fb_clicks"      INTEGER,
  ADD COLUMN "fb_leads"       INTEGER,
  ADD COLUMN "fb_revenue"     DOUBLE PRECISION,
  ADD COLUMN "fb_snapshot_at" TIMESTAMP(3);
