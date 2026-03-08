import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyReportData {
  period: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  generatorName: string;
  summary: {
    totalClaims: number;
    newClaims: number;
    resolvedClaims: number;
    pendingClaims: number;
    avgProcessingDays: number;
    totalIndemnities: number;
    avgRiskScore: number;
  };
  claimsByType: { type: string; count: number; amount: number }[];
  claimsByStatus: { status: string; count: number }[];
  managers: {
    name: string;
    role: string;
    assigned: number;
    resolved: number;
    avgDays: number;
    satisfactionRate: number;
  }[];
  documents: {
    totalUploaded: number;
    totalVerified: number;
    pendingVerification: number;
  };
  aiStats: {
    avgScore: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    flaggedFraud: number;
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BRAND = '#1e40af'; // blue-800
const ACCENT = '#3b82f6'; // blue-500
const LIGHT_BG = '#eff6ff'; // blue-50
const TEXT_PRIMARY = '#1e293b';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: TEXT_PRIMARY,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },

  // Cover
  coverPage: {
    fontFamily: 'Helvetica',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    backgroundColor: BRAND,
  },
  coverHeader: {
    backgroundColor: BRAND,
    paddingTop: 80,
    paddingHorizontal: 50,
    paddingBottom: 60,
  },
  coverCompany: {
    fontSize: 13,
    color: '#bfdbfe',
    marginBottom: 8,
    fontFamily: 'Helvetica',
  },
  coverTitle: {
    fontSize: 28,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.2,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#93c5fd',
    fontFamily: 'Helvetica',
    marginBottom: 30,
  },
  coverBody: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingHorizontal: 50,
    paddingBottom: 50,
    flex: 1,
  },
  coverInfoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  coverInfoLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    width: 120,
    fontFamily: 'Helvetica',
  },
  coverInfoValue: {
    fontSize: 9,
    color: TEXT_PRIMARY,
    fontFamily: 'Helvetica-Bold',
  },

  // Section
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  subSectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    marginTop: 12,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  kpiCard: {
    width: '32%',
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 10,
    marginRight: '2%',
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
  },

  // Table
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 2,
    marginBottom: 1,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: LIGHT_BG,
  },
  tableCell: {
    fontSize: 8,
    flex: 1,
    color: TEXT_PRIMARY,
  },
  tableCellRight: {
    fontSize: 8,
    flex: 1,
    color: TEXT_PRIMARY,
    textAlign: 'right',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: TEXT_MUTED,
  },

  // Spacer
  spacer: { marginBottom: 20 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  mr8: { marginRight: 8 },
});

// ─── Components ───────────────────────────────────────────────────────────────

const PageFooter = ({ period }: { period: string }) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerText}>ISM Assurance — {period}</Text>
    <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
      `Page ${pageNumber} / ${totalPages}`
    } />
    <Text style={styles.footerText}>Confidentiel</Text>
  </View>
);

