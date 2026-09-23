import * as XLSX from 'xlsx';
import { Pledge, Contribution, Expense, AdminFinancialSummary, AuditLog } from '../types.ts';

// Helper to format currency numbers
const fmtNum = (val: number) => Number(val || 0);

export function exportPartnerHistoryToExcel(
  partnerName: string,
  pledges: Pledge[],
  contributions: Contribution[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Pledges Sheet
  const pledgesData = pledges.map((p) => {
    const remaining = Math.max(0, p.amount - p.fulfilledAmount);
    let hali = 'Inasubiri';
    if (p.status === 'fulfilled') hali = 'Imekamilika';
    else if (p.status === 'partial') hali = 'Kiasi Kimetolewa';
    else if (p.status === 'overdue') hali = 'Imepitiliza Ukomo';

    return {
      'Namba ya Ahadi': p.pledgeNumber,
      'Kusudi / Lengo': p.purpose,
      'Kiasi Kilichoahidiwa (TZS)': fmtNum(p.amount),
      'Kiasi Kilichotolewa (TZS)': fmtNum(p.fulfilledAmount),
      'Salio Lililobaki (TZS)': fmtNum(remaining),
      'Tarehe ya Ahadi': p.pledgeDate,
      'Tarehe ya Ukomo': p.dueDate,
      'Hali ya Ahadi': hali,
      'Maelezo': p.notes || '',
    };
  });

  const wsPledges = XLSX.utils.json_to_sheet(pledgesData);
  XLSX.utils.book_append_sheet(wb, wsPledges, 'Ahadi za Sadaka');

  // 2. Contributions Sheet
  const contributionsData = contributions.map((c) => ({
    'Namba ya Risiti': c.receiptNumber,
    'Namba ya Ahadi': c.pledgeNumber,
    'Kiasi Kilichotolewa (TZS)': fmtNum(c.amount),
    'Tarehe ya Malipo': c.paymentDate,
    'Njia ya Malipo': c.paymentMethod,
    'Kumbukumbu ya Muamala': c.reference || '',
    'Maelezo ya Ziada': c.notes || '',
  }));

  const wsContributions = XLSX.utils.json_to_sheet(contributionsData);
  XLSX.utils.book_append_sheet(wb, wsContributions, 'Michango Iliyotolewa');

  // 3. Summary Sheet
  const totalPledged = pledges.reduce((a, b) => a + b.amount, 0);
  const totalFulfilled = contributions.reduce((a, b) => a + b.amount, 0);
  const totalBalance = Math.max(0, totalPledged - totalFulfilled);

  const summaryData = [
    { 'Taarifa ya Mshirika': 'Jina Kamili', 'Kiwango / Thamani': partnerName },
    { 'Taarifa ya Mshirika': 'Jumla ya Ahadi Zilizowekwa (TZS)', 'Kiwango / Thamani': totalPledged },
    { 'Taarifa ya Mshirika': 'Jumla ya Michango Iliyotolewa (TZS)', 'Kiwango / Thamani': totalFulfilled },
    { 'Taarifa ya Mshirika': 'Salio Lililobaki Kutoa (TZS)', 'Kiwango / Thamani': totalBalance },
    { 'Taarifa ya Mshirika': 'Tarehe ya Kutoa Taarifa', 'Kiwango / Thamani': new Date().toLocaleString('sw-TZ') },
    { 'Taarifa ya Mshirika': 'Huduma', 'Kiwango / Thamani': 'Jerusalem Ministry of Gospel - Partnership Program' },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Muhtasari wa Fedha');

  // Trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  const sanitizedName = partnerName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Ripoti_ya_Sadaka_${sanitizedName}_${dateStr}.xlsx`);
}

export function exportAdminReportToExcel(
  overview: AdminFinancialSummary,
  partners: any[],
  pledges: Pledge[],
  contributions: Contribution[],
  expenses: Expense[],
  auditLogs: AuditLog[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Financial Overview
  const overviewData = [
    { 'Kipengele cha Fedha': 'Jumla ya Washirika Waliosajiliwa', 'Kiwango / Thamani': overview.totalPartnersCount },
    { 'Kipengele cha Fedha': 'Jumla ya Ahadi Zote za Huduma (TZS)', 'Kiwango / Thamani': fmtNum(overview.totalPledgedAmount) },
    { 'Kipengele cha Fedha': 'Jumla ya Michango Iliyokusanywa (TZS)', 'Kiwango / Thamani': fmtNum(overview.totalFulfilledAmount) },
    { 'Kipengele cha Fedha': 'Salio la Ahadi Zisizokamilika (TZS)', 'Kiwango / Thamani': fmtNum(overview.totalOutstandingAmount) },
    { 'Kipengele cha Fedha': 'Jumla ya Matumizi ya Huduma (TZS)', 'Kiwango / Thamani': fmtNum(overview.totalExpensesAmount) },
    { 'Kipengele cha Fedha': 'Salio Halisi la Mfuko wa Huduma (TZS)', 'Kiwango / Thamani': fmtNum(overview.ministryNetBalance) },
    { 'Kipengele cha Fedha': 'Idadi ya Ahadi Zote', 'Kiwango / Thamani': overview.totalPledgesCount },
    { 'Kipengele cha Fedha': 'Idadi ya Michango Yote', 'Kiwango / Thamani': overview.totalContributionsCount },
    { 'Kipengele cha Fedha': 'Tarehe ya Ripoti', 'Kiwango / Thamani': new Date().toLocaleString('sw-TZ') },
  ];
  const wsOverview = XLSX.utils.json_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Muhtasari wa Huduma');

  // Sheet 2: All Partners
  const partnersData = partners.map((p) => ({
    'Jina Kamili': p.fullName,
    'Namba ya Simu': p.phone,
    'Barua Pepe': p.email,
    'Mahali / Eneo': p.location || '',
    'Daraja la Mshirika': p.partnershipTier || '',
    'Ahadi Alizoweka (TZS)': fmtNum(p.totalPledged),
    'Michango Aliyotoa (TZS)': fmtNum(p.totalFulfilled),
    'Salio Analodaiwa (TZS)': fmtNum(p.balance),
    'Tarehe ya Kujiunga': p.createdAt?.slice(0, 10) || '',
  }));
  const wsPartners = XLSX.utils.json_to_sheet(partnersData);
  XLSX.utils.book_append_sheet(wb, wsPartners, 'Washirika Wote');

  // Sheet 3: All Pledges
  const pledgesData = pledges.map((p) => ({
    'Namba ya Ahadi': p.pledgeNumber,
    'Mshirika': p.userName,
    'Simu ya Mshirika': p.userPhone,
    'Kusudi / Lengo': p.purpose,
    'Kiasi Kilichoahidiwa (TZS)': fmtNum(p.amount),
    'Kiasi Kilichotolewa (TZS)': fmtNum(p.fulfilledAmount),
    'Salio Lililobaki (TZS)': fmtNum(Math.max(0, p.amount - p.fulfilledAmount)),
    'Tarehe ya Ahadi': p.pledgeDate,
    'Tarehe ya Ukomo': p.dueDate,
    'Hali ya Ahadi': p.status,
    'Maelezo': p.notes || '',
  }));
  const wsPledges = XLSX.utils.json_to_sheet(pledgesData);
  XLSX.utils.book_append_sheet(wb, wsPledges, 'Ahadi Zote');

  // Sheet 4: All Contributions
  const contributionsData = contributions.map((c) => ({
    'Namba ya Risiti': c.receiptNumber,
    'Namba ya Ahadi': c.pledgeNumber,
    'Mshirika': c.userName,
    'Kiasi Kilicholipwa (TZS)': fmtNum(c.amount),
    'Tarehe ya Malipo': c.paymentDate,
    'Njia ya Malipo': c.paymentMethod,
    'Kumbukumbu ya Muamala': c.reference || '',
    'Iliandikishwa na': c.recordedBy,
  }));
  const wsContributions = XLSX.utils.json_to_sheet(contributionsData);
  XLSX.utils.book_append_sheet(wb, wsContributions, 'Michango Yote');

  // Sheet 5: Expenses (Confidential)
  const expensesData = expenses.map((e) => ({
    'Kategoria ya Matumizi': e.category,
    'Kiasi Kilichotumika (TZS)': fmtNum(e.amount),
    'Tarehe': e.date,
    'Maelezo ya Matumizi': e.description,
    'Maelezo ya Ziada / Risiti': e.supportingDetails,
    'Iliidhinishwa na': e.recordedBy,
  }));
  const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Matumizi ya Huduma');

  // Sheet 6: Audit Logs
  const auditData = auditLogs.map((l) => ({
    'Tarehe na Saa': new Date(l.timestamp).toLocaleString('sw-TZ'),
    'Mhusika': l.actorName,
    'Wadhifa': l.actorRole === 'admin' ? 'Msimamizi Mkuu' : 'Mshirika',
    'Kitendo': l.action,
    'Maelezo': l.description,
  }));
  const wsAudit = XLSX.utils.json_to_sheet(auditData);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Kumbukumbu za Matukio');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Ripoti_Kuu_ya_Fedha_Jerusalem_Ministry_${dateStr}.xlsx`);
}
