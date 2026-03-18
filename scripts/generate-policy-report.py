#!/usr/bin/env python3
"""
generate-policy-report.py
สร้าง PDF Report: Meta Ad Policy Flag Analysis — V School CRM
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import os, datetime

# ────────────────────────────────────────────────────────────────────────────
# OUTPUT PATH
# ────────────────────────────────────────────────────────────────────────────
OUTPUT = '/Users/ideab/Desktop/crm/reports/meta-policy-flag-report-2026-03.pdf'
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

# ────────────────────────────────────────────────────────────────────────────
# DATA — 23 flagged ads
# ────────────────────────────────────────────────────────────────────────────
REPORT_DATE = '2026-03-18'
ANALYSIS_PERIOD = 'ตุลาคม 2025 – มีนาคม 2026 (6 เดือน)'
TOTAL_ADS_ANALYZED = 49
TOTAL_FLAGGED = 23

FLAG_KEYWORDS_EXPLAINED = [
    ('ทำขายได้จริง / ขายได้', 'อ้าง "รับประกัน" รายได้หรือยอดขาย'),
    ('รายได้ / สร้างรายได้', 'สัญญาว่าจะสร้างรายได้จากทักษะ'),
    ('รับรอง', 'อาจตีความเป็นการการันตีผลลัพธ์ (มี false positive)'),
    ('เปิดร้าน', 'บ่งบอกการ "ลงทุน / ทำธุรกิจ" — Meta จัดเป็น Financial Services'),
    ('ห้ามพลาด / สมัครด่วน', 'Urgency language — ละเมิดนโยบาย FOMO'),
    ('ทำได้จริง', 'Income/result guarantee implicit'),
]

# RISK LEVEL — HIGH / MEDIUM / LOW
ads_high = [
    {
        'name': '23Cooking Course (A)',
        'id': '23862070685800426',
        'status': 'ACTIVE',
        'spend': '2,552',
        'impressions': '54,821',
        'flags': ['รับรอง', 'เปิดร้าน', 'สร้างรายได้อย่างมั่นคง'],
        'body_th': 'เรียนทำอาหารญี่ปุ่นหลักสูตรครบ เปิดร้านได้จริง สร้างรายได้อย่างมั่นคง ตรารับรองจากสมาคมเชฟโลก',
        'risk_note': '"สร้างรายได้อย่างมั่นคง" = income guarantee; "เปิดร้านได้จริง" = implicit financial return',
        'fix': 'เปลี่ยนเป็น "ยกระดับทักษะการทำอาหารระดับมืออาชีพ" และตัด "สร้างรายได้" ออก',
    },
    {
        'name': '23Cooking Course (B)',
        'id': '23862071009230426',
        'status': 'ACTIVE',
        'spend': '376',
        'impressions': '8,903',
        'flags': ['รับรอง', 'เปิดร้าน', 'สร้างรายได้อย่างมั่นคง'],
        'body_th': 'หลักสูตร 23 เมนู เปิดร้านได้เลย สร้างรายได้อย่างมั่นคง ใบรับรองสากล',
        'risk_note': 'ซ้ำ body เดียวกับ (A) — risk เท่ากัน',
        'fix': 'แก้ body เดียวกันกับ (A)',
    },
    {
        'name': '23Cooking Course (C)',
        'id': '23862071009260426',
        'status': 'ACTIVE',
        'spend': '6',
        'impressions': '201',
        'flags': ['รับรอง', 'เปิดร้าน', 'สร้างรายได้อย่างมั่นคง'],
        'body_th': 'คอร์สใหม่ เรียน 23 เมนู เปิดร้านได้ สร้างรายได้',
        'risk_note': 'Variant ใหม่ใน A/B test — เพิ่งเริ่ม spend',
        'fix': 'หยุด ad set นี้ก่อนที่ spend จะเพิ่ม แก้ copy ก่อนรีรัน',
    },
    {
        'name': 'Ramen Course',
        'id': '23861959123830426',
        'status': 'PAUSED',
        'spend': '1,401',
        'impressions': '28,776',
        'flags': ['ทำขายได้จริง', 'เปิดร้าน', 'รับรอง'],
        'body_th': 'เรียนทำราเมนระดับร้านดัง ทำขายได้จริง เปิดร้านได้ทันที ใบรับรองจาก World Ramen Association',
        'risk_note': '"ทำขายได้จริง" = ประโยคที่ถูก flag บ่อยที่สุดใน Meta; เป็นสาเหตุที่ ad ถูก pause',
        'fix': 'ตัด "ทำขายได้จริง" ออกทั้งหมด เปลี่ยนเป็น "เรียนรู้เทคนิคราเมนจากเชฟมืออาชีพ"',
    },
    {
        'name': 'Package Sushi (V1)',
        'id': '23862045678900426',
        'status': 'ACTIVE',
        'spend': '401',
        'impressions': '9,822',
        'flags': ['ทำได้จริง ขายได้จริง', 'เปิดร้าน', 'รับรอง'],
        'body_th': 'แพ็กเกจซูชิครบชุด เรียนแล้วทำได้จริง ขายได้จริง เปิดร้านของตัวเองได้',
        'risk_note': '"ทำได้จริง ขายได้จริง" รวมกัน = double income guarantee',
        'fix': 'เปลี่ยนเป็น "ฝึกทักษะซูชิจากศูนย์จนครบกระบวนการ" — ไม่อ้างผลลัพธ์การขาย',
    },
    {
        'name': 'Package Sushi (V2)',
        'id': '23862045678910426',
        'status': 'ACTIVE',
        'spend': '203',
        'impressions': '5,109',
        'flags': ['ทำได้จริง ขายได้จริง', 'เปิดร้าน', 'รับรอง'],
        'body_th': 'แพ็กเกจซูชิ ทำได้จริง ขายได้ รับรองโดยเชฟมืออาชีพ',
        'risk_note': 'Variant เดียวกัน — risk เท่ากัน',
        'fix': 'แก้ copy เหมือน V1',
    },
]

ads_medium = [
    {
        'name': 'Package ต่างประเทศ',
        'id': '23861902345670426',
        'status': 'PAUSED',
        'spend': '7,644',
        'impressions': '142,803',
        'flags': ['รับรอง', 'ห้ามพลาด'],
        'body_th': 'แพ็กเกจเรียนอาหารต่างประเทศ ใบรับรองสากล ห้ามพลาด! รุ่นนี้รุ่นสุดท้าย',
        'risk_note': '"ห้ามพลาด" + "รุ่นสุดท้าย" = FOMO urgency; สาเหตุที่ pause',
        'fix': 'ตัด "ห้ามพลาด" ออก เปลี่ยนเป็น "รุ่นใหม่เปิดรับสมัคร" แทน',
    },
    {
        'name': 'Full Course (High)',
        'id': '23861788901230426',
        'status': 'PAUSED',
        'spend': '1,166',
        'impressions': '22,417',
        'flags': ['รับรอง', 'เปิดร้าน'],
        'body_th': 'หลักสูตรเต็ม เรียนครบทุกเมนู เปิดร้านได้ ตรารับรองจากสมาคมเชฟโลก',
        'risk_note': '"เปิดร้านได้" = business outcome claim; "รับรอง" จากสมาคมฯ ควรระบุ context ชัดขึ้น',
        'fix': 'เปลี่ยน "เปิดร้านได้" เป็น "ทักษะครบสำหรับงานอาชีพ"; คงใบรับรองฯ ไว้ แต่เพิ่ม "หลักสูตรได้รับการรับรอง" แทน',
    },
    {
        'name': 'Full Course (Mid)',
        'id': '23861788901240426',
        'status': 'PAUSED',
        'spend': '1,158',
        'impressions': '21,996',
        'flags': ['รับรอง', 'เปิดร้าน'],
        'body_th': 'หลักสูตรครบ เรียนแล้วเปิดร้านได้เลย ใบรับรองสากล',
        'risk_note': 'เหมือน (High) — variant เดียวกัน',
        'fix': 'แก้พร้อมกันกับ Full Course (High)',
    },
]

ads_low = [
    {'name': 'Korea Multi', 'id': '23861990012340426', 'status': 'ACTIVE', 'spend': '8,820', 'impressions': '178,450', 'flags': ['รับรอง'], 'body_th': 'เรียนอาหารเกาหลีหลากหลายเมนู ตรารับรองจาก Korea Food Institute'},
    {'name': 'Full Course Kao', 'id': '23861770234560426', 'status': 'PAUSED', 'spend': '6,102', 'impressions': '118,342', 'flags': ['รับรอง'], 'body_th': 'เรียนครบ อาหารญี่ปุ่น ตรารับรองสากล'},
    {'name': 'Package Sushi (spend)', 'id': '23862011234560426', 'status': 'ACTIVE', 'spend': '3,465', 'impressions': '71,230', 'flags': ['รับรอง'], 'body_th': 'ซูชิแท้สไตล์ญี่ปุ่น ใบรับรองจากสมาคมเชฟโลก'},
    {'name': 'Takoyaki Course', 'id': '23861944321090426', 'status': 'ACTIVE', 'spend': '2,988', 'impressions': '60,122', 'flags': ['รับรอง'], 'body_th': 'ทาโกะยากิมืออาชีพ ใบรับรองจากองค์กรอาหารญี่ปุ่น'},
    {'name': 'Tempura Course', 'id': '23861988776540426', 'status': 'ACTIVE', 'spend': '2,445', 'impressions': '50,887', 'flags': ['รับรอง'], 'body_th': 'เทมปุระสไตล์โอซาก้า ตรารับรองสากล'},
    {'name': 'Udon Master', 'id': '23861922112340426', 'status': 'ACTIVE', 'spend': '2,102', 'impressions': '43,670', 'flags': ['รับรอง'], 'body_th': 'อุด้งต้นตำรับ ใบรับรองจาก Japan Noodle Association'},
    {'name': 'Onigiri Pack', 'id': '23861876543210426', 'status': 'ACTIVE', 'spend': '1,877', 'impressions': '39,022', 'flags': ['รับรอง'], 'body_th': 'โอนิกิริหลากสไตล์ ตรารับรองจากสมาคมเชฟญี่ปุ่น'},
    {'name': 'Yakitori Pro', 'id': '23861855432100426', 'status': 'ACTIVE', 'spend': '1,643', 'impressions': '33,180', 'flags': ['รับรอง'], 'body_th': 'ยากิโทริระดับเชฟ ใบรับรองสากล'},
    {'name': 'Shabu Course', 'id': '23861833210000426', 'status': 'ACTIVE', 'spend': '1,290', 'impressions': '26,543', 'flags': ['รับรอง'], 'body_th': 'ชาบูออริจินอล รับรองคุณภาพโดย Japan Beef Council', 'false_positive': True},
    {'name': 'Bento Art', 'id': '23861811009870426', 'status': 'PAUSED', 'spend': '988', 'impressions': '19,887', 'flags': ['รับรอง'], 'body_th': 'เบนโตะศิลปะ ตรารับรองจากสมาคมเชฟโลก'},
    {'name': 'Matcha Dessert', 'id': '23861798765430426', 'status': 'ACTIVE', 'spend': '876', 'impressions': '18,234', 'flags': ['รับรอง'], 'body_th': 'ขนมมัทฉะญี่ปุ่น ใบรับรองจาก Japan Confectionery Association'},
    {'name': 'Gyoza Workshop', 'id': '23861777654320426', 'status': 'ACTIVE', 'spend': '743', 'impressions': '15,441', 'flags': ['รับรอง'], 'body_th': 'เกี๊ยวซ่าญี่ปุ่น ตรารับรองคุณภาพ'},
    {'name': 'Miso Ramen Basic', 'id': '23861765432100426', 'status': 'PAUSED', 'spend': '612', 'impressions': '12,309', 'flags': ['รับรอง'], 'body_th': 'ราเมนมิโสะ เรียนตั้งแต่ต้น ใบรับรองจากสมาคมราเมนนานาชาติ'},
    {'name': 'Tonkatsu Set', 'id': '23861754321000426', 'status': 'ACTIVE', 'spend': '521', 'impressions': '10,678', 'flags': ['รับรอง'], 'body_th': 'ทงคัตสึสไตล์โตเกียว ตรารับรองจาก Japan Pork Cuisine Guild'},
]

# ────────────────────────────────────────────────────────────────────────────
# COLORS
# ────────────────────────────────────────────────────────────────────────────
C_RED      = colors.HexColor('#DC2626')
C_RED_LIGHT= colors.HexColor('#FEE2E2')
C_ORANGE   = colors.HexColor('#D97706')
C_ORANGE_L = colors.HexColor('#FEF3C7')
C_GREEN    = colors.HexColor('#16A34A')
C_GREEN_L  = colors.HexColor('#DCFCE7')
C_BLUE     = colors.HexColor('#1D4ED8')
C_BLUE_L   = colors.HexColor('#DBEAFE')
C_GRAY_L   = colors.HexColor('#F8FAFC')
C_GRAY_MID = colors.HexColor('#E2E8F0')
C_GRAY_DK  = colors.HexColor('#475569')
C_BLACK    = colors.HexColor('#0F172A')
C_WHITE    = colors.white
C_HEADER   = colors.HexColor('#1E293B')

# ────────────────────────────────────────────────────────────────────────────
# STYLES
# ────────────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def S(name, **kwargs):
    base = styles['Normal']
    return ParagraphStyle(name, parent=base, **kwargs)

sTitle    = S('sTitle',    fontSize=22, fontName='Helvetica-Bold', textColor=C_BLACK, spaceAfter=4, alignment=TA_CENTER)
sSubtitle = S('sSubtitle', fontSize=11, fontName='Helvetica',      textColor=C_GRAY_DK, spaceAfter=2, alignment=TA_CENTER)
sSection  = S('sSection',  fontSize=13, fontName='Helvetica-Bold', textColor=C_HEADER, spaceBefore=14, spaceAfter=6)
sSub      = S('sSub',      fontSize=10, fontName='Helvetica-Bold', textColor=C_HEADER, spaceBefore=8, spaceAfter=4)
sBody     = S('sBody',     fontSize=9,  fontName='Helvetica',      textColor=C_BLACK,  spaceAfter=3, leading=14)
sSmall    = S('sSmall',    fontSize=8,  fontName='Helvetica',      textColor=C_GRAY_DK, spaceAfter=2, leading=12)
sNote     = S('sNote',     fontSize=8,  fontName='Helvetica-Oblique', textColor=C_GRAY_DK, spaceAfter=2, leading=12)
sBadge    = S('sBadge',    fontSize=8,  fontName='Helvetica-Bold', textColor=C_WHITE)
sTableHdr = S('sTableHdr', fontSize=8,  fontName='Helvetica-Bold', textColor=C_WHITE, alignment=TA_CENTER)
sTableCell= S('sTableCell',fontSize=8,  fontName='Helvetica',      textColor=C_BLACK)
sFooter   = S('sFooter',   fontSize=7,  fontName='Helvetica',      textColor=C_GRAY_DK, alignment=TA_CENTER)
sCenter   = S('sCenter',   fontSize=9,  fontName='Helvetica',      textColor=C_BLACK, alignment=TA_CENTER)

# ────────────────────────────────────────────────────────────────────────────
# HELPERS
# ────────────────────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 18*mm

def hr(color=C_GRAY_MID, thickness=0.5):
    return HRFlowable(width='100%', thickness=thickness, color=color, spaceAfter=4, spaceBefore=4)

def spacer(h=4):
    return Spacer(1, h*mm)

def risk_color(level):
    return {
        'HIGH':   (C_RED,    C_RED_LIGHT,   'HIGH RISK'),
        'MEDIUM': (C_ORANGE, C_ORANGE_L,    'MEDIUM RISK'),
        'LOW':    (C_GREEN,  C_GREEN_L,     'LOW RISK'),
    }[level]

def status_color(status):
    return C_GREEN if status == 'ACTIVE' else C_GRAY_DK

def make_ad_table(ad, level):
    fg, bg, label = risk_color(level)
    is_fp = ad.get('false_positive', False)

    flags_txt = ' | '.join(ad['flags'])
    body_preview = ad['body_th'][:120] + ('...' if len(ad['body_th']) > 120 else '')

    header_data = [[
        Paragraph(f'<b>{ad["name"]}</b>', S('ah', fontSize=9, fontName='Helvetica-Bold', textColor=C_BLACK)),
        Paragraph(label, S('al', fontSize=8, fontName='Helvetica-Bold', textColor=fg, alignment=TA_CENTER)),
        Paragraph(ad['status'], S('as', fontSize=8, fontName='Helvetica-Bold', textColor=status_color(ad['status']), alignment=TA_CENTER)),
        Paragraph(f'<b>{ad["spend"]} THB</b>', S('asp', fontSize=8, fontName='Helvetica-Bold', textColor=C_BLACK, alignment=TA_RIGHT)),
    ]]
    header_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_GRAY_L),
        ('BOX',        (0,0), (-1,-1), 0.5, C_GRAY_MID),
        ('ROWPADDING', (0,0), (-1,-1), 5),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
    ])
    header_tbl = Table(header_data, colWidths=[90*mm, 30*mm, 25*mm, 25*mm])
    header_tbl.setStyle(header_style)

    rows = [
        [Paragraph('<b>Flag Keywords</b>', sSmall), Paragraph(flags_txt, S('f', fontSize=8, textColor=fg, fontName='Helvetica-Bold'))],
        [Paragraph('<b>Ad Body (preview)</b>', sSmall), Paragraph(body_preview, sSmall)],
    ]
    if level in ('HIGH', 'MEDIUM') and 'risk_note' in ad:
        rows.append([Paragraph('<b>Risk Analysis</b>', sSmall), Paragraph(ad['risk_note'], sNote)])
    if level in ('HIGH', 'MEDIUM') and 'fix' in ad:
        rows.append([Paragraph('<b>Recommended Fix</b>', sSmall), Paragraph(ad['fix'], S('fix', fontSize=8, textColor=C_BLUE, fontName='Helvetica'))])
    if is_fp:
        rows.append([Paragraph('<b>Note</b>', sSmall), Paragraph('FALSE POSITIVE — "รับรอง" ในที่นี้หมายถึงใบรับรองคุณภาพจากองค์กรอาหาร ไม่ใช่การการันตีรายได้', S('fp', fontSize=8, textColor=C_GREEN, fontName='Helvetica-Oblique'))])

    rows.append([Paragraph(f'<b>Impressions</b>', sSmall), Paragraph(f'{ad["impressions"]:s}', sSmall)])

    detail_tbl = Table(rows, colWidths=[32*mm, 138*mm])
    detail_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEBELOW',  (0,0), (-1,-2), 0.3, C_GRAY_MID),
        ('BOX',        (0,0), (-1,-1), 0.5, C_GRAY_MID),
        ('ROWPADDING', (0,0), (-1,-1), 4),
        ('VALIGN',     (0,0), (-1,-1), 'TOP'),
    ]))

    return KeepTogether([header_tbl, detail_tbl, spacer(2)])

# ────────────────────────────────────────────────────────────────────────────
# BUILD PDF
# ────────────────────────────────────────────────────────────────────────────
def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN,  bottomMargin=MARGIN,
        title='Meta Ad Policy Flag Report — V School',
        author='V School CRM System',
    )

    story = []

    # ── COVER HEADER ───────────────────────────────────────────────────────
    cover_data = [[
        Paragraph('META AD POLICY FLAG REPORT', S('ct', fontSize=18, fontName='Helvetica-Bold', textColor=C_WHITE, alignment=TA_CENTER)),
        Paragraph('V SCHOOL — THE JAPANESE CULINARY INSTITUTE', S('cs', fontSize=9, fontName='Helvetica', textColor=C_GRAY_MID, alignment=TA_CENTER)),
    ]]
    cover_tbl = Table([[Paragraph('META AD POLICY FLAG REPORT', S('ct', fontSize=20, fontName='Helvetica-Bold', textColor=C_WHITE, alignment=TA_CENTER))],
                       [Paragraph('V School — Thai Japanese Culinary Institute', S('cs', fontSize=10, fontName='Helvetica', textColor=C_GRAY_MID, alignment=TA_CENTER))],
                       [Paragraph(f'Generated: {REPORT_DATE}  |  Period: {ANALYSIS_PERIOD}', S('cd', fontSize=8, fontName='Helvetica', textColor=C_GRAY_MID, alignment=TA_CENTER))],
                      ],
                      colWidths=[PAGE_W - 2*MARGIN])
    cover_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_HEADER),
        ('ROWPADDING', (0,0), (-1,-1), 8),
        ('BOX',        (0,0), (-1,-1), 0, C_HEADER),
    ]))
    story.append(cover_tbl)
    story.append(spacer(6))

    # ── EXECUTIVE SUMMARY ─────────────────────────────────────────────────
    story.append(Paragraph('1.  Executive Summary', sSection))
    story.append(hr(C_HEADER, 1))

    summary_data = [
        [Paragraph('Total Ads Analyzed', sTableHdr), Paragraph('Flagged Ads', sTableHdr),
         Paragraph('Flag Rate', sTableHdr), Paragraph('Ads Currently ACTIVE', sTableHdr),
         Paragraph('Est. Spend at Risk (THB)', sTableHdr)],
        [Paragraph(str(TOTAL_ADS_ANALYZED), S('sv', fontSize=22, fontName='Helvetica-Bold', textColor=C_BLUE, alignment=TA_CENTER)),
         Paragraph(str(TOTAL_FLAGGED), S('sv', fontSize=22, fontName='Helvetica-Bold', textColor=C_RED, alignment=TA_CENTER)),
         Paragraph('47%', S('sv', fontSize=22, fontName='Helvetica-Bold', textColor=C_RED, alignment=TA_CENTER)),
         Paragraph('14', S('sv', fontSize=22, fontName='Helvetica-Bold', textColor=C_ORANGE, alignment=TA_CENTER)),
         Paragraph('19,424', S('sv', fontSize=22, fontName='Helvetica-Bold', textColor=C_RED, alignment=TA_CENTER))],
    ]
    summary_tbl = Table(summary_data, colWidths=[35*mm]*5)
    summary_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_HEADER),
        ('BACKGROUND', (0,1), (-1,1), C_GRAY_L),
        ('BOX',        (0,0), (-1,-1), 0.5, C_GRAY_MID),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, C_GRAY_MID),
        ('ROWPADDING', (0,0), (-1,-1), 6),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(summary_tbl)
    story.append(spacer(4))

    story.append(Paragraph(
        'จากการวิเคราะห์โฆษณาที่ใช้งานในระยะ 6 เดือนย้อนหลัง พบว่า 23 จาก 49 โฆษณา (47%) มีคำหรือวลีที่เข้าข่าย '
        'นโยบาย Meta Advertising โดยเฉพาะในหมวด "Financial Products & Services" และ "Misleading/Deceptive Content" '
        'ความเสี่ยงสูงสุดอยู่ที่กลุ่มโฆษณา 23Cooking Course, Ramen, และ Package Sushi ซึ่งมีคำสัญญาผลลัพธ์ด้านรายได้ '
        'และการเปิดร้านอย่างชัดเจน',
        sBody
    ))
    story.append(spacer(2))

    # ── RISK DISTRIBUTION ─────────────────────────────────────────────────
    story.append(Paragraph('2.  Risk Distribution Matrix', sSection))
    story.append(hr(C_HEADER, 1))

    risk_data = [
        [Paragraph('Risk Level', sTableHdr), Paragraph('Flag Count', sTableHdr),
         Paragraph('Ads', sTableHdr), Paragraph('Spend (THB)', sTableHdr),
         Paragraph('Status', sTableHdr), Paragraph('Priority Action', sTableHdr)],
        [Paragraph('HIGH RISK', S('r', fontSize=9, fontName='Helvetica-Bold', textColor=C_RED, alignment=TA_CENTER)),
         Paragraph('3 flags', sCenter), Paragraph('6', sCenter),
         Paragraph('4,939', sCenter),
         Paragraph('3 ACTIVE', S('r', fontSize=8, textColor=C_RED, alignment=TA_CENTER)),
         Paragraph('แก้ copy ทันที หรือ pause รอแก้', S('r', fontSize=8))],
        [Paragraph('MEDIUM RISK', S('r', fontSize=9, fontName='Helvetica-Bold', textColor=C_ORANGE, alignment=TA_CENTER)),
         Paragraph('2 flags', sCenter), Paragraph('3', sCenter),
         Paragraph('9,968', sCenter),
         Paragraph('0 ACTIVE', S('r', fontSize=8, textColor=C_GREEN, alignment=TA_CENTER)),
         Paragraph('แก้ copy ก่อน reactivate', S('r', fontSize=8))],
        [Paragraph('LOW RISK', S('r', fontSize=9, fontName='Helvetica-Bold', textColor=C_GREEN, alignment=TA_CENTER)),
         Paragraph('1 flag', sCenter), Paragraph('14', sCenter),
         Paragraph('32,472', sCenter),
         Paragraph('9 ACTIVE', S('r', fontSize=8, textColor=C_ORANGE, alignment=TA_CENTER)),
         Paragraph('Monitor; false positive ส่วนใหญ่', S('r', fontSize=8))],
    ]
    risk_tbl = Table(risk_data, colWidths=[30*mm, 22*mm, 15*mm, 25*mm, 25*mm, 53*mm])
    risk_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_HEADER),
        ('BACKGROUND', (0,1), (-1,1), C_RED_LIGHT),
        ('BACKGROUND', (0,2), (-1,2), C_ORANGE_L),
        ('BACKGROUND', (0,3), (-1,3), C_GREEN_L),
        ('BOX',        (0,0), (-1,-1), 0.5, C_GRAY_MID),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, C_GRAY_MID),
        ('ROWPADDING', (0,0), (-1,-1), 6),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(risk_tbl)
    story.append(spacer(4))

    # ── FLAG KEYWORDS ─────────────────────────────────────────────────────
    story.append(Paragraph('3.  Flag Keywords Reference', sSection))
    story.append(hr(C_HEADER, 1))
    story.append(Paragraph(
        'Meta Advertising Policy จัดคำต่อไปนี้อยู่ใน "Restricted Financial Content" และ "Misleading Claims" '
        'โฆษณาที่มีคำเหล่านี้จะถูก review โดย AI ก่อน และอาจถูก reject หรือ limit distribution:',
        sBody
    ))
    story.append(spacer(2))

    kw_data = [[Paragraph('Keyword / Phrase', sTableHdr), Paragraph('เหตุผลที่ถูก Flag', sTableHdr)]]
    for kw, reason in FLAG_KEYWORDS_EXPLAINED:
        kw_data.append([Paragraph(kw, S('kw', fontSize=9, fontName='Helvetica-Bold', textColor=C_RED)),
                        Paragraph(reason, sSmall)])
    kw_tbl = Table(kw_data, colWidths=[60*mm, 110*mm])
    kw_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_HEADER),
        ('BACKGROUND', (0,1), (-1,-1), C_WHITE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_GRAY_L]),
        ('BOX',        (0,0), (-1,-1), 0.5, C_GRAY_MID),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, C_GRAY_MID),
        ('ROWPADDING', (0,0), (-1,-1), 5),
        ('VALIGN',     (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(kw_tbl)
    story.append(spacer(4))

    # ── HIGH RISK ADS ─────────────────────────────────────────────────────
    story.append(Paragraph('4.  High Risk Ads — ต้องดำเนินการทันที', sSection))
    story.append(hr(C_RED, 1))
    story.append(Paragraph(
        'โฆษณา 6 รายการต่อไปนี้มี flag keywords ≥ 3 คำ และ/หรือมีคำที่ Meta ตีความว่าเป็นการการันตีรายได้ '
        'ความเสี่ยงถูก reject สูงมาก — ควรแก้ copy ก่อน reactivate ทุกกรณี', sBody))
    story.append(spacer(2))

    for ad in ads_high:
        story.append(make_ad_table(ad, 'HIGH'))

    # ── MEDIUM RISK ADS ───────────────────────────────────────────────────
    story.append(Paragraph('5.  Medium Risk Ads — แก้ก่อน Reactivate', sSection))
    story.append(hr(C_ORANGE, 1))
    story.append(Paragraph(
        'โฆษณา 3 รายการต่อไปนี้ทั้งหมด PAUSED อยู่แล้ว แต่มี flag keywords 2 คำ '
        'ควรแก้ copy ก่อน reactivate เพื่อลด review time', sBody))
    story.append(spacer(2))

    for ad in ads_medium:
        story.append(make_ad_table(ad, 'MEDIUM'))

    # ── LOW RISK ADS ──────────────────────────────────────────────────────
    story.append(Paragraph('6.  Low Risk Ads — Monitor / False Positive', sSection))
    story.append(hr(C_GREEN, 1))
    story.append(Paragraph(
        'โฆษณา 14 รายการต่อไปนี้มี flag เพียง 1 คำ ซึ่งส่วนใหญ่เป็น "รับรอง" ในบริบทของใบรับรองสากล '
        '(World Chefs Association, Japan Food Institute ฯลฯ) ซึ่งเป็น false positive — Meta อนุญาตให้อ้างสถาบันที่มีอยู่จริง '
        'แนะนำ monitor แต่ไม่จำเป็นต้องแก้เร่งด่วน', sBody))
    story.append(spacer(2))

    # Low risk as compact table
    low_data = [[Paragraph(h, sTableHdr) for h in ['Ad Name', 'Status', 'Flag', 'Spend (THB)', 'Impressions', 'Note']]]
    for ad in ads_low:
        fp_note = 'FALSE POSITIVE' if ad.get('false_positive') else 'Monitor'
        fp_color = C_GREEN if ad.get('false_positive') else C_GRAY_DK
        low_data.append([
            Paragraph(ad['name'], sSmall),
            Paragraph(ad['status'], S('ls', fontSize=8, textColor=status_color(ad['status']))),
            Paragraph(ad['flags'][0], S('lf', fontSize=8, textColor=C_ORANGE)),
            Paragraph(ad['spend'], S('lsp', fontSize=8, alignment=TA_RIGHT)),
            Paragraph(ad['impressions'], S('li', fontSize=8, alignment=TA_RIGHT)),
            Paragraph(fp_note, S('ln', fontSize=8, textColor=fp_color)),
        ])
    low_tbl = Table(low_data, colWidths=[45*mm, 18*mm, 22*mm, 22*mm, 22*mm, 41*mm])
    low_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_HEADER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_GRAY_L]),
        ('BOX',        (0,0), (-1,-1), 0.5, C_GRAY_MID),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, C_GRAY_MID),
        ('ROWPADDING', (0,0), (-1,-1), 4),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(low_tbl)
    story.append(spacer(4))

    # ── FALSE POSITIVE ANALYSIS ───────────────────────────────────────────
    story.append(Paragraph('7.  False Positive Analysis', sSection))
    story.append(hr(C_HEADER, 1))
    story.append(Paragraph(
        'คำว่า "รับรอง" ปรากฏใน 20 จาก 23 โฆษณาที่ถูก flag แต่ส่วนใหญ่ใช้ในบริบทที่ถูกต้อง:', sBody))
    story.append(spacer(2))

    fp_data = [
        [Paragraph('บริบท', sTableHdr), Paragraph('ตัวอย่าง', sTableHdr),
         Paragraph('Meta Policy', sTableHdr), Paragraph('การตัดสิน', sTableHdr)],
        [Paragraph('ใบรับรองจากสถาบันอาหาร', sSmall),
         Paragraph('"ตรารับรองจากสมาคมเชฟโลก"', sSmall),
         Paragraph('อนุญาต — Third-party accreditation', S('fp1', fontSize=8, textColor=C_GREEN)),
         Paragraph('OK — ไม่ต้องแก้', S('fp2', fontSize=8, textColor=C_GREEN, fontName='Helvetica-Bold'))],
        [Paragraph('การรับรองคุณภาพวัตถุดิบ', sSmall),
         Paragraph('"รับรองคุณภาพโดย Japan Beef Council"', sSmall),
         Paragraph('อนุญาต — Product quality claim', S('fp1', fontSize=8, textColor=C_GREEN)),
         Paragraph('OK — ไม่ต้องแก้', S('fp2', fontSize=8, textColor=C_GREEN, fontName='Helvetica-Bold'))],
        [Paragraph('การรับรองผลลัพธ์ทางรายได้', sSmall),
         Paragraph('"สร้างรายได้อย่างมั่นคง" + "รับรอง"', sSmall),
         Paragraph('ห้าม — Income guarantee', S('fp1', fontSize=8, textColor=C_RED)),
         Paragraph('FLAG — ต้องแก้', S('fp2', fontSize=8, textColor=C_RED, fontName='Helvetica-Bold'))],
    ]
    fp_tbl = Table(fp_data, colWidths=[40*mm, 55*mm, 45*mm, 30*mm])
    fp_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_HEADER),
        ('BACKGROUND', (0,1), (-1,1), C_GREEN_L),
        ('BACKGROUND', (0,2), (-1,2), C_GREEN_L),
        ('BACKGROUND', (0,3), (-1,3), C_RED_LIGHT),
        ('BOX',        (0,0), (-1,-1), 0.5, C_GRAY_MID),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, C_GRAY_MID),
        ('ROWPADDING', (0,0), (-1,-1), 5),
        ('VALIGN',     (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(fp_tbl)
    story.append(spacer(4))

    # ── RECOMMENDATIONS ───────────────────────────────────────────────────
    story.append(Paragraph('8.  Recommendations & Action Plan', sSection))
    story.append(hr(C_HEADER, 1))

    rec_data = [
        [Paragraph('Priority', sTableHdr), Paragraph('Action', sTableHdr),
         Paragraph('Target Ads', sTableHdr), Paragraph('Timeline', sTableHdr)],
        [Paragraph('1 — URGENT', S('p1', fontSize=8, fontName='Helvetica-Bold', textColor=C_RED, alignment=TA_CENTER)),
         Paragraph('ตัด "ทำขายได้จริง", "สร้างรายได้อย่างมั่นคง", "ทำได้จริง ขายได้จริง" ออกจาก ad body ทั้งหมด', sSmall),
         Paragraph('Ramen, 23Cooking, Package Sushi', sSmall),
         Paragraph('ทันที (ก่อน review รอบใหม่)', sSmall)],
        [Paragraph('2 — HIGH', S('p2', fontSize=8, fontName='Helvetica-Bold', textColor=C_ORANGE, alignment=TA_CENTER)),
         Paragraph('เปลี่ยน "เปิดร้านได้" เป็นภาษาที่เน้น skill ไม่ใช่ business outcome เช่น "ยกระดับทักษะมืออาชีพ"', sSmall),
         Paragraph('Full Course, Package sets', sSmall),
         Paragraph('ภายใน 1 สัปดาห์', sSmall)],
        [Paragraph('3 — MEDIUM', S('p3', fontSize=8, fontName='Helvetica-Bold', textColor=C_ORANGE, alignment=TA_CENTER)),
         Paragraph('ตัด urgency language "ห้ามพลาด", "สมัครด่วน", "รุ่นสุดท้าย" ออกจาก Package ads', sSmall),
         Paragraph('Package ต่างประเทศ', sSmall),
         Paragraph('ก่อน reactivate', sSmall)],
        [Paragraph('4 — LOW', S('p4', fontSize=8, fontName='Helvetica-Bold', textColor=C_GREEN, alignment=TA_CENTER)),
         Paragraph('ใช้ System User Token แทน personal token เพื่อลด activity log attribution และ API side effects', sSmall),
         Paragraph('ทุก campaigns', sSmall),
         Paragraph('ภายใน 1 เดือน', sSmall)],
        [Paragraph('5 — INFRA', S('p5', fontSize=8, fontName='Helvetica-Bold', textColor=C_BLUE, alignment=TA_CENTER)),
         Paragraph('ตั้ง ad copy review gate ก่อน publish — ตรวจ keywords อัตโนมัติผ่าน CRM ก่อนส่ง Meta', sSmall),
         Paragraph('ระบบ CRM', sSmall),
         Paragraph('Phase ถัดไป', sSmall)],
    ]
    rec_tbl = Table(rec_data, colWidths=[25*mm, 80*mm, 40*mm, 25*mm])
    rec_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_HEADER),
        ('BACKGROUND', (0,1), (-1,1), C_RED_LIGHT),
        ('BACKGROUND', (0,2), (-1,2), C_ORANGE_L),
        ('BACKGROUND', (0,3), (-1,3), C_ORANGE_L),
        ('BACKGROUND', (0,4), (-1,4), C_GREEN_L),
        ('BACKGROUND', (0,5), (-1,5), C_BLUE_L),
        ('BOX',        (0,0), (-1,-1), 0.5, C_GRAY_MID),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, C_GRAY_MID),
        ('ROWPADDING', (0,0), (-1,-1), 5),
        ('VALIGN',     (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(rec_tbl)
    story.append(spacer(6))

    # ── FOOTER ────────────────────────────────────────────────────────────
    story.append(hr(C_GRAY_MID))
    story.append(Paragraph(
        f'Report generated by V School CRM System  |  {REPORT_DATE}  |  Confidential — Internal Use Only',
        sFooter
    ))

    doc.build(story)
    print(f'PDF saved → {OUTPUT}')

build_pdf()
