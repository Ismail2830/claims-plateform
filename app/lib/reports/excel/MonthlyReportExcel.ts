import ExcelJS from 'exceljs';
import type { MonthlyReportData } from '../pdf/MonthlyReportPDF';

const BRAND_COLOR = '1E40AF';
const ACCENT_COLOR = '3B82F6';
const LIGHT_BG    = 'EFF6FF';
const HEADER_FONT = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } } as ExcelJS.Font;
const BODY_FONT   = { name: 'Calibri', size: 10 } as ExcelJS.Font;

function styleHeader(row: ExcelJS.Row, bgColor = BRAND_COLOR) {
  row.eachCell((cell) => {
    cell.font      = HEADER_FONT;
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgColor}` } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border    = {
      top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });
  row.height = 24;
}

function styleDataRow(row: ExcelJS.Row, alternate: boolean) {
  row.eachCell((cell) => {
    cell.font      = BODY_FONT;
    cell.alignment = { vertical: 'middle', wrapText: false };
    if (alternate) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT_BG}` } };
    }
    cell.border = {
      bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
    };
  });
  row.height = 18;
}

function addTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string) {
  const t = sheet.addRow([title]);
  t.getCell(1).font = { name: 'Calibri', size: 16, bold: true, color: { argb: `FF${BRAND_COLOR}` } };
  t.height = 30;
  const s = sheet.addRow([subtitle]);
  s.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  sheet.addRow([]);
}

export async function generateMonthlyExcel(data: MonthlyReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ISM Assurance';
  workbook.created = new Date();

  // ── Sheet 1: Résumé ────────────────────────────────────────────────────────
  const summary = workbook.addWorksheet('Résumé', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: `FF${BRAND_COLOR}` } },
  });
  summary.columns = [
    { key: 'label', width: 35 },
    { key: 'value', width: 22 },
  ];
  addTitle(summary, "Rapport Mensuel d'Activité", `Période : ${data.period}`);

  const kpis = [
    ['Total dossiers',          data.summary.totalClaims],
    ['Nouveaux dossiers',       data.summary.newClaims],
    ['Dossiers résolus',        data.summary.resolvedClaims],
    ['Dossiers en attente',     data.summary.pendingClaims],
    ['Délai moyen (jours)',     data.summary.avgProcessingDays.toFixed(1)],
    ['Total indemnités (MAD)',  data.summary.totalIndemnities],
    ['Score risque moyen',      data.summary.avgRiskScore.toFixed(1)],
  ];
  const sumHeader = summary.addRow(['Indicateur', 'Valeur']);
  styleHeader(sumHeader, BRAND_COLOR);
  kpis.forEach(([label, value], i) => {
    const r = summary.addRow([label, value]);
    styleDataRow(r, i % 2 !== 0);
  });

  // ── Sheet 2: Sinistres ─────────────────────────────────────────────────────
  const claims = workbook.addWorksheet('Sinistres', {
    properties: { tabColor: { argb: 'FFEA580C' } },
  });
  claims.columns = [
    { key: 'type',    width: 30 },
    { key: 'count',   width: 15 },
    { key: 'amount',  width: 22 },
    { key: 'percent', width: 15 },
  ];
  addTitle(claims, 'Répartition des Sinistres', `Période : ${data.period}`);
  const claimsHeader = claims.addRow(['Type', 'Nombre', 'Montant total (MAD)', '% du total']);
  styleHeader(claimsHeader, 'EA580C');
  data.claimsByType.forEach((row, i) => {
    const pct = data.summary.totalClaims > 0
      ? ((row.count / data.summary.totalClaims) * 100).toFixed(1) + '%'
      : '0%';
    const r = claims.addRow([row.type, row.count, row.amount, pct]);
    styleDataRow(r, i % 2 !== 0);
  });

  // ── Sheet 3: Gestionnaires ──────────────────────────────────────────────────
  const mgrs = workbook.addWorksheet('Gestionnaires', {
    properties: { tabColor: { argb: 'FF0D9488' } },
  });
  mgrs.columns = [
    { key: 'name',     width: 30 },
    { key: 'role',     width: 22 },
    { key: 'assigned', width: 14 },
    { key: 'resolved', width: 14 },
    { key: 'avgDays',  width: 16 },
    { key: 'rate',     width: 16 },
  ];
  addTitle(mgrs, 'Performance des Gestionnaires', `Période : ${data.period}`);
  const mgrsHeader = mgrs.addRow(['Nom', 'Rôle', 'Assignés', 'Résolus', 'Délai moy. (j)', 'Taux résol.']);
  styleHeader(mgrsHeader, '0D9488');
  data.managers.forEach((m, i) => {
    const rate = m.assigned > 0 ? ((m.resolved / m.assigned) * 100).toFixed(0) + '%' : '0%';
    const r = mgrs.addRow([m.name, m.role, m.assigned, m.resolved, m.avgDays.toFixed(1), rate]);
    styleDataRow(r, i % 2 !== 0);
  });

  // ── Sheet 4: IA & Documents ────────────────────────────────────────────────
  const aiSheet = workbook.addWorksheet('IA & Documents', {
    properties: { tabColor: { argb: 'FF7C3AED' } },
  });
  aiSheet.columns = [
    { key: 'label', width: 35 },
    { key: 'value', width: 15 },
  ];
  addTitle(aiSheet, 'Analyse IA & Documents', `Période : ${data.period}`);
  const aiHeader = aiSheet.addRow(['Indicateur', 'Valeur']);
  styleHeader(aiHeader, '7C3AED');
  const aiRows = [
    ['Score IA moyen',                data.aiStats.avgScore.toFixed(1)],
    ['Dossiers haut risque',          data.aiStats.highRisk],
    ['Dossiers risque moyen',         data.aiStats.mediumRisk],
    ['Dossiers risque faible',        data.aiStats.lowRisk],
    ['Suspicion de fraude',           data.aiStats.flaggedFraud],
    ['Documents uploadés',            data.documents.totalUploaded],
    ['Documents vérifiés',            data.documents.totalVerified],
    ['Documents en attente vérif.',   data.documents.pendingVerification],
  ];
  aiRows.forEach(([label, value], i) => {
    const r = aiSheet.addRow([label, value]);
    styleDataRow(r, i % 2 !== 0);
  });

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}
