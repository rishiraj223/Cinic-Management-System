"""
PDF generation utilities for prescriptions and invoices using ReportLab.
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def _build_styles():
    styles = getSampleStyleSheet()
    custom = {
        "title": ParagraphStyle(
            "DocTitle", parent=styles["Title"],
            fontSize=18, textColor=colors.HexColor("#1e3a5f"),
            spaceAfter=4, alignment=TA_CENTER,
        ),
        "subtitle": ParagraphStyle(
            "DocSubtitle", parent=styles["Normal"],
            fontSize=10, textColor=colors.HexColor("#4a6fa5"),
            spaceAfter=2, alignment=TA_CENTER,
        ),
        "section_header": ParagraphStyle(
            "SectionHeader", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#1e3a5f"),
            spaceBefore=8, spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "Body", parent=styles["Normal"],
            fontSize=9, textColor=colors.HexColor("#333333"),
            spaceAfter=2,
        ),
        "small": ParagraphStyle(
            "Small", parent=styles["Normal"],
            fontSize=8, textColor=colors.HexColor("#666666"),
        ),
        "right": ParagraphStyle(
            "Right", parent=styles["Normal"],
            fontSize=9, alignment=TA_RIGHT,
        ),
    }
    return custom


def generate_prescription_pdf(
    prescription_data: dict,
    org_data: dict,
    patient_data: dict,
    doctor_data: dict,
) -> bytes:
    """
    Generate a professional prescription PDF.
    Returns PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )
    styles = _build_styles()
    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story.append(Paragraph(org_data.get("name", "Healthcare Facility"), styles["title"]))
    addr_parts = [
        org_data.get("address", ""),
        org_data.get("city", ""),
        org_data.get("state", ""),
    ]
    addr = ", ".join(p for p in addr_parts if p)
    if addr:
        story.append(Paragraph(addr, styles["subtitle"]))
    if org_data.get("phone"):
        story.append(Paragraph(f"Phone: {org_data['phone']}", styles["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a5f")))
    story.append(Spacer(1, 4 * mm))

    # ── Prescription Ref & Date ──────────────────────────────────────────────
    ref = prescription_data.get("prescription_ref", "")
    created = prescription_data.get("created_at", "")
    if hasattr(created, "strftime"):
        created = created.strftime("%d %b %Y")
    ref_date_data = [["Prescription Ref:", ref, "Date:", created]]
    ref_table = Table(ref_date_data, colWidths=[40 * mm, 60 * mm, 20 * mm, 45 * mm])
    ref_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, 0), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#333333")),
    ]))
    story.append(ref_table)
    story.append(Spacer(1, 4 * mm))

    # ── Doctor & Patient Info Side by Side ──────────────────────────────────
    doctor_name = doctor_data.get("full_name", "") or doctor_data.get("name", "")
    doctor_specialty = doctor_data.get("specialty", "")
    doctor_license = doctor_data.get("license_number", "")

    patient_name = patient_data.get("full_name", "")
    patient_code = patient_data.get("patient_code", "")
    patient_dob = patient_data.get("date_of_birth", "")
    if hasattr(patient_dob, "strftime"):
        patient_dob = patient_dob.strftime("%d %b %Y")
    patient_gender = patient_data.get("gender", "")
    patient_phone = patient_data.get("phone", "")

    info_data = [
        [
            Paragraph("<b>Doctor</b>", styles["section_header"]),
            Paragraph("<b>Patient</b>", styles["section_header"]),
        ],
        [
            Paragraph(f"Dr. {doctor_name}", styles["body"]),
            Paragraph(f"Name: {patient_name}", styles["body"]),
        ],
        [
            Paragraph(doctor_specialty, styles["body"]),
            Paragraph(f"Code: {patient_code}", styles["body"]),
        ],
        [
            Paragraph(f"License: {doctor_license}" if doctor_license else "", styles["small"]),
            Paragraph(f"DOB: {patient_dob}  Gender: {patient_gender}", styles["small"]),
        ],
        [
            Paragraph("", styles["body"]),
            Paragraph(f"Phone: {patient_phone}", styles["small"]),
        ],
    ]
    info_table = Table(info_data, colWidths=[85 * mm, 85 * mm])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEAFTER", (0, 0), (0, -1), 0.5, colors.HexColor("#cccccc")),
        ("LEFTPADDING", (1, 0), (1, -1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    story.append(Spacer(1, 4 * mm))

    # ── Diagnosis ────────────────────────────────────────────────────────────
    diagnosis = prescription_data.get("diagnosis_note", "")
    if diagnosis:
        story.append(Paragraph("Diagnosis / Clinical Note", styles["section_header"]))
        story.append(Paragraph(diagnosis, styles["body"]))
        story.append(Spacer(1, 3 * mm))

    # ── Rx Medications Table ─────────────────────────────────────────────────
    story.append(Paragraph("℞  Medications", styles["section_header"]))
    items = prescription_data.get("items", [])
    if items:
        headers = ["#", "Medication", "Dosage", "Frequency", "Duration", "Route"]
        table_data = [headers]
        for idx, item in enumerate(items, 1):
            table_data.append([
                str(idx),
                item.get("medication_name", ""),
                item.get("dosage", ""),
                item.get("frequency", ""),
                item.get("duration", "") or "-",
                item.get("route", "") or "-",
            ])
        col_widths = [10 * mm, 45 * mm, 25 * mm, 30 * mm, 25 * mm, 25 * mm]
        med_table = Table(table_data, colWidths=col_widths)
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f8ff")]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(med_table)
    else:
        story.append(Paragraph("No medications listed.", styles["body"]))
    story.append(Spacer(1, 4 * mm))

    # ── Instructions ─────────────────────────────────────────────────────────
    instructions = prescription_data.get("instructions", "")
    if instructions:
        story.append(Paragraph("Instructions / Advice", styles["section_header"]))
        story.append(Paragraph(instructions, styles["body"]))
        story.append(Spacer(1, 4 * mm))

    # ── Follow-up ────────────────────────────────────────────────────────────
    follow_up = patient_data.get("follow_up_date", "")
    if follow_up:
        if hasattr(follow_up, "strftime"):
            follow_up = follow_up.strftime("%d %b %Y")
        story.append(Paragraph(f"Follow-up Date: {follow_up}", styles["body"]))
        story.append(Spacer(1, 4 * mm))

    # ── Signature ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 10 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    sig_data = [["", "___________________________"]]
    sig_table = Table(sig_data, colWidths=[120 * mm, 45 * mm])
    sig_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, 0), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#666666")),
    ]))
    story.append(sig_table)
    sig_label = Table(
        [["", Paragraph(f"Dr. {doctor_name}", styles["small"])]],
        colWidths=[120 * mm, 45 * mm]
    )
    sig_label.setStyle(TableStyle([("ALIGN", (1, 0), (1, 0), "CENTER")]))
    story.append(sig_label)

    # ── Footer ───────────────────────────────────────────────────────────────
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        f"Generated on {datetime.now().strftime('%d %b %Y %H:%M')} | {org_data.get('name', '')}",
        styles["small"],
    ))

    doc.build(story)
    return buffer.getvalue()


