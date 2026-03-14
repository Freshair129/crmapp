---
name: checkpoint
description: >
  Save all progress before ending a work session. Updates MEMORY.md handover log,
  syncs context docs, commits all changes, and pushes to GitHub.
  Use when Boss says: "ไปนอน", "จบวันนี้", "save progress", "checkpoint", or "/checkpoint"
---

# Checkpoint Protocol — End of Session

## Step 1: Gather State

```bash
git status --short
git log --oneline -5
git diff --stat HEAD
```

Identify: what changed, what's untracked, what needs committing.

## Step 2: Update MEMORY.md

Add a new entry at the **top** of the Handover Log section:

```markdown
### [YYYY-MM-DD HH:MM] [Agent Name] — สรุปสั้น
- **สิ่งที่ทำ**: (bullet list of key actions)
- **ไฟล์ที่เปลี่ยน**: (key files only)
- **Breaking Changes**: (list or "ไม่มี")
- **ต้อง review**: (list or "ไม่มี")
- **ทำต่อ**: (next step for next session)
```

## Step 3: Run sync-docs checks

Check if these need updating (only update if actually stale):

| ไฟล์ | ตรวจอะไร |
|---|---|
| `CLAUDE.md` | version table ตรงไหม? phase ใหม่เสร็จไหม? |
| `GEMINI.md` | phase status + directory section ตรงไหม? |
| `GOAL.md` | task ticks ครบไหม? phase status ถูกไหม? |
| `CHANGELOG.md` | มี feature/fix ใหม่ที่ยังไม่บันทึกไหม? |

Only edit files that are actually out of date. Skip if already current.

## Step 4: Stage and Commit

```bash
# Stage all relevant files (NOT .env, NOT node_modules, NOT .agent/)
git add [specific files that changed]

# Commit with descriptive message
git commit -m "checkpoint: [summary of session work]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

## Step 5: Push to GitHub

```bash
git push origin master
```

If push fails (behind remote), do:
```bash
git pull --rebase origin master
git push origin master
```

## Step 6: Report

Output final summary:

```
## Checkpoint Complete — [date time]

### Committed: [commit hash]
### Pushed: origin/master

### Session Summary:
- [key accomplishments]

### For Next Session:
- [what to pick up next]
- [any blockers or decisions needed]

### Files Updated:
- [list of context files that were synced]
```

## Rules
- ห้าม commit `.env`, `prisma/dev.db`, `.agent/`, `test-*.mjs`
- ห้าม force push
- ถ้ามี uncommitted work ที่ยังไม่เสร็จ → commit แยกเป็น `wip: [description]`
- ถ้าไม่มีอะไรเปลี่ยนเลย → ตอบว่า "ไม่มีอะไรต้อง checkpoint" แล้วจบ
- ทำทุกอย่างใน 1 รอบ ไม่ต้องถาม Boss ระหว่างทาง
