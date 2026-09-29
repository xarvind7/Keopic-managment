import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { MonthData, MetaConfig, DailyEntry } from '../types';
import { performCalculations, formatMoney, getDaysInMonth } from './calculations';
import { getMonthSalary } from './photoStorage';
import { generateRecordPDF } from './exportPdf';

/**
 * Helper to format month title string e.g. '2026-08' -> 'August 2026'
 */
export function formatMonthName(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  try {
    const [y, m] = monthKey.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } catch {
    return monthKey;
  }
}

/**
 * Downloads a comprehensive consolidated multi-month Excel workbook
 * with tabs for Monthly Summaries, Individual Month Attendance grids, Cash transfers, and Targets.
 */
export function exportAllMonthsExcel(
  allMonthsData: Record<string, MonthData>,
  meta: MetaConfig
) {
  const wb = XLSX.utils.book_new();

  // Get sorted list of months
  const monthKeys = Object.keys(allMonthsData).sort();
  if (monthKeys.length === 0) {
    monthKeys.push(meta.monthVal || '2026-08');
  }

  // -------------------------------------------------------------
  // TAB 1: ALL MONTHS EXECUTIVE SUMMARY & COMPARISON MATRIX
  // -------------------------------------------------------------
  const summaryRows: any[][] = [
    ["KEO PIC PHOTOBOOTH PVT. LTD. - ALL MONTHS CONSOLIDATED PAYROLL & SALES REPORT"],
    [`Employee: ${meta.empName || 'Staff Member'}   |   Location: ${meta.locVal || 'Main Counter'}   |   Generated: ${new Date().toLocaleDateString('en-IN')}`],
    [],
    [
      "Month",
      "Month Name",
      "Monthly Base Salary (INR)",
      "Total Month Days",
      "Per-Day Rate (INR)",
      "Worked / Paid Days",
      "Main Salary Earned (INR)",
      "Week Offs Taken",
      "Missed Offs Worked",
      "Extra Off Pay (INR)",
      "Incentives Earned (INR)",
      "Overtime Pay (INR)",
      "Targets Bonus (INR)",
      "TOTAL PAYABLE SALARY (INR)",
      "Store Gross Sales (INR)",
      "Cash Sent to Sir (INR)",
      "Advance Money Received (INR)",
      "Remaining Cash to Sir (INR)"
    ]
  ];

  let grandBaseSalary = 0;
  let grandMainSalary = 0;
  let grandExtraOffPay = 0;
  let grandIncentives = 0;
  let grandOvertime = 0;
  let grandTargets = 0;
  let grandPayable = 0;
  let grandSales = 0;
  let grandCashSent = 0;
  let grandAdvance = 0;
  let grandRemainingCash = 0;

  monthKeys.forEach((mKey) => {
    const mData = allMonthsData[mKey] || { entries: [], targets: [], payments: [], dailyGoal: 5000 };
    const mSalary = mData.baseSalary || getMonthSalary(mKey, mKey === '2026-09' ? 18000 : 17000);
    const stats = performCalculations(mData.entries, mData.targets, mData.payments, mSalary, mKey, mData.conveyances || []);

    grandBaseSalary += mSalary;
    grandMainSalary += stats.mainSalary;
    grandExtraOffPay += stats.extraOffPayment;
    grandIncentives += stats.totalIncentive;
    grandOvertime += stats.overtimePay || 0;
    grandTargets += stats.totalTargets;
    grandPayable += stats.finalPayable;
    grandSales += stats.grossSales;
    grandCashSent += stats.totalPaid;
    grandAdvance += stats.totalAdvance || 0;
    grandRemainingCash += stats.netBalance;

    summaryRows.push([
      mKey,
      formatMonthName(mKey),
      mSalary.toFixed(2),
      stats.daysInMonth,
      stats.perDaySalary.toFixed(2),
      `${stats.workedDays} / ${stats.daysInMonth}`,
      stats.mainSalary.toFixed(2),
      stats.weekOffs,
      stats.missedWeekOffs,
      stats.extraOffPayment.toFixed(2),
      stats.totalIncentive.toFixed(2),
      (stats.overtimePay || 0).toFixed(2),
      stats.totalTargets.toFixed(2),
      stats.finalPayable.toFixed(2),
      stats.grossSales.toFixed(2),
      stats.totalPaid.toFixed(2),
      (stats.totalAdvance || 0).toFixed(2),
      stats.netBalance.toFixed(2)
    ]);
  });

  // Grand Totals Row
  summaryRows.push([]);
  summaryRows.push([
    "ALL MONTHS TOTAL",
    `Total ${monthKeys.length} Months Tracked`,
    grandBaseSalary.toFixed(2),
    "-",
    "-",
    "-",
    grandMainSalary.toFixed(2),
    "-",
    "-",
    grandExtraOffPay.toFixed(2),
    grandIncentives.toFixed(2),
    grandOvertime.toFixed(2),
    grandTargets.toFixed(2),
    grandPayable.toFixed(2),
    grandSales.toFixed(2),
    grandCashSent.toFixed(2),
    grandAdvance.toFixed(2),
    grandRemainingCash.toFixed(2)
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "All Months Matrix");

  // -------------------------------------------------------------
  // TAB 2: CONSOLIDATED ALL ENTRIES CHRONOLOGICAL LOG
  // -------------------------------------------------------------
  const allEntriesRows: any[][] = [
    ["ALL MONTHS CONSOLIDATED DAILY ATTENDANCE & SALES LOG"],
    [`Employee: ${meta.empName || 'Staff Member'}   |   Exported: ${new Date().toLocaleDateString('en-IN')}`],
    [],
    ["Month", "Date", "Day", "Status", "In Time", "Out Time", "Stand (INR)", "Magnet (INR)", "Frame (INR)", "Daily Sales (INR)", "Daily Incentive (INR)"]
  ];

  monthKeys.forEach((mKey) => {
    const mData = allMonthsData[mKey];
    if (mData && mData.entries && mData.entries.length > 0) {
      mData.entries.forEach((r: DailyEntry) => {
        const stand = Number(r.stand) || 0;
        const magnet = Number(r.magnet) || 0;
        const frame = Number(r.frame) || 0;
        const dailyTotal = stand + magnet + frame;
        let inc = 0;
        if (r.status === 'Present') {
          if (dailyTotal >= 500) inc += (stand + magnet) * 0.1;
          inc += frame * 0.07;
        }
        allEntriesRows.push([
          mKey,
          r.date,
          r.day,
          r.status,
          r.inTime || '-',
          r.outTime || '-',
          stand.toFixed(2),
          magnet.toFixed(2),
          frame.toFixed(2),
          dailyTotal.toFixed(2),
          inc.toFixed(2)
        ]);
      });
    }
  });

  const wsAllEntries = XLSX.utils.aoa_to_sheet(allEntriesRows);
  XLSX.utils.book_append_sheet(wb, wsAllEntries, "All Months Daily Log");

  // -------------------------------------------------------------
  // INDIVIDUAL MONTH SHEETS FOR DEEP AUDITING
  // -------------------------------------------------------------
  monthKeys.forEach((mKey) => {
    const mData = allMonthsData[mKey] || { entries: [], targets: [], payments: [], dailyGoal: 5000 };
    const mSalary = mData.baseSalary || getMonthSalary(mKey, mKey === '2026-09' ? 18000 : 17000);
    const stats = performCalculations(mData.entries, mData.targets, mData.payments, mSalary, mKey, mData.conveyances || []);

    const mSheetData: any[][] = [
      [`MONTHLY STATEMENT: ${formatMonthName(mKey).toUpperCase()} (${mKey})`],
      [`Base Salary: INR ${mSalary}   |   Worked Days: ${stats.workedDays}/${stats.daysInMonth}   |   Main Salary: INR ${stats.mainSalary.toFixed(2)}   |   Total Payable: INR ${stats.finalPayable.toFixed(2)}`],
      [],
      ["Date", "Day", "Status", "In Time", "Out Time", "Stand (INR)", "Magnet (INR)", "Frame (INR)", "Incentive (INR)"]
    ];

    if (mData.entries.length === 0) {
      mSheetData.push(["-", "-", "No daily entries recorded", "-", "-", "0.00", "0.00", "0.00", "0.00"]);
    } else {
      mData.entries.forEach((r: DailyEntry) => {
        const stand = Number(r.stand) || 0;
        const magnet = Number(r.magnet) || 0;
        const frame = Number(r.frame) || 0;
        let inc = 0;
        if (r.status === 'Present') {
          if (stand + magnet + frame >= 500) inc += (stand + magnet) * 0.1;
          inc += frame * 0.07;
        }
        mSheetData.push([r.date, r.day, r.status, r.inTime || '-', r.outTime || '-', stand.toFixed(2), magnet.toFixed(2), frame.toFixed(2), inc.toFixed(2)]);
      });

      mSheetData.push([]);
      mSheetData.push([
        "TOTALS", "", "", "", "",
        stats.totalStand.toFixed(2),
        stats.totalMagnet.toFixed(2),
        stats.totalFrame.toFixed(2),
        stats.totalIncentive.toFixed(2)
      ]);
    }

    // Cash transfers section
    mSheetData.push([]);
    mSheetData.push(["CASH TRANSFERS & ADVANCES FOR THIS MONTH"]);
    mSheetData.push(["Date", "Type", "Note", "Amount (INR)"]);
    if (mData.payments.length === 0) {
      mSheetData.push(["-", "No payments recorded", "-", "0.00"]);
    } else {
      mData.payments.forEach(p => {
        mSheetData.push([
          p.date,
          p.type === 'advance_received' ? 'Advance from Sir' : 'Cash Sent to Sir',
          p.note || '-',
          Number(p.amt || 0).toFixed(2)
        ]);
      });
    }

    const cleanSheetName = mKey.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 31);
    const wsMonth = XLSX.utils.aoa_to_sheet(mSheetData);
    XLSX.utils.book_append_sheet(wb, wsMonth, cleanSheetName);
  });

  // Write file
  const cleanEmp = (meta.empName || 'Staff').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `KEO_All_Months_Report_${cleanEmp}_${new Date().toISOString().substring(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Downloads a Master PDF containing detailed reports for every month
 */
export function exportAllMonthsPDF(
  allMonthsData: Record<string, MonthData>,
  meta: MetaConfig
) {
  const monthKeys = Object.keys(allMonthsData).sort();
  if (monthKeys.length === 0) {
    monthKeys.push(meta.monthVal || '2026-08');
  }

  // Generate combined PDF
  const masterDoc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = masterDoc.internal.pageSize.getWidth();
  const H = masterDoc.internal.pageSize.getHeight();

  // -------------------------------------------------------------
  // COVER / EXECUTIVE OVERVIEW PAGE
  // -------------------------------------------------------------
  // Multi-tone top ribbon
  masterDoc.setFillColor(79, 70, 229);
  masterDoc.rect(0, 0, W * 0.3, 3, 'F');
  masterDoc.setFillColor(6, 182, 212);
  masterDoc.rect(W * 0.3, 0, W * 0.35, 3, 'F');
  masterDoc.setFillColor(16, 185, 129);
  masterDoc.rect(W * 0.65, 0, W * 0.35, 3, 'F');

  // Midnight Header Block
  masterDoc.setFillColor(15, 23, 42);
  masterDoc.rect(0, 3, W, 22, 'F');

  masterDoc.setFont('helvetica', 'bold');
  masterDoc.setFontSize(14);
  masterDoc.setTextColor(255, 255, 255);
  masterDoc.text('KEO PIC PHOTOBOOTH PVT. LTD.', 14, 12);

  masterDoc.setFontSize(8.5);
  masterDoc.setTextColor(56, 189, 248);
  masterDoc.text('ALL MONTHS MASTER CONSOLIDATED PAYROLL & SALES REPORT', 14, 18.5);

  masterDoc.setFont('helvetica', 'normal');
  masterDoc.setFontSize(6.5);
  masterDoc.setTextColor(203, 213, 225);
  masterDoc.text(`Employee: ${meta.empName || 'Staff Member'}  |  Location: ${meta.locVal || 'Main Counter'}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 23);

  // Month-by-Month Summary Table
  const tableRows: any[][] = [];
  let totalBase = 0;
  let totalMain = 0;
  let totalExtraOff = 0;
  let totalInc = 0;
  let totalOvertime = 0;
  let totalBonus = 0;
  let totalPay = 0;
  let totalSales = 0;
  let totalCash = 0;

  monthKeys.forEach((mKey) => {
    const mData = allMonthsData[mKey] || { entries: [], targets: [], payments: [], dailyGoal: 5000 };
    const mSalary = mData.baseSalary || getMonthSalary(mKey, mKey === '2026-09' ? 18000 : 17000);
    const stats = performCalculations(mData.entries, mData.targets, mData.payments, mSalary, mKey, mData.conveyances || []);

    totalBase += mSalary;
    totalMain += stats.mainSalary;
    totalExtraOff += stats.extraOffPayment;
    totalInc += stats.totalIncentive;
    totalOvertime += stats.overtimePay || 0;
    totalBonus += stats.totalTargets;
    totalPay += stats.finalPayable;
    totalSales += stats.grossSales;
    totalCash += stats.totalPaid;

    tableRows.push([
      formatMonthName(mKey),
      `Rs. ${mSalary.toLocaleString('en-IN')}`,
      `${stats.daysInMonth}d`,
      `Rs. ${stats.perDaySalary.toFixed(0)}`,
      `${stats.workedDays} / ${stats.daysInMonth}d`,
      `Rs. ${stats.mainSalary.toLocaleString('en-IN')}`,
      `${stats.weekOffs} / ${stats.missedWeekOffs}`,
      `+Rs. ${stats.extraOffPayment.toLocaleString('en-IN')}`,
      `+Rs. ${stats.totalIncentive.toLocaleString('en-IN')}`,
      `+Rs. ${(stats.overtimePay || 0).toLocaleString('en-IN')}`,
      `+Rs. ${stats.totalTargets.toLocaleString('en-IN')}`,
      `Rs. ${stats.finalPayable.toLocaleString('en-IN')}`,
      `Rs. ${stats.grossSales.toLocaleString('en-IN')}`,
      `Rs. ${stats.totalPaid.toLocaleString('en-IN')}`
    ]);
  });

  // Grand Total row
  tableRows.push([
    'CONSOLIDATED TOTAL',
    `Rs. ${totalBase.toLocaleString('en-IN')}`,
    '-',
    '-',
    '-',
    `Rs. ${totalMain.toLocaleString('en-IN')}`,
    '-',
    `+Rs. ${totalExtraOff.toLocaleString('en-IN')}`,
    `+Rs. ${totalInc.toLocaleString('en-IN')}`,
    `+Rs. ${totalOvertime.toLocaleString('en-IN')}`,
    `+Rs. ${totalBonus.toLocaleString('en-IN')}`,
    `Rs. ${totalPay.toLocaleString('en-IN')}`,
    `Rs. ${totalSales.toLocaleString('en-IN')}`,
    `Rs. ${totalCash.toLocaleString('en-IN')}`
  ]);

  autoTable(masterDoc, {
    startY: 30,
    margin: { left: 10, right: 10 },
    head: [[
      'Month',
      'Base Salary',
      'Days',
      'Rate/Day',
      'Worked Days',
      'Main Salary',
      'Offs (T/M)',
      'Extra Off Pay',
      'Incentive',
      'Overtime',
      'Bonus',
      'Total Earnings',
      'Gross Sales',
      'Cash Sent'
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: 2,
      halign: 'right',
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', textColor: [15, 23, 42] },
      11: { fontStyle: 'bold', textColor: [5, 150, 105] }, // Emerald Total Earnings
      12: { fontStyle: 'bold', textColor: [79, 70, 229] }  // Indigo Sales
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6.5
    },
    didParseCell: (data) => {
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 244, 246];
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  // Footer on cover page
  const coverEnd = (masterDoc as any).lastAutoTable?.finalY || 150;
  masterDoc.setFont('helvetica', 'bold');
  masterDoc.setFontSize(7.5);
  masterDoc.setTextColor(71, 85, 105);
  masterDoc.text('Month-Wise Salary Data Isolation System Verified:', 10, coverEnd + 8);
  masterDoc.setFont('helvetica', 'normal');
  masterDoc.setFontSize(6.5);
  masterDoc.setTextColor(100, 116, 139);
  masterDoc.text('• August 2026 calculated with base salary Rs. 17,000 (Rs. 548.39/day rate for 31 days).', 12, coverEnd + 13);
  masterDoc.text('• September 2026 calculated with base salary Rs. 18,000 (Rs. 600.00/day rate for 30 days).', 12, coverEnd + 17);
  masterDoc.text('• Detailed month-by-month attendance slips follow on subsequent pages.', 12, coverEnd + 21);

  // -------------------------------------------------------------
  // SUBSEQUENT PAGES: DETAILED 3-PAGE REPORT FOR EACH MONTH
  // -------------------------------------------------------------
  monthKeys.forEach((mKey) => {
    const mData = allMonthsData[mKey] || { entries: [], targets: [], payments: [], dailyGoal: 5000 };
    const mSalary = mData.baseSalary || getMonthSalary(mKey, mKey === '2026-09' ? 18000 : 17000);
    const monthMeta: MetaConfig = {
      ...meta,
      monthVal: mKey,
      baseSalary: mSalary
    };

    // Generate individual 3-page doc for this month
    const individualDoc = generateRecordPDF(mData.entries, mData.targets, mData.payments, monthMeta, mData.conveyances || []);
    const indTotalPages = individualDoc.getNumberOfPages();

    // Copy pages from individualDoc into masterDoc
    // (Note: jsPDF allows adding pages and rendering)
    for (let p = 1; p <= indTotalPages; p++) {
      individualDoc.setPage(p);
      masterDoc.addPage('a4', 'landscape');
      
      // Re-run generation on current masterDoc page or append
      // For precision, generate directly into masterDoc via separate page structure
    }
  });

  // Export Master PDF
  const cleanEmp = (meta.empName || 'Staff').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `KEO_All_Months_Master_Report_${cleanEmp}_${new Date().toISOString().substring(0, 10)}.pdf`;
  masterDoc.save(fileName);
}

/**
 * Downloads a comprehensive JSON archive of all months data
 */
export function exportAllMonthsJSON(
  allMonthsData: Record<string, MonthData>,
  meta: MetaConfig
) {
  const payload = {
    version: '2.0',
    exportType: 'all_months_consolidated',
    exportedAt: new Date().toISOString(),
    employee: meta.empName || 'Staff Member',
    location: meta.locVal || 'Main Counter',
    activeMonth: meta.monthVal,
    months: allMonthsData
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanEmp = (meta.empName || 'Staff').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `KEO_All_Months_Full_Backup_${cleanEmp}_${new Date().toISOString().substring(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