const SectionTitle = ({ children }: { children: string }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

// ─── Main Document ────────────────────────────────────────────────────────────

export function MonthlyReportPDF({ data }: { data: MonthlyReportData }) {
  const fmt = (n: number) => n.toLocaleString('fr-FR');
  const fmtMAD = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' });

  return (
    <Document
      title={`Rapport Mensuel — ${data.period}`}
      author="ISM Assurance"
      creator="Plateforme Claims"
    >
      {/* ── Cover ─────────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHeader}>
          <Text style={styles.coverCompany}>ISM ASSURANCE</Text>
          <Text style={styles.coverTitle}>Rapport Mensuel{'\n'}d'Activité</Text>
          <Text style={styles.coverSubtitle}>{data.period}</Text>
        </View>
        <View style={styles.coverBody}>
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverInfoLabel}>Période couverte</Text>
            <Text style={styles.coverInfoValue}>
              {data.dateFrom} – {data.dateTo}
            </Text>
          </View>
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverInfoLabel}>Généré le</Text>
            <Text style={styles.coverInfoValue}>{data.generatedAt}</Text>
          </View>
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverInfoLabel}>Généré par</Text>
            <Text style={styles.coverInfoValue}>{data.generatorName}</Text>
          </View>
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverInfoLabel}>Classification</Text>
            <Text style={styles.coverInfoValue}>Confidentiel — Usage interne</Text>
          </View>
        </View>
      </Page>

      {/* ── Summary ───────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <SectionTitle>1. Résumé Exécutif</SectionTitle>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmt(data.summary.totalClaims)}</Text>
            <Text style={styles.kpiLabel}>Total dossiers</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmt(data.summary.newClaims)}</Text>
            <Text style={styles.kpiLabel}>Nouveaux dossiers</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmt(data.summary.resolvedClaims)}</Text>
            <Text style={styles.kpiLabel}>Dossiers résolus</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmt(data.summary.pendingClaims)}</Text>
            <Text style={styles.kpiLabel}>En attente</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data.summary.avgProcessingDays.toFixed(1)}</Text>
            <Text style={styles.kpiLabel}>Jours moy. traitement</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data.summary.avgRiskScore.toFixed(0)}</Text>
            <Text style={styles.kpiLabel}>Score risque moyen (/100)</Text>
          </View>
        </View>

        <Text style={styles.subSectionTitle}>Répartition par type de sinistre</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Type</Text>
            <Text style={styles.tableHeaderCell}>Dossiers</Text>
            <Text style={styles.tableHeaderCell}>Montant total</Text>
            <Text style={styles.tableHeaderCell}>% du total</Text>
          </View>
          {data.claimsByType.map((row, i) => (
            <View key={row.type} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{row.type}</Text>
              <Text style={styles.tableCell}>{fmt(row.count)}</Text>
              <Text style={styles.tableCell}>{fmtMAD(row.amount)}</Text>
              <Text style={styles.tableCell}>
                {data.summary.totalClaims > 0
                  ? ((row.count / data.summary.totalClaims) * 100).toFixed(1)
                  : '0'}
                %
              </Text>
            </View>
          ))}
        </View>

        <PageFooter period={data.period} />
      </Page>

      {/* ── Manager Performance ───────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <SectionTitle>2. Performance des Gestionnaires</SectionTitle>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Gestionnaire</Text>
            <Text style={styles.tableHeaderCell}>Rôle</Text>
            <Text style={styles.tableHeaderCell}>Assignés</Text>
            <Text style={styles.tableHeaderCell}>Résolus</Text>
            <Text style={styles.tableHeaderCell}>Moy. (j)</Text>
            <Text style={styles.tableHeaderCell}>Taux résol.</Text>
          </View>
          {data.managers.map((m, i) => (
            <View key={m.name} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{m.name}</Text>
              <Text style={styles.tableCell}>{m.role}</Text>
              <Text style={styles.tableCell}>{m.assigned}</Text>
              <Text style={styles.tableCell}>{m.resolved}</Text>
              <Text style={styles.tableCell}>{m.avgDays.toFixed(1)}</Text>
              <Text style={styles.tableCell}>
                {m.assigned > 0
                  ? ((m.resolved / m.assigned) * 100).toFixed(0)
                  : '0'}
                %
              </Text>
            </View>
          ))}
        </View>

        <PageFooter period={data.period} />
      </Page>

      {/* ── AI & Documents ────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <SectionTitle>3. Analyse IA & Documents</SectionTitle>

        <Text style={styles.subSectionTitle}>Scoring IA</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data.aiStats.avgScore.toFixed(0)}</Text>
            <Text style={styles.kpiLabel}>Score moyen (/100)</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]}>
            <Text style={[styles.kpiValue, { color: '#ef4444' }]}>{data.aiStats.highRisk}</Text>
            <Text style={styles.kpiLabel}>Risque élevé</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{data.aiStats.mediumRisk}</Text>
            <Text style={styles.kpiLabel}>Risque moyen</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>{data.aiStats.lowRisk}</Text>
            <Text style={styles.kpiLabel}>Risque faible</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#7c3aed' }]}>
            <Text style={[styles.kpiValue, { color: '#7c3aed' }]}>{data.aiStats.flaggedFraud}</Text>
            <Text style={styles.kpiLabel}>Suspicion fraude</Text>
          </View>
        </View>

        <Text style={styles.subSectionTitle}>Documents</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmt(data.documents.totalUploaded)}</Text>
            <Text style={styles.kpiLabel}>Documents uploadés</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>
              {fmt(data.documents.totalVerified)}
            </Text>
            <Text style={styles.kpiLabel}>Vérifiés</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>
              {fmt(data.documents.pendingVerification)}
            </Text>
            <Text style={styles.kpiLabel}>En attente vérification</Text>
          </View>
        </View>

        <PageFooter period={data.period} />
      </Page>
    </Document>
  );
}
