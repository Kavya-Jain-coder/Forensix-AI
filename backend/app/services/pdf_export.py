from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, HRFlowable, KeepTogether)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from io import BytesIO
from datetime import datetime


DARK = colors.HexColor("#1a2332")
ACCENT = colors.HexColor("#1e6fa8")
LIGHT_GREY = colors.HexColor("#f5f5f5")
MID_GREY = colors.HexColor("#cccccc")
RED = colors.HexColor("#c0392b")
GREEN = colors.HexColor("#27ae60")
ORANGE = colors.HexColor("#e67e22")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16,
                                textColor=DARK, spaceAfter=4, alignment=TA_CENTER),
        "classification": ParagraphStyle("classification", fontName="Helvetica-Bold", fontSize=9,
                                         textColor=colors.white, spaceAfter=2, alignment=TA_CENTER),
        "section": ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=10,
                                  textColor=ACCENT, spaceBefore=10, spaceAfter=4,
                                  borderPad=2),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9,
                               textColor=DARK, spaceAfter=4, leading=14, alignment=TA_JUSTIFY),
        "mono": ParagraphStyle("mono", fontName="Courier", fontSize=8,
                               textColor=colors.HexColor("#333333"), spaceAfter=2),
        "label": ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=8,
                                textColor=colors.HexColor("#555555"), spaceAfter=1),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8,
                                textColor=colors.HexColor("#666666"), spaceAfter=2),
        "italic": ParagraphStyle("italic", fontName="Helvetica-Oblique", fontSize=9,
                                 textColor=DARK, spaceAfter=4, leading=14, alignment=TA_JUSTIFY),
    }


