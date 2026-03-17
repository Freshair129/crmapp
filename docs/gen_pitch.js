"use strict";
const pptxgen = require("pptxgenjs");

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  PRIMARY_DARK: "12111A",
  PRIMARY_NAVY: "1C1B2E",
  GOLD:         "C9A84C",
  RED:          "D64045",
  CREAM:        "F5F0E8",
  LIGHT_GRAY:   "E8E4DC",
  WHITE:        "FFFFFF",
  MUTED:        "9B968A",
  DARK_BOX:     "1C2A3A",
  LIGHT_RED:    "FFE5E5",
};

const makeShadow = () => ({
  type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15
});

// ── Pres setup ────────────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title  = "V School CRM v2 — Business Pitch";
pres.author = "V School";

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.PRIMARY_DARK };

  // Top-right gold decorative block
  s.addShape(pres.shapes.RECTANGLE, {
    x: 9.7, y: 0, w: 0.3, h: 5.625,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });

  // Title
  s.addText("V School CRM v2", {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontFace: "Georgia", fontSize: 48, color: C.GOLD,
    bold: true, align: "center", valign: "middle", margin: 0
  });

  // Subtitle
  s.addText("ระบบที่เปลี่ยนข้อมูล\nเป็นรายได้จริง", {
    x: 0.5, y: 2.7, w: 9, h: 0.8,
    fontFace: "Calibri", fontSize: 22, color: C.CREAM,
    align: "center", valign: "middle", margin: 0
  });

  // Sub-subtitle
  s.addText("The V School · กรุงเทพฯ · 2026", {
    x: 0.5, y: 3.55, w: 9, h: 0.4,
    fontFace: "Calibri", fontSize: 14, color: C.MUTED,
    align: "center", valign: "middle", margin: 0
  });

  // Bottom gold line
  s.addShape(pres.shapes.RECTANGLE, {
    x: 2, y: 4.8, w: 6, h: 0.04,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Problems
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.PRIMARY_NAVY };

  // Title
  s.addText("ก่อนมี CRM: ปัญหาที่เจออยู่ทุกวัน", {
    x: 0.4, y: 0.2, w: 9.2, h: 0.6,
    fontFace: "Georgia", fontSize: 26, color: C.GOLD,
    bold: true, valign: "middle", margin: 0
  });

  // Helper: draw a problem card
  const makeCard = (x, y, iconText, header, body) => {
    // White card bg
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.3, h: 1.55,
      fill: { color: C.WHITE }, line: { color: C.WHITE },
      shadow: makeShadow()
    });
    // Gold left accent
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h: 1.55,
      fill: { color: C.GOLD }, line: { color: C.GOLD }
    });
    // Red icon circle
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.15, y: y + 0.12, w: 0.5, h: 0.5,
      fill: { color: C.RED }, line: { color: C.RED }
    });
    // Icon text
    s.addText(iconText, {
      x: x + 0.15, y: y + 0.12, w: 0.5, h: 0.5,
      fontSize: 14, color: C.WHITE, bold: true,
      align: "center", valign: "middle", margin: 0
    });
    // Header
    s.addText(header, {
      x: x + 0.8, y: y + 0.08, w: 3.3, h: 0.35,
      fontSize: 13, color: C.PRIMARY_DARK, bold: true,
      valign: "middle", margin: 0
    });
    // Body
    s.addText(body, {
      x: x + 0.8, y: y + 0.47, w: 3.3, h: 0.95,
      fontSize: 11, color: C.MUTED, valign: "top", margin: 0
    });
  };

  makeCard(0.4, 1.2, "฿", "ยิง Ads ไปเรื่อยๆ ไม่รู้ผล",
    "ไม่รู้ว่า Ad ไหนทำให้มีลูกค้าจริง\nใช้งบไปเฉยๆ วัดผลไม่ได้");
  makeCard(5.3, 1.2, "✗", "ลูกค้าทักมา — ตอบช้า ปิดไม่ได้",
    "ข้อความ FB + LINE กระจัดกระจาย\nไม่มีระบบติดตาม หลุดไปหลายดีล");
  makeCard(0.4, 2.95, "?", "ไม่รู้ว่าวัตถุดิบจะพอสอนไหม",
    "สต็อกเหลือไม่ชัดเจน ไม่รู้ lot ไหน\nหมดก่อน เสียหายจากของหมดอายุ");
  makeCard(5.3, 2.95, "↺", "นักเรียนเก่าไม่กลับมาซื้อซ้ำ",
    "ไม่มีระบบ re-engage อัตโนมัติ\nต้องจำเองว่าใครควรได้รับข่าวสาร");

  // Bottom text
  s.addText("ปัญหาเหล่านี้ทำให้เสียเงินและเสียโอกาสทุกวัน", {
    x: 0.4, y: 4.72, w: 9.2, h: 0.4,
    fontFace: "Calibri", fontSize: 13, color: C.CREAM,
    italic: true, align: "center", valign: "middle", margin: 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Overview 5 ways
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.CREAM };

  // Top dark band
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.7,
    fill: { color: C.PRIMARY_DARK }, line: { color: C.PRIMARY_DARK }
  });
  s.addText("V School CRM v2 สร้างรายได้ใน 5 ทาง", {
    x: 0.4, y: 0.05, w: 9.2, h: 0.6,
    fontFace: "Georgia", fontSize: 22, color: C.GOLD,
    bold: true, valign: "middle", margin: 0
  });

  // Rows data
  const rows = [
    { y: 0.9,  num: "1", numBg: C.GOLD,  numFg: C.PRIMARY_DARK, label: "รู้ว่า Ad ไหนได้เงินจริง",                     tagBg: C.GOLD, tagFg: C.PRIMARY_DARK, tag: "ลด Ad Waste" },
    { y: 1.6,  num: "2", numBg: C.RED,   numFg: C.WHITE,        label: "ตอบเร็วขึ้น → Conversion สูงขึ้น",             tagBg: C.RED,  tagFg: C.WHITE,        tag: "เพิ่ม Conversion" },
    { y: 2.3,  num: "3", numBg: C.GOLD,  numFg: C.PRIMARY_DARK, label: "Package & Upsell อัตโนมัติ",                    tagBg: C.GOLD, tagFg: C.PRIMARY_DARK, tag: "เพิ่ม AOV" },
    { y: 3.0,  num: "4", numBg: C.RED,   numFg: C.WHITE,        label: "ลดของเสีย ตรวจสต็อก Lot by Lot",              tagBg: C.RED,  tagFg: C.WHITE,        tag: "ลดต้นทุน" },
    { y: 3.7,  num: "5", numBg: C.GOLD,  numFg: C.PRIMARY_DARK, label: "Re-engage นักเรียนเก่าผ่าน LINE อัตโนมัติ",   tagBg: C.GOLD, tagFg: C.PRIMARY_DARK, tag: "เพิ่ม LTV" },
  ];

  // Divider lines between rows
  [1.55, 2.25, 2.95, 3.65].forEach(divY => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.35, y: divY, w: 9.3, h: 0.01,
      fill: { color: C.LIGHT_GRAY }, line: { color: C.LIGHT_GRAY }
    });
  });

  rows.forEach(r => {
    // Number circle
    s.addShape(pres.shapes.OVAL, {
      x: 0.4, y: r.y, w: 0.55, h: 0.55,
      fill: { color: r.numBg }, line: { color: r.numBg }
    });
    s.addText(r.num, {
      x: 0.4, y: r.y, w: 0.55, h: 0.55,
      fontSize: 18, color: r.numFg, bold: true,
      align: "center", valign: "middle", margin: 0
    });
    // Label
    s.addText(r.label, {
      x: 1.15, y: r.y + 0.05, w: 6.5, h: 0.5,
      fontSize: 15, color: C.PRIMARY_DARK, bold: true,
      valign: "middle", margin: 0
    });
    // Benefit tag
    s.addShape(pres.shapes.RECTANGLE, {
      x: 7.8, y: r.y, w: 1.9, h: 0.55,
      fill: { color: r.tagBg }, line: { color: r.tagBg }
    });
    s.addText(r.tag, {
      x: 7.8, y: r.y, w: 1.9, h: 0.55,
      fontSize: 11, color: r.tagFg, bold: true,
      align: "center", valign: "middle", margin: 0
    });
  });

  // Bottom note
  s.addText("ทั้ง 5 ทางนี้ทำงานพร้อมกันในระบบเดียว ไม่ต้องใช้หลายแพลตฟอร์ม", {
    x: 0.5, y: 4.45, w: 9, h: 0.45,
    fontFace: "Calibri", fontSize: 13, color: C.MUTED,
    italic: true, align: "center", valign: "middle", margin: 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — ROAS Attribution
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.PRIMARY_DARK };

  // Top gold line
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  // Tag
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 0.15, w: 1.3, h: 0.4,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  s.addText("วิธีที่ 1", {
    x: 0.4, y: 0.15, w: 1.3, h: 0.4,
    fontSize: 12, color: C.PRIMARY_DARK, bold: true,
    align: "center", valign: "middle", margin: 0
  });
  // Title
  s.addText("รู้ว่า Ad ไหนได้เงินจริง — ด้วย ROAS Attribution", {
    x: 0.4, y: 0.65, w: 9.2, h: 0.5,
    fontFace: "Georgia", fontSize: 24, color: C.WHITE,
    valign: "middle", margin: 0
  });

  // Left column — flow steps
  const steps = [
    { y: 1.3,  title: "Facebook Ad คลิก",    sub: "ระบบบันทึก ad_id จาก webhook" },
    { y: 2.25, title: "ลูกค้าส่งข้อความ",    sub: "Customer.originId = ad_id" },
    { y: 3.2,  title: "ลูกค้าสมัครคอร์ส",    sub: "Order.totalAmount ผูกกับ ad_id" },
  ];
  steps.forEach((st, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y: st.y, w: 4.5, h: 0.8,
      fill: { color: C.DARK_BOX }, line: { color: C.DARK_BOX }
    });
    s.addText(st.title, {
      x: 0.55, y: st.y + 0.04, w: 4.2, h: 0.38,
      fontSize: 13, color: C.WHITE, bold: true, valign: "middle", margin: 0
    });
    s.addText(st.sub, {
      x: 0.55, y: st.y + 0.42, w: 4.2, h: 0.32,
      fontSize: 10, color: C.MUTED, valign: "middle", margin: 0
    });
    // Arrow down (except last)
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: 2.5, y: st.y + 0.8, w: 0.02, h: 0.35,
        fill: { color: C.GOLD }, line: { color: C.GOLD }
      });
    }
  });

  // ROAS Formula box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 4.15, w: 4.5, h: 0.85,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  s.addText("ROAS = รายได้ ÷ งบโฆษณา", {
    x: 0.4, y: 4.15, w: 4.5, h: 0.85,
    fontSize: 14, color: C.PRIMARY_DARK, bold: true,
    align: "center", valign: "middle", margin: 0
  });

  // Right column — stat cards
  const stats = [
    { y: 1.3,  h: 1.0,  big: "3-5×",  label: "ROAS เฉลี่ยที่ดีสำหรับ School" },
    { y: 2.5,  h: 1.0,  big: "50%",   label: "งบโฆษณาที่ประหยัดได้\nเมื่อรู้ว่า Ad ไหนไม่ work" },
    { y: 3.7,  h: 0.8,  big: null,    label: "ตอนนี้ระบบบันทึก Attribution ครบแล้ว\nพร้อม query ทันที" },
  ];
  stats.forEach(sc => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.4, y: sc.y, w: 4.2, h: sc.h,
      fill: { color: C.DARK_BOX }, line: { color: C.DARK_BOX }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.4, y: sc.y, w: 0.08, h: sc.h,
      fill: { color: C.GOLD }, line: { color: C.GOLD }
    });
    if (sc.big) {
      s.addText(sc.big, {
        x: 5.55, y: sc.y + 0.02, w: 3.9, h: 0.5,
        fontSize: 32, color: C.GOLD, bold: true, valign: "middle", margin: 0
      });
      s.addText(sc.label, {
        x: 5.55, y: sc.y + 0.54, w: 3.9, h: 0.4,
        fontSize: 11, color: C.CREAM, valign: "top", margin: 0
      });
    } else {
      s.addText(sc.label, {
        x: 5.55, y: sc.y + 0.05, w: 3.9, h: sc.h - 0.1,
        fontSize: 12, color: C.CREAM, valign: "middle", margin: 0
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Unified Inbox
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.CREAM };

  // Top dark band
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.65,
    fill: { color: C.PRIMARY_DARK }, line: { color: C.PRIMARY_DARK }
  });
  // Tag
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 0.12, w: 1.3, h: 0.4,
    fill: { color: C.RED }, line: { color: C.RED }
  });
  s.addText("วิธีที่ 2", {
    x: 0.4, y: 0.12, w: 1.3, h: 0.4,
    fontSize: 12, color: C.WHITE, bold: true,
    align: "center", valign: "middle", margin: 0
  });
  // Title
  s.addText("Unified Inbox — ตอบเร็วขึ้น ปิดดีลได้เยอะขึ้น", {
    x: 2.0, y: 0.08, w: 7.6, h: 0.55,
    fontFace: "Georgia", fontSize: 20, color: C.CREAM,
    valign: "middle", margin: 0
  });

  // Big stat
  s.addText("7×", {
    x: 3.5, y: 0.78, w: 3, h: 1.1,
    fontFace: "Georgia", fontSize: 72, color: C.RED,
    bold: true, align: "center", valign: "middle", margin: 0
  });
  s.addText("โอกาสปิดดีลสูงกว่า\nถ้าตอบภายใน 1 ชั่วโมง vs. 1 วัน", {
    x: 1.5, y: 1.85, w: 7, h: 0.6,
    fontFace: "Calibri", fontSize: 13, color: C.PRIMARY_DARK,
    align: "center", valign: "middle", margin: 0
  });

  // Two comparison cards
  // Left — Before
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 2.6, w: 4.3, h: 2.4,
    fill: { color: C.WHITE }, line: { color: C.WHITE }, shadow: makeShadow()
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 2.6, w: 0.08, h: 2.4,
    fill: { color: C.RED }, line: { color: C.RED }
  });
  s.addText("ก่อน — กระจัดกระจาย", {
    x: 0.65, y: 2.68, w: 3.9, h: 0.38,
    fontSize: 14, color: C.RED, bold: true, valign: "middle", margin: 0
  });
  const beforeItems = [
    "Facebook Messenger — แอปแยก",
    "LINE Official — แอปแยก",
    "ไม่รู้ว่าใครรับผิดชอบ",
    "ลูกค้าถามซ้ำ ข้อมูลหาย",
  ];
  beforeItems.forEach((txt, i) => {
    s.addText([{ text: txt, options: { bullet: true } }], {
      x: 0.65, y: 3.08 + i * 0.35, w: 3.9, h: 0.32,
      fontSize: 12, color: C.MUTED, valign: "middle", margin: 0
    });
  });

  // Right — After
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.3, y: 2.6, w: 4.3, h: 2.4,
    fill: { color: C.WHITE }, line: { color: C.WHITE }, shadow: makeShadow()
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.3, y: 2.6, w: 0.08, h: 2.4,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  s.addText("หลัง — Inbox เดียว", {
    x: 5.55, y: 2.68, w: 3.9, h: 0.38,
    fontSize: 14, color: C.GOLD, bold: true, valign: "middle", margin: 0
  });
  const afterItems = [
    "FB + LINE รวมในหน้าเดียว",
    "เห็นประวัติลูกค้าทันที",
    "ตอบได้ทุกช่องทางในที่เดียว",
    "วัด Response Time ของทีม",
  ];
  afterItems.forEach((txt, i) => {
    s.addText([{ text: txt, options: { bullet: true } }], {
      x: 5.55, y: 3.08 + i * 0.35, w: 3.9, h: 0.32,
      fontSize: 12, color: C.PRIMARY_DARK, valign: "middle", margin: 0
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Package & Upsell
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.PRIMARY_NAVY };

  // Top gold line
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  // Tag
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 0.15, w: 1.3, h: 0.4,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  s.addText("วิธีที่ 3", {
    x: 0.4, y: 0.15, w: 1.3, h: 0.4,
    fontSize: 12, color: C.PRIMARY_DARK, bold: true,
    align: "center", valign: "middle", margin: 0
  });
  // Title
  s.addText("Package & Upsell — เพิ่มรายได้ต่อลูกค้า", {
    x: 0.4, y: 0.65, w: 9.2, h: 0.5,
    fontFace: "Georgia", fontSize: 24, color: C.WHITE,
    valign: "middle", margin: 0
  });

  // Left — single course box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.35, w: 3.5, h: 3.0,
    fill: { color: C.DARK_BOX }, line: { color: C.DARK_BOX }
  });
  s.addText("ลูกค้าซื้อคอร์สเดี่ยว", {
    x: 0.5, y: 1.45, w: 3.3, h: 0.4,
    fontSize: 12, color: C.CREAM, bold: true, align: "center", valign: "middle", margin: 0
  });
  s.addText("฿4,500", {
    x: 0.5, y: 1.88, w: 3.3, h: 0.7,
    fontFace: "Georgia", fontSize: 38, color: C.MUTED, bold: true,
    align: "center", valign: "middle", margin: 0
  });
  s.addText("ต่อคน ต่อครั้ง", {
    x: 0.5, y: 2.58, w: 3.3, h: 0.3,
    fontSize: 11, color: C.MUTED, align: "center", valign: "middle", margin: 0
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 2.9, w: 3.1, h: 0.01,
    fill: { color: C.MUTED }, line: { color: C.MUTED }
  });
  s.addText("ไม่มีเหตุผลให้กลับมาซื้อต่อ", {
    x: 0.5, y: 3.0, w: 3.3, h: 0.35,
    fontSize: 11, color: C.RED, align: "center", valign: "middle", margin: 0
  });

  // Arrow + VS
  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.15, y: 2.5, w: 0.7, h: 0.7,
    fill: { color: C.DARK_BOX }, line: { color: C.DARK_BOX }
  });
  s.addText("→", {
    x: 4.15, y: 2.5, w: 0.7, h: 0.7,
    fontSize: 22, color: C.WHITE, bold: true,
    align: "center", valign: "middle", margin: 0
  });

  // Right — Package box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.1, y: 1.35, w: 4.5, h: 3.0,
    fill: { color: C.DARK_BOX }, line: { color: C.DARK_BOX }
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.1, y: 1.35, w: 0.1, h: 3.0,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  s.addText("ลูกค้าซื้อ Package", {
    x: 5.3, y: 1.45, w: 4.1, h: 0.4,
    fontSize: 12, color: C.GOLD, bold: true, align: "center", valign: "middle", margin: 0
  });
  s.addText("฿18,000", {
    x: 5.3, y: 1.88, w: 4.1, h: 0.7,
    fontFace: "Georgia", fontSize: 38, color: C.GOLD, bold: true,
    align: "center", valign: "middle", margin: 0
  });
  s.addText("ต่อคน (หลายคอร์ส)", {
    x: 5.3, y: 2.58, w: 4.1, h: 0.3,
    fontSize: 11, color: C.CREAM, align: "center", valign: "middle", margin: 0
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.3, y: 2.9, w: 4.1, h: 0.01,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  const pkgItems = [
    "คอร์สหลาย level ใน 1 ดีล",
    "Swap course ได้ 1 ครั้ง",
    "ของแถม สร้าง perceived value",
  ];
  pkgItems.forEach((txt, i) => {
    s.addText("✓  " + txt, {
      x: 5.35, y: 2.98 + i * 0.37, w: 4.0, h: 0.35,
      fontSize: 11, color: C.CREAM, valign: "middle", margin: 0
    });
  });

  // Bottom stat
  s.addText("เพิ่ม AOV ได้ถึง 4× เมื่อขาย Package แทนคอร์สเดี่ยว", {
    x: 0.4, y: 4.6, w: 9.2, h: 0.4,
    fontSize: 14, color: C.GOLD, bold: true, align: "center", valign: "middle", margin: 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Lot ID Stock Tracking
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.CREAM };

  // Top dark band
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.65,
    fill: { color: C.PRIMARY_DARK }, line: { color: C.PRIMARY_DARK }
  });
  // Tag
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 0.12, w: 1.3, h: 0.4,
    fill: { color: C.RED }, line: { color: C.RED }
  });
  s.addText("วิธีที่ 4", {
    x: 0.4, y: 0.12, w: 1.3, h: 0.4,
    fontSize: 12, color: C.WHITE, bold: true,
    align: "center", valign: "middle", margin: 0
  });
  s.addText("Lot ID — รู้ทุก Lot ว่าเหลือเท่าไร หมดอายุเมื่อไร", {
    x: 2.0, y: 0.08, w: 7.6, h: 0.55,
    fontFace: "Georgia", fontSize: 18, color: C.CREAM,
    valign: "middle", margin: 0
  });

  // Table header
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 0.8, w: 4.5, h: 0.45,
    fill: { color: C.PRIMARY_DARK }, line: { color: C.PRIMARY_DARK }
  });
  s.addText("LOT ID  |  วัตถุดิบ  |  เหลือ  |  หมดอายุ", {
    x: 0.5, y: 0.8, w: 4.3, h: 0.45,
    fontSize: 10, color: C.WHITE, bold: true, valign: "middle", margin: 0
  });

  // Table rows
  const tableRows = [
    { fill: C.CREAM,      text: "LOT-20260316-001  |  แป้งสาลี  |  2.5 kg  |  30 มี.ค.", color: C.PRIMARY_DARK, bold: false },
    { fill: C.LIGHT_GRAY, text: "LOT-20260310-003  |  โชยุ  |  1.2 L  |  15 เม.ย.",      color: C.PRIMARY_DARK, bold: false },
    { fill: "FFE5E5",     text: "LOT-20260301-002  |  ซากุระมิโซ  |  0.8 kg  |  ⚠ 18 มี.ค.", color: C.RED, bold: true },
    { fill: C.LIGHT_GRAY, text: "LOT-20260305-001  |  ไข่ไก่  |  24 ฟอง  |  22 มี.ค.",   color: C.PRIMARY_DARK, bold: false },
  ];
  tableRows.forEach((row, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y: 1.25 + i * 0.4, w: 4.5, h: 0.4,
      fill: { color: row.fill }, line: { color: row.fill }
    });
    s.addText(row.text, {
      x: 0.5, y: 1.28 + i * 0.4, w: 4.3, h: 0.34,
      fontSize: 10, color: row.color, bold: row.bold, valign: "middle", margin: 0
    });
  });
  s.addText("ระบบแจ้งเตือนอัตโนมัติเมื่อของใกล้หมดอายุ", {
    x: 0.4, y: 2.9, w: 4.5, h: 0.3,
    fontSize: 10, color: C.MUTED, italic: true, valign: "middle", margin: 0
  });

  // Right benefit cards
  const bcards = [
    { y: 0.8,  h: 0.95, head: "ลดของเสียจาก\nวัตถุดิบหมดอายุ",    sub: "FEFO: ใช้ lot ที่หมดก่อนออกก่อน" },
    { y: 1.9,  h: 0.95, head: "รู้ต้นทุนจริงแยก Lot",              sub: "costPerUnit ต่าง lot = margin ชัดเจนขึ้น" },
    { y: 3.0,  h: 0.95, head: "เชื่อมกับตัดสต็อกอัตโนมัติ",       sub: "ทุกครั้งที่สอนคลาส ระบบบันทึก log ทุก lot ที่ใช้" },
  ];
  bcards.forEach(bc => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.2, y: bc.y, w: 4.4, h: bc.h,
      fill: { color: C.WHITE }, line: { color: C.WHITE }, shadow: makeShadow()
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.2, y: bc.y, w: 0.08, h: bc.h,
      fill: { color: C.GOLD }, line: { color: C.GOLD }
    });
    s.addText(bc.head, {
      x: 5.4, y: bc.y + 0.05, w: 4.05, h: 0.45,
      fontSize: 13, color: C.PRIMARY_DARK, bold: true, valign: "middle", margin: 0
    });
    s.addText(bc.sub, {
      x: 5.4, y: bc.y + 0.5, w: 4.05, h: 0.38,
      fontSize: 11, color: C.MUTED, valign: "middle", margin: 0
    });
  });

  // Bottom note
  s.addText("วัตถุดิบเฉลี่ยคิดเป็น 25-35% ของต้นทุนคอร์ส — ลดของเสียได้ = กำไรเพิ่ม", {
    x: 0.4, y: 4.25, w: 9.2, h: 0.45,
    fontSize: 12, color: C.PRIMARY_DARK, bold: true, italic: true,
    align: "center", valign: "middle", margin: 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — LINE Re-engage
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.PRIMARY_DARK };

  // Top gold line
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  // Tag
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 0.15, w: 1.3, h: 0.4,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });
  s.addText("วิธีที่ 5", {
    x: 0.4, y: 0.15, w: 1.3, h: 0.4,
    fontSize: 12, color: C.PRIMARY_DARK, bold: true,
    align: "center", valign: "middle", margin: 0
  });
  s.addText("LINE Notification อัตโนมัติ — ดึงนักเรียนกลับมา", {
    x: 0.4, y: 0.65, w: 9.2, h: 0.5,
    fontFace: "Georgia", fontSize: 22, color: C.WHITE,
    valign: "middle", margin: 0
  });

  // Automation flow boxes
  const flowBoxes = [
    { x: 0.2,  label: "นักเรียน\nจบคอร์ส",       fill: C.DARK_BOX, fg: C.CREAM },
    { x: 2.5,  label: "ระบบ\nตรวจสอบ Rule",       fill: C.DARK_BOX, fg: C.CREAM },
    { x: 4.8,  label: "ส่ง LINE\nอัตโนมัติ",       fill: C.GOLD,     fg: C.PRIMARY_DARK },
    { x: 7.1,  label: "นักเรียน\nคลิก/ตอบ",       fill: C.DARK_BOX, fg: C.CREAM },
    { x: 9.35, label: "Sale\n✓",                   fill: C.RED,      fg: C.WHITE },
  ];
  flowBoxes.forEach((fb, i) => {
    const w = i === flowBoxes.length - 1 ? 0.45 : 1.7;
    s.addShape(pres.shapes.RECTANGLE, {
      x: fb.x, y: 1.45, w, h: 0.9,
      fill: { color: fb.fill }, line: { color: fb.fill }
    });
    s.addText(fb.label, {
      x: fb.x, y: 1.45, w, h: 0.9,
      fontSize: i === flowBoxes.length - 1 ? 10 : 11,
      color: fb.fg, bold: true, align: "center", valign: "middle", margin: 0
    });
    // Arrow between boxes (except last)
    if (i < flowBoxes.length - 1) {
      const arrowX = fb.x + (i === flowBoxes.length - 2 ? 1.7 : 1.7) + 0.02;
      s.addShape(pres.shapes.RECTANGLE, {
        x: fb.x + (i === flowBoxes.length - 2 ? 1.7 : 1.7) + 0.02,
        y: 1.87, w: 0.06, h: 0.06,
        fill: { color: C.GOLD }, line: { color: C.GOLD }
      });
    }
  });

  // Notification rule cards
  const cards8 = [
    {
      x: 0.4, icon: "⏰", header: "30 วันหลังจบ",
      body: "ส่ง LINE แนะนำ\nคอร์ส Level ถัดไป",
      tagBg: C.GOLD, tagFg: C.PRIMARY_DARK, tag: "Re-enroll"
    },
    {
      x: 3.6, icon: "★", header: "VIP / High-spend",
      body: "ส่งโปรโมชั่น\nพิเศษเฉพาะกลุ่ม",
      tagBg: C.RED, tagFg: C.WHITE, tag: "Exclusive Offer"
    },
    {
      x: 6.8, icon: "📅", header: "ใกล้เปิดคลาสใหม่",
      body: "แจ้งตารางเรียน\nล่วงหน้า 7 วัน",
      tagBg: C.GOLD, tagFg: C.PRIMARY_DARK, tag: "Class Alert"
    },
  ];
  cards8.forEach(c => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: c.x, y: 2.65, w: 2.8, h: 1.7,
      fill: { color: C.DARK_BOX }, line: { color: C.DARK_BOX }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: c.x, y: 2.65, w: 0.08, h: 1.7,
      fill: { color: C.GOLD }, line: { color: C.GOLD }
    });
    s.addText(c.icon, {
      x: c.x + 0.2, y: 2.78, w: 0.5, h: 0.4,
      fontSize: 18, color: C.GOLD, align: "center", valign: "middle", margin: 0
    });
    s.addText(c.header, {
      x: c.x + 0.75, y: 2.76, w: 1.9, h: 0.38,
      fontSize: 12, color: C.GOLD, bold: true, valign: "middle", margin: 0
    });
    s.addText(c.body, {
      x: c.x + 0.2, y: 3.18, w: 2.45, h: 0.65,
      fontSize: 11, color: C.CREAM, valign: "top", margin: 0
    });
    // Tag
    s.addShape(pres.shapes.RECTANGLE, {
      x: c.x + 0.2, y: 3.9, w: 1.6, h: 0.3,
      fill: { color: c.tagBg }, line: { color: c.tagBg }
    });
    s.addText(c.tag, {
      x: c.x + 0.2, y: 3.9, w: 1.6, h: 0.3,
      fontSize: 10, color: c.tagFg, bold: true,
      align: "center", valign: "middle", margin: 0
    });
  });

  // Bottom note
  s.addText("นักเรียนเก่ามีโอกาสซื้อซ้ำสูงกว่า 5× เทียบกับลูกค้าใหม่ — และไม่ต้องใช้งบ Ads", {
    x: 0.5, y: 4.65, w: 9, h: 0.45,
    fontFace: "Calibri", fontSize: 12, color: C.CREAM,
    italic: true, align: "center", valign: "middle", margin: 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Analytics / Team Performance
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.CREAM };

  // Top dark band
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.65,
    fill: { color: C.PRIMARY_DARK }, line: { color: C.PRIMARY_DARK }
  });
  s.addText("Analytics ทีมงาน — รู้ว่าใครทำอะไรได้เท่าไร", {
    x: 0.4, y: 0.06, w: 9.2, h: 0.55,
    fontFace: "Georgia", fontSize: 20, color: C.CREAM,
    valign: "middle", margin: 0
  });

  // Bar chart
  s.addChart(pres.charts.BAR, [{
    name: "รายได้ (฿)",
    labels: ["Fafah", "Aoi", "Pornpol", "Admin"],
    values: [185000, 142000, 98000, 55000]
  }], {
    x: 0.4, y: 0.8, w: 5.5, h: 3.5,
    barDir: "col",
    chartColors: [C.GOLD, C.RED, C.GOLD, C.MUTED],
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelColor: C.PRIMARY_DARK,
    showLegend: false,
    chartArea: { fill: { color: C.WHITE }, roundedCorners: false },
    catAxisLabelColor: C.PRIMARY_DARK,
    valAxisLabelColor: C.PRIMARY_DARK,
    valGridLine: { color: C.LIGHT_GRAY, size: 0.5 },
    catGridLine: { style: "none" },
  });

  // Right metric cards
  const metrics = [
    { y: 0.8,  h: 0.75, big: "4.2 นาที",  label: "เวลาตอบเฉลี่ย" },
    { y: 1.65, h: 0.75, big: "34%",        label: "Conversion Rate ดีลที่ตอบเร็ว" },
    { y: 2.5,  h: 0.75, big: "฿8,750",    label: "AOV เฉลี่ยต่อออร์เดอร์" },
    { y: 3.35, h: 0.95, big: null, label: "ดู Dashboard ได้ real-time\nแยกตาม day/week/month\nไม่ต้องรอ report end of month" },
  ];
  metrics.forEach(m => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 6.3, y: m.y, w: 3.3, h: m.h,
      fill: { color: C.WHITE }, line: { color: C.WHITE }, shadow: makeShadow()
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 6.3, y: m.y, w: 0.07, h: m.h,
      fill: { color: C.GOLD }, line: { color: C.GOLD }
    });
    if (m.big) {
      s.addText(m.big, {
        x: 6.5, y: m.y + 0.03, w: 3.0, h: 0.38,
        fontSize: 18, color: C.PRIMARY_DARK, bold: true, valign: "middle", margin: 0
      });
      s.addText(m.label, {
        x: 6.5, y: m.y + 0.41, w: 3.0, h: 0.3,
        fontSize: 10, color: C.MUTED, valign: "middle", margin: 0
      });
    } else {
      s.addText(m.label, {
        x: 6.5, y: m.y + 0.05, w: 3.0, h: m.h - 0.1,
        fontSize: 11, color: C.PRIMARY_DARK, valign: "middle", margin: 0
      });
    }
  });

  // Bottom note
  s.addText("ผู้บริหารเห็นภาพรวมทีมแบบ real-time — ตัดสินใจได้เร็วขึ้น", {
    x: 0.5, y: 4.6, w: 9, h: 0.45,
    fontFace: "Calibri", fontSize: 12, color: C.MUTED,
    italic: true, align: "center", valign: "middle", margin: 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Summary / Closing
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.PRIMARY_DARK };

  // Top-right decorative gold bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 9.7, y: 0, w: 0.3, h: 5.625,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });

  // Title
  s.addText("V School CRM v2", {
    x: 0.5, y: 0.35, w: 9, h: 0.6,
    fontFace: "Georgia", fontSize: 34, color: C.GOLD,
    bold: true, align: "center", valign: "middle", margin: 0
  });
  s.addText("ทำให้ทุกบาทที่ลงทุนวัดผลได้", {
    x: 0.5, y: 0.98, w: 9, h: 0.45,
    fontFace: "Calibri", fontSize: 18, color: C.CREAM,
    align: "center", valign: "middle", margin: 0
  });

  // Summary checklist
  const checks = [
    "Ad Attribution → หยุดเผาเงินกับ Ad ที่ไม่ได้ผล",
    "Unified Inbox → ตอบเร็วขึ้น ปิดดีลได้เยอะขึ้น",
    "Package System → เพิ่ม AOV ได้ถึง 4×",
    "Lot Tracking → ลดของเสีย ลดต้นทุนวัตถุดิบ",
    "LINE Automation → Re-engage นักเรียนเก่าแบบ 0 Ads Cost",
  ];
  const checkYs = [1.6, 2.15, 2.7, 3.25, 3.8];
  checks.forEach((txt, i) => {
    s.addShape(pres.shapes.OVAL, {
      x: 1.5, y: checkYs[i], w: 0.35, h: 0.35,
      fill: { color: C.GOLD }, line: { color: C.GOLD }
    });
    s.addText("✓", {
      x: 1.5, y: checkYs[i], w: 0.35, h: 0.35,
      fontSize: 12, color: C.PRIMARY_DARK, bold: true,
      align: "center", valign: "middle", margin: 0
    });
    s.addText(txt, {
      x: 2.1, y: checkYs[i], w: 7.3, h: 0.38,
      fontSize: 13, color: C.CREAM, valign: "middle", margin: 0
    });
  });

  // Gold divider
  s.addShape(pres.shapes.RECTANGLE, {
    x: 1.5, y: 4.42, w: 7, h: 0.04,
    fill: { color: C.GOLD }, line: { color: C.GOLD }
  });

  // Footer
  s.addText("ระบบพร้อมใช้งาน — ข้อมูลทุกอย่างอยู่ในฐานข้อมูลของ V School เท่านั้น", {
    x: 0.5, y: 4.55, w: 9, h: 0.4,
    fontFace: "Calibri", fontSize: 11, color: C.MUTED,
    italic: true, align: "center", valign: "middle", margin: 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Write file
// ═══════════════════════════════════════════════════════════════════════════════
pres.writeFile({ fileName: "/Users/ideab/Desktop/crm/docs/vschool_crm_business_pitch.pptx" })
  .then(() => console.log("✅  Saved: vschool_crm_business_pitch.pptx"))
  .catch(err => { console.error("❌ Error:", err); process.exit(1); });
