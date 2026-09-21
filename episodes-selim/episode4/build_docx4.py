#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build custom RTL docx for the Islamic-education homework episode."""
import sys
sys.path.insert(0, '/home/user/selim_table3')

from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

from build_docx_generic import (add_par, cell_text, shade_cell, GREEN, DARK, GRAY)

BLUE = RGBColor(0x1F, 0x4E, 0x79)


def two_col_table(doc, header_right, header_left, rows, fill='E8F0FE'):
    table = doc.add_table(rows=len(rows) + 1, cols=2)
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.RIGHT
    cell_text(table.rows[0].cells[1], header_right, size=14, bold=True)
    cell_text(table.rows[0].cells[0], header_left, size=14, bold=True)
    shade_cell(table.rows[0].cells[0], fill)
    shade_cell(table.rows[0].cells[1], fill)
    for i, (r, l) in enumerate(rows, start=1):
        cell_text(table.rows[i].cells[1], r, size=13)
        cell_text(table.rows[i].cells[0], l, size=13, bold=True, color=BLUE)
    return table


def main():
    doc = Document()
    style = doc.styles['Normal']
    style.font.name = 'Arial'
    style.font.size = Pt(14)

    src = '/home/user/selim_table3/episode4/script_doc4.txt'
    with open(src, encoding='utf-8') as f:
        lines = [ln.rstrip('\n') for ln in f]

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('# '):
            t = add_par(doc, line[2:], size=20, bold=True, color=GREEN, space_after=10)
            t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif line.startswith('## '):
            add_par(doc, line[3:], size=16, bold=True, color=GREEN, space_after=6)
        elif line.startswith('ملاحظة') or line.startswith('الحلقة'):
            add_par(doc, line, size=12, color=GRAY, space_after=12)
        else:
            add_par(doc, line, size=14, space_after=10)

    # ---- أركان الإيمان table ----
    add_par(doc, '')
    add_par(doc, 'ملخص التثبيت: أركان الإيمان الستة', size=16, bold=True, color=GREEN, space_after=8)
    two_col_table(doc, 'الركن (العمود)', 'التثبيت بمثال', [
        ('١. الإيمان بالله تعالى', 'نعبده وحده ونحبه، وهو خالق كل شيء'),
        ('٢. الإيمان بالملائكة', 'الكرام الكاتبين على كتوفنا يسجلون أعمالنا'),
        ('٣. الإيمان بالكتب', 'القرآن الكريم كتابنا، وقبله التوراة والإنجيل والزبور'),
        ('٤. الإيمان بالرسل', 'من آدم إلى محمد ﷺ خاتم الرسل'),
        ('٥. الإيمان باليوم الآخر', 'يوم الجزاء: المحسن إلى الجنة'),
        ('٦. الإيمان بالقدر خيره وشره', 'كل شيء بعلم الله وحكمته من قبل حدوثه'),
    ])

    # ---- مقارنة ----
    add_par(doc, '')
    add_par(doc, 'الفرق المهم: أركان الإيمان × أركان الإسلام', size=16, bold=True, color=GREEN, space_after=8)
    two_col_table(doc, 'أركان الإيمان (٦ — نصدقها بقلوبنا)', 'أركان الإسلام (٥ — نعملها بجوارحنا)', [
        ('الإيمان بالله', 'الشهادتان'),
        ('الإيمان بالملائكة', 'إقام الصلاة'),
        ('الإيمان بالكتب', 'إيتاء الزكاة'),
        ('الإيمان بالرسل', 'صوم رمضان'),
        ('الإيمان باليوم الآخر', 'حج البيت لمن استطاع إليه سبيلا'),
        ('الإيمان بالقدر خيره وشره', '—'),
    ], fill='FFF3D9')

    # ---- حل الواجب ----
    add_par(doc, '')
    add_par(doc, 'حل الواجب — ملخص سريع لسليم', size=16, bold=True, color=GREEN, space_after=8)

    add_par(doc, 'نشاط (٤) اختيار الإجابة الصحيحة:', size=14, bold=True, color=BLUE, space_after=4)
    two_col_table(doc, 'السؤال', 'الإجابة الصحيحة', [
        ('١. عدد أركان الإيمان', '(ب) ستة'),
        ('٢. ركن لا يُعتبر من أركان الإيمان', '(ج) حج البيت — لأنه من أركان الإسلام'),
        ('٣. من أركان الإيمان', '(ج) الإيمان بالقدر خيره وشره'),
        ('٤. الإيمان يجعل المسلم', '(أ) ثابتًا أمام الشدائد'),
    ], fill='E7F4EA')

    add_par(doc, '')
    add_par(doc, 'نشاط (٣) اكتُب — ثمار الإيمان بالله تعالى (نموذج إجابة):', size=14, bold=True, color=BLUE, space_after=4)
    add_par(doc, 'رضا الله تعالى — الطمأنينة وراحة القلب — الثبات أمام الشدائد — حسن الخلق والأمانة.', size=14, color=DARK, space_after=8)

    add_par(doc, 'نشاط (٢) التصنيف:', size=14, bold=True, color=BLUE, space_after=4)
    add_par(doc, 'أركان الإيمان: الإيمان بالله — الإيمان باليوم الآخر — الإيمان بالرسل.', size=13, space_after=2)
    add_par(doc, 'أركان الإسلام: الصوم — الحج — الزكاة.', size=13, space_after=8)

    add_par(doc, 'نشاط (٥) أركان الإيمان المذكورة في الآية (البقرة ٢٨٥):', size=14, bold=True, color=BLUE, space_after=4)
    add_par(doc, 'الإيمان بالله — الإيمان بالملائكة — الإيمان بالكتب — الإيمان بالرسل.', size=14, space_after=8)

    # ---- tips ----
    add_par(doc, '')
    add_par(doc, 'نصايح سريعة للأهل', size=16, bold=True, color=GREEN, space_after=6)
    tips = [
        '• الليلة على السفرة: نفّذوا نشاط «شارك أسرتك» — اطلبوا من سليم يحكي معنى الإيمان وأركانه وثماره، واسمعوا منه بفخر.',
        '• كرمة تحفظ أسماء الأركان الستة فقط كترديد — فهم المعاني يأتي في وقتها، لا تضغطوا.',
        '• علّقوا ورقة الأعمدة الستة في أوضة الأولاد — العين التي ترى تساعد القلب الذي يصدق.',
        '• لو سليم حل الواجب صح كله، كافئوه بنجمة حقيقية على البيت الجديد!',
    ]
    for tip in tips:
        add_par(doc, tip, size=13, color=DARK, space_after=4)

    out = '/home/user/selim_table3/سكريبت_واجب_الدين_أركان_الإيمان.docx'
    doc.save(out)
    print('saved:', out)


if __name__ == '__main__':
    main()