def generate_pdf(report, report_data: dict, case, reviewer) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=20*mm,
        title=report.report_number,
    )
    s = _styles()
    story = []
    W = A4[0] - 40*mm

    def section_header(text):
        story.append(Spacer(1, 4*mm))
        story.append(Table(
            [[Paragraph(text.upper(), s["section"])]],
            colWidths=[W],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eaf3fb")),
                ("LINEBELOW", (0, 0), (-1, -1), 1, ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        ))
        story.append(Spacer(1, 2*mm))

    def kv_table(rows):
        data = [[Paragraph(k, s["label"]), Paragraph(str(v or "—"), s["body"])] for k, v in rows]
        story.append(Table(data, colWidths=[50*mm, W - 50*mm],
            style=TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.3, MID_GREY),
                ("BACKGROUND", (0, 0), (0, -1), LIGHT_GREY),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        ))

    # ── Classification Banner ──
    story.append(Table(
        [[Paragraph(report_data.get("classification", "OFFICIAL — FORENSIC SCIENCE LABORATORY REPORT"), s["classification"])]],
        colWidths=[W],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), DARK),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    ))
    story.append(Spacer(1, 4*mm))

    # ── Title ──
    story.append(Paragraph("FORENSIC SCIENCE LABORATORY REPORT", s["title"]))
    story.append(Spacer(1, 2*mm))
    story.append(HRFlowable(width=W, thickness=2, color=ACCENT))
    story.append(Spacer(1, 4*mm))

    # ── Report Metadata ──
    section_header("Report Information")
    kv_table([
        ("Report Number", report.report_number),
        ("Laboratory Reference", report_data.get("laboratory_reference", "")),
        ("Date of Examination", report.date_of_examination or ""),
        ("Date of Report", report_data.get("date_of_report", datetime.utcnow().strftime("%d %B %Y"))),
        ("Officer in Charge", report.officer_in_charge or ""),
        ("Submitted By", report.submitted_by or ""),
        ("Case Number", case.case_number if case else ""),
        ("Case Title", case.title if case else ""),
        ("Report Status", report.status.value.upper().replace("_", " ")),
        ("Confidence Score", f"{report.confidence_score:.1f}%" if report.confidence_score else "N/A"),
    ])

    # ── Background ──
    if report_data.get("background"):
        section_header("Background")
        story.append(Paragraph(report_data["background"], s["body"]))

    # ── Scope ──
    if report_data.get("scope_of_examination"):
        section_header("Scope of Examination")
        story.append(Paragraph(report_data["scope_of_examination"], s["body"]))

    # ── Exhibits ──
    exhibits = report_data.get("exhibits", [])
    if exhibits:
        section_header(f"Exhibits Examined ({len(exhibits)})")
        ex_data = [["Exhibit Ref", "Description", "Condition", "Examination Type"]]
        for ex in exhibits:
            ex_data.append([
                Paragraph(ex.get("exhibit_ref", ""), s["mono"]),
                Paragraph(ex.get("description", ""), s["small"]),
                Paragraph(ex.get("condition_on_receipt", ""), s["small"]),
                Paragraph(ex.get("examination_type", ""), s["small"]),
            ])
        story.append(Table(ex_data, colWidths=[25*mm, W*0.42, 25*mm, W*0.22],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("GRID", (0, 0), (-1, -1), 0.3, MID_GREY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        ))

    # ── SHA-256 Evidence Integrity ──
    hashes = report_data.get("evidence_hashes", [])
    if hashes:
        section_header("Evidence Integrity — SHA-256 Hashes")
        hash_data = [["Exhibit Ref", "Filename", "SHA-256 Hash", "Size"]]
        for h in hashes:
            hash_data.append([
                Paragraph(h.get("exhibit_ref", ""), s["mono"]),
                Paragraph(h.get("filename", ""), s["small"]),
                Paragraph(h.get("sha256", ""), ParagraphStyle("hash", fontName="Courier", fontSize=7, textColor=DARK)),
                Paragraph(f"{h.get('size_bytes', 0):,} B", s["small"]),
            ])
        story.append(Table(hash_data, colWidths=[22*mm, 35*mm, W*0.48, 20*mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("GRID", (0, 0), (-1, -1), 0.3, MID_GREY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        ))
        story.append(Paragraph(
            "The SHA-256 hashes above were computed at the time of evidence upload and serve as a cryptographic "
            "integrity check. Any modification to the original files will result in a different hash value.",
            s["small"]
        ))

    # ── Examination Narrative ──
    if report_data.get("examination_narrative"):
        section_header("Examination")
        for para in report_data["examination_narrative"].split("\n"):
            if para.strip():
                story.append(Paragraph(para.strip(), s["body"]))
                story.append(Spacer(1, 2*mm))

    # ── Key Findings ──
    findings = report_data.get("key_findings", [])
    if findings:
        section_header(f"Key Findings ({len(findings)})")
        sev_colors = {"critical": RED, "high": ORANGE, "medium": colors.HexColor("#f39c12"), "low": ACCENT}
        for f in findings:
            sev = f.get("significance", "medium").lower()
            sev_color = sev_colors.get(sev, ACCENT)
            block = [
                [
                    Paragraph(f"#{f.get('finding_number', '')}  {f.get('exhibit_ref', '')}", s["mono"]),
                    Paragraph(sev.upper(), ParagraphStyle("sev", fontName="Helvetica-Bold", fontSize=8,
                                                          textColor=colors.white, alignment=TA_CENTER)),
                ],
                [Paragraph(f.get("finding", ""), s["body"]), ""],
            ]
            if f.get("evidential_value"):
                block.append([Paragraph(f"Evidential Value: {f['evidential_value']}", s["small"]), ""])

            story.append(KeepTogether(Table(block, colWidths=[W * 0.75, W * 0.25],
                style=TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eaf3fb")),
                    ("BACKGROUND", (1, 0), (1, 0), sev_color),
                    ("SPAN", (0, 1), (1, 1)),
                    ("SPAN", (0, 2), (1, 2)) if f.get("evidential_value") else ("NOSPLIT", (0, 0), (0, 0)),
                    ("GRID", (0, 0), (-1, -1), 0.3, MID_GREY),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ])
            )))
            story.append(Spacer(1, 2*mm))

    # ── Statistical Analysis ──
    stat = report_data.get("statistical_analysis", "")
    if stat and stat != "Not applicable to this examination.":
        section_header("Statistical Analysis")
        story.append(Table(
            [[Paragraph(stat, s["italic"])]],
            colWidths=[W],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0f7ff")),
                ("LINEBEFORE", (0, 0), (0, -1), 3, ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ])
        ))

    # ── Conclusion ──
    if report_data.get("conclusion"):
        section_header("Conclusion")
        for para in report_data["conclusion"].split("\n"):
            if para.strip():
                story.append(Paragraph(para.strip(), s["body"]))

    # ── Limitations ──
    if report_data.get("limitations") and report_data["limitations"] != "None identified.":
        section_header("Limitations")
        story.append(Paragraph(report_data["limitations"], s["body"]))

    # ── Recommendations ──
    recs = report_data.get("recommendations", [])
    if recs:
        section_header("Recommendations")
        for i, rec in enumerate(recs, 1):
            story.append(Paragraph(f"{i}.  {rec}", s["body"]))

    # ── Examiner Statement ──
    section_header("Examiner Statement")
    story.append(Paragraph(
        report_data.get("examiner_statement",
            "I have examined the items listed in this report and the results of my examination are set out above. "
            "The opinions expressed are my own professional opinions based on the evidence examined."),
        s["italic"]
    ))
    if report_data.get("confidence_note"):
        story.append(Paragraph(report_data["confidence_note"], s["small"]))

    # ── Reviewer Approval ──
    section_header("Review & Approval")
    approval_status = report.status.value.upper().replace("_", " ")
    status_color = GREEN if report.status.value == "approved" else (RED if report.status.value == "needs_correction" else ACCENT)
    kv_table([
        ("Review Status", approval_status),
        ("Reviewed By", reviewer.full_name if reviewer else "Pending"),
        ("Reviewer Badge", reviewer.badge_number if reviewer else ""),
        ("Review Date", report.reviewed_at.strftime("%d %B %Y %H:%M UTC") if report.reviewed_at else "Pending"),
        ("Approval Date", report.approved_at.strftime("%d %B %Y %H:%M UTC") if report.approved_at else "Pending"),
        ("Reviewer Comments", report.reviewer_comments or "None"),
    ])

    # ── Signature Block ──
    section_header("Signatures")
    sig_data = [
        ["Examining Officer", "", "Reviewing Officer", ""],
        ["", "", "", ""],
        ["", "", "", ""],
        ["Signature: ___________________________", "",
         "Signature: ___________________________", ""],
        [f"Name: {report.officer_in_charge or '___________________________'}", "",
         f"Name: {reviewer.full_name if reviewer else '___________________________'}", ""],
        [f"Date: ___________________________", "",
         f"Date: ___________________________", ""],
    ]
    story.append(Table(sig_data, colWidths=[W*0.4, W*0.1, W*0.4, W*0.1],
        style=TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 2), (0, 2), 0.5, DARK),
            ("LINEBELOW", (2, 2), (2, 2), 0.5, DARK),
        ])
    ))

    # ── Footer note ──
    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width=W, thickness=0.5, color=MID_GREY))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f"This report was generated by ForensixAI on {datetime.utcnow().strftime('%d %B %Y at %H:%M UTC')}. "
        f"Report Number: {report.report_number}. This document is confidential and intended solely for the "
        f"named investigating officer and authorised personnel.",
        s["small"]
    ))

    doc.build(story)
    return buf.getvalue()
