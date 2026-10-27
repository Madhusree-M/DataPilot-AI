import os
import time
import uuid
from typing import Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app.utils.helpers import REPORTS_DIR
from app.services.eda_service import EDAService
from app.services.automl_service import AutoMLService
from app.schemas.report import ReportGenerateRequest, ReportSummary


class ReportService:
    @staticmethod
    def generate_html_report(request: ReportGenerateRequest) -> ReportSummary:
        """Generates an executive audit report as a PDF."""
        return ReportService.generate_pdf_report(request)

    @staticmethod
    def generate_pdf_report(request: ReportGenerateRequest) -> ReportSummary:
        eda = EDAService.analyze_dataset(request.dataset_id)
        job_data = AutoMLService.get_job(request.job_id) if request.job_id else None

        report_id = f"rep_{uuid.uuid4().hex[:8]}"
        clean_name = request.dataset_id.replace(".csv", "").replace("_", " ")
        filename = f"{report_id}_{request.dataset_id.replace('.csv', '')}.pdf"
        file_path = os.path.join(REPORTS_DIR, filename)

        doc = SimpleDocTemplate(
            file_path,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()
        
        # Custom Typography Styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0f172a'),
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#64748b'),
        )
        h2_style = ParagraphStyle(
            'SectionH2',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=17,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=14,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155'),
        )
        body_bold = ParagraphStyle(
            'ReportBodyBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#0f172a'),
        )
        table_cell = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#1e293b'),
        )
        table_cell_bold = ParagraphStyle(
            'TableCellBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#0f172a'),
        )
        table_header = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#475569'),
        )
        badge_style = ParagraphStyle(
            'BadgeStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#4f46e5'),
        )

        story = []

        # 1. Header Banner
        header_table = Table(
            [
                [
                    Paragraph(f"<b>DataPilot AI</b> &bull; Executive Data Science Audit", badge_style),
                    Paragraph(f"Generated: {time.strftime('%b %d, %Y - %H:%M')}", subtitle_style),
                ],
                [
                    Paragraph(f"{request.report_title or 'Executive Audit Report'}", title_style),
                    Paragraph(f"Dataset: <b>{clean_name.title()}</b>", subtitle_style),
                ],
            ],
            colWidths=[380, 160],
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#e2e8f0'), spaceAfter=14))

        # 2. Executive KPI Cards
        health_color = colors.HexColor('#059669') if eda.health_score >= 80 else colors.HexColor('#d97706') if eda.health_score >= 60 else colors.HexColor('#dc2626')
        
        kpi_data = [
            [
                Paragraph("<b>DATA HEALTH SCORE</b>", subtitle_style),
                Paragraph("<b>TOTAL RECORDS</b>", subtitle_style),
                Paragraph("<b>FEATURES (COLS)</b>", subtitle_style),
                Paragraph("<b>MISSING CELLS</b>", subtitle_style),
                Paragraph("<b>DUPLICATE ROWS</b>", subtitle_style),
            ],
            [
                Paragraph(f"<font color='{health_color.hexval()}'><b>{eda.health_score}/100</b></font>", title_style),
                Paragraph(f"<b>{eda.row_count:,}</b>", title_style),
                Paragraph(f"<b>{eda.col_count}</b>", title_style),
                Paragraph(f"<b>{eda.missing_cells_count:,}</b>", title_style),
                Paragraph(f"<b>{eda.duplicate_rows_count:,}</b>", title_style),
            ],
            [
                Paragraph("Production Ready" if eda.health_score >= 80 else "Needs Cleaning", body_style),
                Paragraph(f"{eda.memory_usage_mb} MB cache", body_style),
                Paragraph(f"{len(eda.numeric_columns)} num / {len(eda.categorical_columns)} cat", body_style),
                Paragraph(f"{eda.missing_cells_percentage}% of cells", body_style),
                Paragraph(f"Zero duplicates" if eda.duplicate_rows_count == 0 else "Duplicates detected", body_style),
            ],
        ]

        kpi_table = Table(kpi_data, colWidths=[108, 108, 108, 108, 108])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 14))

        # 3. Autonomous Health Audit Findings
        story.append(Paragraph("1. Autonomous Data Health Findings", h2_style))
        if eda.warnings and len(eda.warnings) > 0:
            warn_rows = [[
                Paragraph("Severity", table_header),
                Paragraph("Column", table_header),
                Paragraph("Diagnostic Finding", table_header),
                Paragraph("Remediation Recommendation", table_header),
            ]]
            for w in eda.warnings[:6]:  # Limit top warnings
                sev_color = '#dc2626' if w.severity == 'high' else '#d97706' if w.severity == 'medium' else '#4f46e5'
                warn_rows.append([
                    Paragraph(f"<font color='{sev_color}'><b>[{w.severity.upper()}]</b></font>", table_cell),
                    Paragraph(w.column or "General", table_cell_bold),
                    Paragraph(w.message, table_cell),
                    Paragraph(w.recommendation, table_cell),
                ])
            warn_table = Table(warn_rows, colWidths=[70, 80, 200, 190])
            warn_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f1f5f9')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(warn_table)
        else:
            story.append(Paragraph("✓ <b>Zero critical data health anomalies detected.</b> The dataset features high integrity, clean feature boundaries, and is fully primed for machine learning.", body_style))
        story.append(Spacer(1, 14))

        # 4. Column Statistical Profiles Table
        story.append(Paragraph("2. Statistical Feature Profiling", h2_style))
        col_rows = [[
            Paragraph("Feature", table_header),
            Paragraph("Type", table_header),
            Paragraph("Missing", table_header),
            Paragraph("Unique", table_header),
            Paragraph("Mean / Top", table_header),
            Paragraph("Median", table_header),
            Paragraph("Std Dev", table_header),
            Paragraph("Outliers", table_header),
        ]]
        for p in eda.column_profiles:
            mean_val = f"{p.mean:.2f}" if p.mean is not None else "-"
            med_val = f"{p.median:.2f}" if p.median is not None else "-"
            std_val = f"{p.std:.2f}" if p.std is not None else "-"
            out_val = str(p.outlier_count) if p.outlier_count is not None else "-"
            col_rows.append([
                Paragraph(f"<b>{p.name}</b>", table_cell),
                Paragraph(p.inferred_type, table_cell),
                Paragraph(f"{p.missing_count} ({p.missing_percentage}%)", table_cell),
                Paragraph(str(p.unique_count), table_cell),
                Paragraph(mean_val, table_cell),
                Paragraph(med_val, table_cell),
                Paragraph(std_val, table_cell),
                Paragraph(out_val, table_cell),
            ])

        col_table = Table(col_rows, colWidths=[95, 60, 65, 55, 75, 65, 65, 60])
        col_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(col_table)
        story.append(Spacer(1, 16))

        # 5. AutoML Model Benchmarks (if available)
        if job_data:
            story.append(Paragraph("3. AutoML Multi-Model Benchmark Leaderboard", h2_style))
            
            best_model_name = job_data.get("best_model_name", "N/A")
            task_type = job_data.get("task_type", "classification").upper()
            target_col = job_data.get("target_column", "Target")

            # Leaderboard Table
            leader_rows = [[
                Paragraph("Algorithm", table_header),
                Paragraph("Train Time", table_header),
                Paragraph("Accuracy / R²", table_header),
                Paragraph("F1 / RMSE", table_header),
                Paragraph("Precision / MAE", table_header),
                Paragraph("Status", table_header),
            ]]
            for m in job_data.get("model_results", []):
                is_best = m.is_best if hasattr(m, 'is_best') else m.get('is_best', False)
                m_name = m.model_name if hasattr(m, 'model_name') else m.get('model_name', '')
                m_time = f"{m.training_time_seconds if hasattr(m, 'training_time_seconds') else m.get('training_time_seconds', 0)}s"
                m_metrics = m.metrics if hasattr(m, 'metrics') else m.get('metrics', {})
                
                score_1 = m_metrics.get('accuracy') or m_metrics.get('r2_score') or '-'
                score_2 = m_metrics.get('f1_score') or m_metrics.get('rmse') or '-'
                score_3 = m_metrics.get('precision') or m_metrics.get('mae') or '-'
                status = "<font color='#059669'><b>★ WINNER</b></font>" if is_best else "Tested"

                leader_rows.append([
                    Paragraph(f"<b>{m_name}</b>", table_cell),
                    Paragraph(m_time, table_cell),
                    Paragraph(str(score_1), table_cell_bold if is_best else table_cell),
                    Paragraph(str(score_2), table_cell),
                    Paragraph(str(score_3), table_cell),
                    Paragraph(status, table_cell),
                ])

            leader_table = Table(leader_rows, colWidths=[140, 70, 85, 85, 85, 75])
            leader_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(leader_table)
            story.append(Spacer(1, 10))

            # AI Rationale Box in PDF
            rationale = job_data.get("recommendation_rationale")
            if rationale:
                headline = rationale.headline if hasattr(rationale, 'headline') else rationale.get('headline', '')
                fit = rationale.dataset_fit_analysis if hasattr(rationale, 'dataset_fit_analysis') else rationale.get('dataset_fit_analysis', '')
                rat_data = [
                    [Paragraph(f"<b>AI Selection Rationale &bull; Why {best_model_name} is Preferred:</b>", badge_style)],
                    [Paragraph(f"<b>Summary:</b> {headline}", body_style)],
                    [Paragraph(f"<b>Dataset Fit:</b> {fit}", body_style)],
                ]
                rat_table = Table(rat_data, colWidths=[540])
                rat_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ]))
                story.append(rat_table)

        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=8))
        story.append(Paragraph("<font color='#94a3b8'>DataPilot AI &bull; Autonomous AI Data Scientist Platform &bull; Boardroom Audit Ready</font>", ParagraphStyle('Footer', parent=styles['Normal'], alignment=TA_CENTER, fontSize=8, leading=10, textColor=colors.HexColor('#94a3b8'))))

        # Build PDF
        doc.build(story)
        file_size = os.path.getsize(file_path)

        return ReportSummary(
            report_id=report_id,
            filename=filename,
            dataset_name=request.dataset_id,
            created_at=time.ctime(),
            file_size_bytes=file_size,
            download_url=f"/api/reports/download/{filename}",
        )
