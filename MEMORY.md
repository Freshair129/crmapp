# MEMORY.md — Project Intelligence & Sync

This document serves as the **short-term memory** and **architectural sync point** between Claude (Lead Architect) and Antigravity (Senior Agent).

---

## 🛰️ Virtual Handover (Claude ↔ Antigravity)

### Last Work Session Summary
- **Time**: 2026-03-14 15:05 (Antigravity Solo)
- **Status**: Separation of Agent Contexts complete.
- **Key Actions**:
    1. Created `ANTIGRAVITY.md` as the Senior Agent's primary context.
    2. Refined `GEMINI.md` for CLI Sub-agents.
    3. Updated `CLAUDE.md` with the new Role Hierarchy.
- **Pending Decisions**: Ready to start Phase 13 (Notification Rules).

---

## 🧠 Architectural Decisions (Soft Knowledge)

*Record context here that is too granular for ADRs but important for "Why" decisions.*

- **Scope of Rules**: Rules for Agents are kept **Workspace-specific** to ensure project integrity across different environments.
- **Hierarchy Polish**: Explicitly separated "IDE Agent (Senior)" from "CLI Worker (Sub-agent)" to prevent accidental use of restricted worker-only protocols.

---

## 🚧 Known Impediments & Research Notes

- **fd Tool Issue**: Encountered `bad CPU type` error with `find_by_name`. Will fallback to `ls` or `run_command` for file discovery.
- **Phase 13 Readiness**: Task completed. Notification Rules engine and LINE integration are live.

---

### [2026-03-14] Phase 13 Completion (Notification Rules & LINE Integration)
- **Status**: ✅ Phase 13.0 - 13.5 DONE.
- **Key Changes**:
    - `NotificationRule` model added and migrated.
    - CRUD API for rules implemented in `api/notifications/rules`.
    - `notificationEngine` implemented and integrated into FB/LINE Webhooks.
    - `notificationWorker` (BullMQ) setup to handle background push notifications.
    - **Unit Testing**: Vitest setup and `notificationEngine` tests PASSED.
- **Critical Note**: LINE Webhook now records messages in the `Message` table and upserts conversations. This was missing previously.
- **Handover**: Phase 13 is fully verified. Ready for Phase 14 or UI integration.

---
*Note: This file should be purged/archived to CHANGELOG.md once a phase is fully completed to save token context.*