def generate_invoice_pdf(
    invoice_data: dict,
    org_data: dict,
    patient_data: dict,
    items: list,
) -> bytes:
    """
    Generate a professional invoice PDF.
    Returns PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )
    styles = _build_styles()
    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story.append(Paragraph(org_data.get("name", "Healthcare Facility"), styles["title"]))
    addr_parts = [
        org_data.get("address", ""),
        org_data.get("city", ""),
        org_data.get("state", ""),
    ]
    addr = ", ".join(p for p in addr_parts if p)
    if addr:
        story.append(Paragraph(addr, styles["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a5f")))
    story.append(Spacer(1, 4 * mm))

    # ── Invoice Title & Number ────────────────────────────────────────────────
    story.append(Paragraph("INVOICE", styles["title"]))
    inv_num = invoice_data.get("invoice_number", "")
    inv_date = invoice_data.get("created_at", "")
    if hasattr(inv_date, "strftime"):
        inv_date = inv_date.strftime("%d %b %Y")
    due_date = invoice_data.get("due_date", "")
    if hasattr(due_date, "strftime"):
        due_date = due_date.strftime("%d %b %Y")

    meta_data = [
        ["Invoice #:", inv_num, "Date:", str(inv_date)],
        ["Status:", invoice_data.get("status", "").upper(), "Due Date:", str(due_date) if due_date else "—"],
    ]
    meta_table = Table(meta_data, colWidths=[30 * mm, 75 * mm, 22 * mm, 40 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 4 * mm))

    # ── Patient Info ─────────────────────────────────────────────────────────
    story.append(Paragraph("Bill To", styles["section_header"]))
    patient_name = patient_data.get("full_name", "")
    patient_code = patient_data.get("patient_code", "")
    patient_phone = patient_data.get("phone", "")
    story.append(Paragraph(f"{patient_name}  (Code: {patient_code})", styles["body"]))
    if patient_phone:
        story.append(Paragraph(f"Phone: {patient_phone}", styles["body"]))
    story.append(Spacer(1, 4 * mm))

    # ── Items Table ───────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    headers = ["#", "Description", "Qty", "Unit Price", "Total"]
    table_data = [headers]
    currency = org_data.get("currency", "INR")
    for idx, item in enumerate(items, 1):
        table_data.append([
            str(idx),
            item.get("description", ""),
            str(item.get("quantity", 1)),
            f"{currency} {float(item.get('unit_price', 0)):,.2f}",
            f"{currency} {float(item.get('total', 0)):,.2f}",
        ])

    col_widths = [10 * mm, 75 * mm, 15 * mm, 30 * mm, 35 * mm]
    items_table = Table(table_data, colWidths=col_widths)
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f8ff")]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 4 * mm))

    # ── Totals ────────────────────────────────────────────────────────────────
    subtotal = float(invoice_data.get("subtotal", 0))
    discount = float(invoice_data.get("discount", 0))
    tax = float(invoice_data.get("tax", 0))
    total = float(invoice_data.get("total", 0))
    amount_paid = float(invoice_data.get("amount_paid", 0))
    balance = float(invoice_data.get("balance", 0))

    totals_data = [
        ["", "Subtotal:", f"{currency} {subtotal:,.2f}"],
    ]
    if discount:
        totals_data.append(["", "Discount:", f"- {currency} {discount:,.2f}"])
    if tax:
        totals_data.append(["", "Tax:", f"{currency} {tax:,.2f}"])
    totals_data.append(["", "TOTAL:", f"{currency} {total:,.2f}"])
    totals_data.append(["", "Amount Paid:", f"{currency} {amount_paid:,.2f}"])
    totals_data.append(["", "Balance Due:", f"{currency} {balance:,.2f}"])

    totals_table = Table(totals_data, colWidths=[95 * mm, 40 * mm, 35 * mm])
    totals_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (1, -3), (1, -3), "Helvetica-Bold"),  # TOTAL label
        ("FONTNAME", (1, -1), (1, -1), "Helvetica-Bold"),  # Balance Due label
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (2, -1), "RIGHT"),
        ("LINEABOVE", (1, -3), (2, -3), 0.8, colors.HexColor("#1e3a5f")),
        ("LINEABOVE", (1, -1), (2, -1), 0.8, colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (1, -1), (2, -1), colors.HexColor("#cc0000") if balance > 0 else colors.HexColor("#008000")),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 6 * mm))

    # ── Notes ─────────────────────────────────────────────────────────────────
    notes = invoice_data.get("notes", "")
    if notes:
        story.append(Paragraph("Notes", styles["section_header"]))
        story.append(Paragraph(notes, styles["body"]))
        story.append(Spacer(1, 4 * mm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    story.append(Paragraph(
        f"Thank you for choosing {org_data.get('name', 'us')}. Generated on {datetime.now().strftime('%d %b %Y %H:%M')}",
        styles["small"],
    ))

    doc.build(story)
    return buffer.getvalue()
