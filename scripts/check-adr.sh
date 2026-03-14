#!/bin/sh
# ADR Compliance Guard — ตรวจเฉพาะ staged files เท่านั้น
# สร้างโดย Claude (Lead Architect) เพื่อป้องกัน context-loss bugs
#
# ติดตั้ง: cp scripts/check-adr.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

ERRORS=0

# ดึง staged files เท่านั้น (ไม่ตรวจทั้ง repo — เพราะมี pre-existing debt)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null)

if [ -z "$STAGED_FILES" ]; then
    echo "✅ ADR check: ไม่มีไฟล์ staged"
    exit 0
fi

# ─── ADR-031: ห้ามใช้ FontAwesome ใน staged components ───────────────────
STAGED_COMPONENTS=$(echo "$STAGED_FILES" | grep "^src/components/")
if [ -n "$STAGED_COMPONENTS" ]; then
    FA_VIOLATIONS=""
    for f in $STAGED_COMPONENTS; do
        if [ -f "$f" ] && grep -q "fas fa-\|far fa-\|fab fa-" "$f" 2>/dev/null; then
            FA_VIOLATIONS="$FA_VIOLATIONS $f"
        fi
    done
    if [ -n "$FA_VIOLATIONS" ]; then
        echo "❌ ADR-031: FontAwesome พบใน staged files:"
        for f in $FA_VIOLATIONS; do echo "   $f"; done
        echo "   → ใช้ Lucide React แทน: import { IconName } from 'lucide-react'"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ─── DB Pattern: staged routes ต้องมี getPrisma() ถ้าใช้ prisma. ─────────
STAGED_ROUTES=$(echo "$STAGED_FILES" | grep "^src/app/api/.*route\.\(js\|ts\)$")
for f in $STAGED_ROUTES; do
    if [ -f "$f" ]; then
        if grep -q "await prisma\." "$f" && ! grep -q "getPrisma()" "$f"; then
            echo "❌ DB PATTERN: $f"
            echo "   → ใช้ 'await prisma.' แต่ไม่มี 'const prisma = await getPrisma()'"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

# ─── Cache TTL: ห้าม cache.set TTL=0 ใน JS/TS files เท่านั้น ────────────
STAGED_JS=$(echo "$STAGED_FILES" | grep -E "\.(js|ts|jsx|tsx|mjs)$")
for f in $STAGED_JS; do
    if [ -f "$f" ]; then
        # อนุญาต TTL=0 ถ้ามี comment "Permanent" หรือ "permanent" (intentional)
        BAD_TTL=$(grep -n "cache\.set(.*,\s*0)" "$f" 2>/dev/null | grep -iv "permanent\|persist forever")
        if [ -n "$BAD_TTL" ]; then
            echo "❌ CACHE TTL=0 ใน $f:"
            echo "$BAD_TTL" | sed 's/^/   /'
            echo "   → TTL=0 expire ทันที ใช้ 3600 (1h) หรือใส่ comment // Permanent ถ้าตั้งใจ"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

# ─── Result ──────────────────────────────────────────────────────────────
if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "🚫 commit ถูกบล็อก — พบ $ERRORS violation(s) ใน staged files"
    echo "   แก้ไขแล้ว git add อีกครั้ง แล้ว commit ใหม่"
    exit 1
fi

echo "✅ ADR check passed — commit OK"
exit 0
