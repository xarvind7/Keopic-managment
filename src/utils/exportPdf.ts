import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyEntry, TargetEntry, PaymentEntry, MetaConfig, ConveyanceEntry } from '../types';
import { performCalculations, CalculationResult } from './calculations';

/**
 * Generate official Keopic Photobooth Camera Logo Data URL (High-res 400x400 PNG)
 */
function getKeopicLogoDataUrl(size = 400): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const scale = size / 200;
    ctx.save();
    ctx.scale(scale, scale);

    // Outer White Ring with Black Outline
    ctx.beginPath();
    ctx.arc(100, 100, 96, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Outer Black Inner Ring
    ctx.beginPath();
    ctx.arc(100, 100, 86, 0, Math.PI * 2);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Top Cyan Semi-Circle (#5eead4 / #2dd4bf)
    ctx.beginPath();
    ctx.arc(100, 100, 82, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = '#5eead4';
    ctx.fill();

    // Bottom Pink Semi-Circle (#f0abfc / #e879f9)
    ctx.beginPath();
    ctx.arc(100, 100, 82, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#f0abfc';
    ctx.fill();

    // White shine highlights inside top and bottom arcs
    ctx.beginPath();
    ctx.arc(100, 100, 50, -Math.PI * 0.35, -Math.PI * 0.15);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(100, 100, 50, Math.PI * 0.65, Math.PI * 0.85);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Camera Body Line Art (Dark Navy / Black)
    ctx.beginPath();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#0f172a';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Top Camera Viewfinder Notch
    ctx.moveTo(75, 60);
    ctx.lineTo(125, 60);
    ctx.arcTo(133, 60, 133, 68, 8);
    ctx.lineTo(133, 74);
    ctx.lineTo(148, 74);
    ctx.arcTo(160, 74, 160, 86, 12);
    ctx.lineTo(160, 98);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(40, 98);
    ctx.lineTo(40, 86);
    ctx.arcTo(40, 74, 52, 74, 12);
    ctx.lineTo(67, 74);
    ctx.lineTo(67, 68);
    ctx.arcTo(67, 60, 75, 60, 8);
    ctx.stroke();

    // Bottom Camera Base
    ctx.beginPath();
    ctx.moveTo(52, 128);
    ctx.lineTo(52, 136);
    ctx.arcTo(52, 148, 64, 148, 12);
    ctx.lineTo(136, 148);
    ctx.arcTo(148, 148, 148, 136, 12);
    ctx.lineTo(148, 128);
    ctx.stroke();

    // Middle Horizontal Lines
    ctx.beginPath();
    ctx.moveTo(18, 100);
    ctx.lineTo(70, 100);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(130, 100);
    ctx.lineTo(182, 100);
    ctx.stroke();

    // Central Camera Lens Outer Ring
    ctx.beginPath();
    ctx.arc(100, 100, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Central Lens Inner Aperture (Black)
    ctx.beginPath();
    ctx.arc(100, 100, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Lens Catchlight (White circle)
    ctx.beginPath();
    ctx.arc(94, 94, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Error generating Keopic logo canvas:', e);
    return '';
  }
}

const MIN_OVERTIME_MINUTES_FOR_PAY = 60; // 1 hour threshold for overtime payment

function parseWorkHoursDetailed(inTime?: string, outTime?: string, status?: string, standardShiftMins = 540): {
  totalMinutes: number;
  workFormatted: string;
  extraMinutes: number;
  extraFormatted: string;
  payableExtraMinutes: number;
} {
  if (status !== 'Present' || !inTime || !outTime) {
    return { totalMinutes: 0, workFormatted: '-', extraMinutes: 0, extraFormatted: '-', payableExtraMinutes: 0 };
  }
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) {
    return { totalMinutes: 0, workFormatted: '-', extraMinutes: 0, extraFormatted: '-', payableExtraMinutes: 0 };
  }
  let mins = (outH * 60 + outM) - (inH * 60 + inM);
  if (mins < 0) mins += 24 * 60; // handle overnight shift

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const workFormatted = `${h}h${m > 0 ? ` ${m}m` : ''}`;

  const extraMins = Math.max(0, mins - standardShiftMins);
  const extraH = Math.floor(extraMins / 60);
  const extraM = extraMins % 60;
  const extraFormatted = extraMins > 0 ? `+${extraH}h${extraM > 0 ? ` ${extraM}m` : ''}` : '-';
  const payableExtraMinutes = extraMins >= MIN_OVERTIME_MINUTES_FOR_PAY ? extraMins : 0;

  return {
    totalMinutes: mins,
    workFormatted,
    extraMinutes: extraMins,
    extraFormatted,
    payableExtraMinutes
  };
}

// Convert Number to Indian Rupee Words for official payslip touch
function numberToWordsINR(num: number): string {
  const rounded = Math.round(num);
  if (rounded <= 0) return 'Zero Rupees Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return single[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tens[t] + (u > 0 ? ' ' + single[u] : '');
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let str = '';
    if (h > 0) str += single[h] + ' Hundred';
    if (rem > 0) str += (str ? ' ' : '') + convertTwoDigits(rem);
    return str;
  }

  let crore = Math.floor(rounded / 10000000);
  let rem = rounded % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  let thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  let hundred = rem;

  let words = '';
  if (crore > 0) words += convertTwoDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertTwoDigits(thousand) + ' Thousand ';
  if (hundred > 0) words += convertThreeDigits(hundred) + ' ';

  return (words.trim() + ' Rupees Only');
}

/**
 * Draw Top Branded Liquid Glass Header Strip on any page
 */
function drawPageHeader(doc: jsPDF, W: number, title: string, subtitle: string, formattedMonth: string, statementId: string, emp: string, loc: string, keopicLogoDataUrl: string) {
  // 1. Top Multi-Tone Liquid Glass Spectrum Ribbon
  const bannerColors = [
    { c: [99, 102, 241], w: 0.22 },  // Indigo-500
    { c: [168, 85, 247], w: 0.18 }, // Purple-500
    { c: [6, 182, 212], w: 0.22 },  // Cyan-500
    { c: [16, 185, 129], w: 0.20 }, // Emerald-500
    { c: [245, 158, 11], w: 0.18 }  // Amber-500
  ];
  let curBX = 0;
  bannerColors.forEach(b => {
    doc.setFillColor(b.c[0], b.c[1], b.c[2]);
    doc.rect(curBX, 0, W * b.w, 2.2, 'F');
    curBX += W * b.w;
  });

  // Top Gloss Specular Highlight Line on Spectrum
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(0, 0.4, W, 0.4);

  // 2. Liquid Midnight Slate-900 Header Container with Frosted Glow
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 2.2, W, 17, 'F');

  // Bottom Header Glass Edge
  doc.setDrawColor(51, 65, 85); // Slate-700
  doc.setLineWidth(0.35);
  doc.line(0, 19.2, W, 19.2);

  // Keopic Camera Logo in Glowing Glass Ring
  if (keopicLogoDataUrl) {
    try {
      doc.setFillColor(30, 41, 59);
      doc.setDrawColor(56, 189, 248);
      doc.setLineWidth(0.3);
      doc.roundedRect(9.5, 3.2, 15.5, 15.5, 2.5, 2.5, 'FD');
      doc.addImage(keopicLogoDataUrl, 'PNG', 10, 3.5, 14.5, 14.5);
    } catch {
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(10, 3.8, 14, 14, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('KP', 17, 12.5, { align: 'center' });
    }
  }

  // Brand & Page Titles with High-Contrast Typography
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text('KEO PIC PHOTOBOOTH PVT. LTD.', 28, 8.3);

  // Cyan Neon Pill Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(56, 189, 248); // Sky-400
  doc.text(title, 28, 12.4);

  // Store & Staff Metadata Subtext
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(203, 213, 225);
  doc.text(`${subtitle}  |  Store: ${loc}  |  Staff: ${emp}`, 28, 16.5);

  // Right Liquid Glass Tag Capsule (Billing Month & Doc ID)
  doc.setFillColor(30, 41, 59); // Slate-800 Glass
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.35);
  doc.roundedRect(W - 68, 3.8, 58, 14, 2, 2, 'FD');

  // Glass reflection on capsule
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.25);
  doc.line(W - 66, 4.3, W - 12, 4.3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text('STATEMENT BILLING MONTH', W - 39, 7.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(253, 224, 71); // Amber Gold
  doc.text(formattedMonth.toUpperCase(), W - 39, 11.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Doc ID: ${statementId}`, W - 39, 15.3, { align: 'center' });
}

export function generateRecordPDF(
  entries: DailyEntry[] = [],
  targets: TargetEntry[] = [],
  payments: PaymentEntry[] = [],
  meta: MetaConfig = { empName: 'Staff Member', monthVal: '2026-08', locVal: 'Main Counter', baseSalary: 17000 },
  conveyances: ConveyanceEntry[] = []
) {
  const stats: CalculationResult = performCalculations(entries, targets, payments, meta.baseSalary, meta.monthVal, conveyances);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(); // 297 mm
  const H = doc.internal.pageSize.getHeight(); // 210 mm

  const emp = meta.empName || 'Staff Member';
  const mon = meta.monthVal || '2026-08';
  const loc = meta.locVal || 'Main Store Counter';
  const statementId = `KP-PAY-${mon.replace('-', '')}-${Math.floor(100000 + Math.random() * 900000)}`;
  const empCode = `KP-EMP-${mon.replace('-', '').slice(2)}`;

  // Generate official Keopic Photobooth camera logo image
  const keopicLogoDataUrl = getKeopicLogoDataUrl(400);

  // Parse Month Name (e.g. August 2026)
  let formattedMonth = mon;
  try {
    const [y, m] = mon.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, 1);
    formattedMonth = dateObj.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } catch {
    formattedMonth = mon;
  }

  // Calculate duty hours & overtime
  let grandTotalWorkMinutes = 0;
  let grandTotalExtraMinutes = 0;
  entries.forEach(r => {
    const wh = parseWorkHoursDetailed(r.inTime, r.outTime, r.status);
    grandTotalWorkMinutes += wh.totalMinutes;
    grandTotalExtraMinutes += wh.extraMinutes;
  });

  const totalWorkHrsInt = Math.floor(grandTotalWorkMinutes / 60);
  const totalWorkMinsRem = grandTotalWorkMinutes % 60;
  const formattedGrandWorkHrs = `${totalWorkHrsInt}h ${totalWorkMinsRem}m`;

  const totalExtraHrsInt = Math.floor(grandTotalExtraMinutes / 60);
  const totalExtraMinsRem = grandTotalExtraMinutes % 60;
  const formattedGrandExtraHrs = grandTotalExtraMinutes > 0 ? `+${totalExtraHrsInt}h ${totalExtraMinsRem}m` : '0h 0m';

  // Categorize Payments
  const sentToSirPayments = payments.filter(p => !p.type || p.type === 'sent_to_sir');
  const advancePayments = payments.filter(p => p.type === 'advance_received');

  // Map of cash sent to Sir per date
  const cashSentPerDateMap = new Map<string, number>();
  sentToSirPayments.forEach(p => {
    const amt = Number(p.amt) || 0;
    if (p.date) {
      cashSentPerDateMap.set(p.date, (cashSentPerDateMap.get(p.date) || 0) + amt);
    }
  });

  // Map of advance received per date
  const advancePerDateMap = new Map<string, number>();
  advancePayments.forEach(p => {
    const amt = Number(p.amt) || 0;
    if (p.date) {
      advancePerDateMap.set(p.date, (advancePerDateMap.get(p.date) || 0) + amt);
    }
  });

  // Target details analysis
  const activeTargets = targets.filter(t => (Number(t.amt) || 0) > 0);

  const finalInHandSalary = stats.finalPayable;
  const wordsAmount = numberToWordsINR(finalInHandSalary);

  // Backup payload in metadata
  const backupPayload = JSON.stringify({
    rows: entries,
    payments,
    targets,
    meta: {
      emp: meta.empName,
      mon: meta.monthVal,
      loc: meta.locVal,
      sal: meta.baseSalary
    },
    exportedAt: new Date().toISOString()
  });

  doc.setProperties({
    title: `KEO PIC - Master Executive Statement & Register (${emp} - ${formattedMonth})`,
    subject: 'Keopic Photobooth Complete Monthly Salary Slip, Daily Register & Sir Cash Reconciliation Ledger',
    author: 'Keopic Photobooth Management System',
    keywords: 'KEO_BACKUP:' + btoa(unescape(encodeURIComponent(backupPayload)))
  });

  // =========================================================================
  // PAGE 1: COMPLETE EXECUTIVE DASHBOARD & MASTER ALL-IN-ONE OVERVIEW
  // Top Staff data + Bottom Sir Cash data + Key Performance Badges + Financial Audit
  // =========================================================================
  drawPageHeader(
    doc,
    W,
    'EXECUTIVE MONTHLY DASHBOARD & COMPREHENSIVE FINANCIAL STATEMENT',
    'Full-Spectrum Staff Performance, Earnings Audit & Store Cash Reconciliation',
    formattedMonth,
    statementId,
    emp,
    loc,
    keopicLogoDataUrl
  );

  // -------------------------------------------------------------------------
  // 3 UNIFIED LIQUID GLASS EXECUTIVE CARDS (SIDE-BY-SIDE PANELS)
  // -------------------------------------------------------------------------
  const dashY = 22;
  const dashH = 50;
  const cardGap = 4;
  const leftW = 86;
  const midW = 98;
  const rightW = W - 20 - leftW - midW - (cardGap * 2); // ~89mm

  const card1X = 10;
  const card2X = card1X + leftW + cardGap;
  const card3X = card2X + midW + cardGap;

  // -------------------------------------------------------------------------
  // CARD 1: EMPLOYEE IDENTITY, ROLE & ATTENDANCE SUMMARY (LIQUID INDIGO GLASS)
  // -------------------------------------------------------------------------
  // Outer Liquid Glass Container
  doc.setFillColor(248, 250, 255); // Frost Indigo-White
  doc.setDrawColor(199, 210, 254); // Indigo-200 Frosted Glass Border
  doc.setLineWidth(0.35);
  doc.roundedRect(card1X, dashY, leftW, dashH, 2.5, 2.5, 'FD');

  // Top Gloss Specular Reflex on Container
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(card1X + 3, dashY + 0.4, card1X + leftW - 3, dashY + 0.4);

  // Indigo Glass Header Banner
  doc.setFillColor(67, 56, 202); // Indigo-700
  doc.roundedRect(card1X, dashY, leftW, 6.2, 2.5, 2.5, 'F');
  doc.rect(card1X, dashY + 3.2, leftW, 3, 'F');
  // Specular sheen on banner
  doc.setDrawColor(165, 180, 252);
  doc.setLineWidth(0.2);
  doc.line(card1X + 2, dashY + 0.4, card1X + leftW - 2, dashY + 0.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('1. EMPLOYEE & ATTENDANCE RECORD', card1X + 4, dashY + 4.3);
  doc.setTextColor(224, 231, 255);
  doc.text(empCode, card1X + leftW - 4, dashY + 4.3, { align: 'right' });

  // Photo / Monogram in Glowing Glass Frame
  const pPicSize = 19;
  const pPicX = card1X + 4;
  const pPicY = dashY + 8;
  let pPicRendered = false;

  if (meta.profilePic && meta.profilePic.startsWith('data:image/')) {
    try {
      const format = meta.profilePic.includes('png') ? 'PNG' : 'JPEG';
      doc.setFillColor(224, 231, 255);
      doc.setDrawColor(165, 180, 252);
      doc.setLineWidth(0.3);
      doc.roundedRect(pPicX, pPicY, pPicSize, pPicSize, 2, 2, 'FD');
      doc.addImage(meta.profilePic, format, pPicX + 0.8, pPicY + 0.8, pPicSize - 1.6, pPicSize - 1.6);
      pPicRendered = true;
    } catch {}
  }

  if (!pPicRendered) {
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(165, 180, 252);
    doc.setLineWidth(0.35);
    doc.roundedRect(pPicX, pPicY, pPicSize, pPicSize, 2, 2, 'FD');
    // Top sheen
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(pPicX + 1.5, pPicY + 0.4, pPicX + pPicSize - 1.5, pPicY + 0.4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(67, 56, 202);
    const initials = emp.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase() || 'KP';
    doc.text(initials, pPicX + pPicSize / 2, pPicY + 12, { align: 'center' });
  }

  // Employee details text
  const pTextX = pPicX + pPicSize + 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(emp.length > 18 ? emp.substring(0, 17) + '..' : emp, pTextX, dashY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Role: Senior Sales Executive`, pTextX, dashY + 14.5);
  doc.text(`Store: ${loc.length > 20 ? loc.substring(0, 19) + '..' : loc}`, pTextX, dashY + 18.5);
  doc.text(`Base Salary: Rs ${meta.baseSalary.toLocaleString('en-IN')}`, pTextX, dashY + 22.5);
  doc.text(`Per Day Rate: Rs ${stats.perDaySalary.toFixed(1)}`, pTextX, dashY + 26.5);

  // Attendance Statistics Pills Box (Liquid Glass Capsule)
  const attBoxY = dashY + 29.5;
  doc.setFillColor(243, 246, 252);
  doc.setDrawColor(199, 210, 254);
  doc.setLineWidth(0.3);
  doc.roundedRect(card1X + 3, attBoxY, leftW - 6, 18, 1.8, 1.8, 'FD');
  // Glass top reflection sheen
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.line(card1X + 5, attBoxY + 0.4, card1X + leftW - 5, attBoxY + 0.4);

  // Row 1 Liquid Glass Pills: Present, Offs, Absents
  const pPillW = (leftW - 14) / 3;
  // Green Present Pill
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.25);
  doc.roundedRect(card1X + 4.5, attBoxY + 2, pPillW, 5.8, 1.1, 1.1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  doc.setTextColor(5, 150, 105);
  doc.text(`✔ ${stats.presentDays} Present`, card1X + 4.5 + pPillW / 2, attBoxY + 5.8, { align: 'center' });

  // Amber Week Offs Pill
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(252, 211, 77);
  doc.roundedRect(card1X + 5.5 + pPillW, attBoxY + 2, pPillW, 5.8, 1.1, 1.1, 'FD');
  doc.setTextColor(180, 83, 9);
  doc.text(`★ ${stats.weekOffs} Offs`, card1X + 5.5 + pPillW * 1.5, attBoxY + 5.8, { align: 'center' });

  // Red LOP Absents Pill
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(252, 165, 165);
  doc.roundedRect(card1X + 6.5 + pPillW * 2, attBoxY + 2, pPillW, 5.8, 1.1, 1.1, 'FD');
  doc.setTextColor(185, 28, 28);
  doc.text(`✖ ${stats.totalAbsentDays} LOP`, card1X + 6.5 + pPillW * 2.5, attBoxY + 5.8, { align: 'center' });

  // Row 2 Text: Shift & Work Hours
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.3);
  doc.setTextColor(71, 85, 105);
  doc.text(`Shift: 9.0h | Total Work: ${formattedGrandWorkHrs} | Extra OT: ${formattedGrandExtraHrs}`, card1X + 5, attBoxY + 11.8);
  const attPct = stats.daysInMonth > 0 ? Math.round((stats.presentDays / stats.daysInMonth) * 100) : 100;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(`Monthly Attendance Compliance: ${attPct}% (${stats.daysInMonth} Cal. Days)`, card1X + 5, attBoxY + 15.6);

  // -------------------------------------------------------------------------
  // CARD 2: MONTHLY SALARY, INCENTIVES & EARNINGS (LIQUID EMERALD GLASS)
  // -------------------------------------------------------------------------
  doc.setFillColor(246, 252, 248);
  doc.setDrawColor(167, 243, 208); // Emerald-200
  doc.setLineWidth(0.35);
  doc.roundedRect(card2X, dashY, midW, dashH, 2.5, 2.5, 'FD');

  // Top Gloss Specular Reflex
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(card2X + 3, dashY + 0.4, card2X + midW - 3, dashY + 0.4);

  // Emerald Glass Header
  doc.setFillColor(5, 150, 105); // Emerald-600
  doc.roundedRect(card2X, dashY, midW, 6.2, 2.5, 2.5, 'F');
  doc.rect(card2X, dashY + 3.2, midW, 3, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.2);
  doc.line(card2X + 2, dashY + 0.4, card2X + midW - 2, dashY + 0.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('2. SALARY & EARNINGS BREAKDOWN (STAFF PAYABLE)', card2X + 4, dashY + 4.3);
  doc.setTextColor(209, 250, 229);
  doc.text('AMOUNT (INR)', card2X + midW - 4, dashY + 4.3, { align: 'right' });

  let salY = dashY + 8.2;
  const salItemH = 3.25;

  // 1. Base Earned
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.4);
  doc.setTextColor(71, 85, 105);
  doc.text(`1. Base Salary Earned (${stats.presentDays} Pres + ${stats.weekOffs} Offs):`, card2X + 4, salY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs ${stats.netEarnedSalary.toFixed(0)}`, card2X + midW - 4, salY, { align: 'right' });

  // 2. Commissions
  salY += salItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`2. Sales Commission (Stand+Mag 10% + Frame 7%):`, card2X + 4, salY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`+Rs ${stats.totalIncentive.toFixed(0)}`, card2X + midW - 4, salY, { align: 'right' });

  // 3. Overtime Pay
  salY += salItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`3. Overtime Pay (${stats.formattedPayableExtra || '0h 0m'} paid @ Rs ${stats.perHourSalary.toFixed(1)}/h):`, card2X + 4, salY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(`+Rs ${stats.overtimePay.toFixed(0)}`, card2X + midW - 4, salY, { align: 'right' });

  // 4. Milestone Targets Bonus
  salY += salItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`4. Milestone Targets (${activeTargets.length} Hit):`, card2X + 4, salY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text(`+Rs ${stats.totalTargets.toFixed(0)}`, card2X + midW - 4, salY, { align: 'right' });

  // 5. 4 Free Week Offs Extra Duty Encashment
  salY += salItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`5. 4 Free Offs Extra Pay (${stats.unavailedWeekOffs} Offs Worked @ Rs ${stats.perDaySalary.toFixed(0)}/d):`, card2X + 4, salY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`+Rs ${stats.unavailedWeekOffPay.toFixed(0)}`, card2X + midW - 4, salY, { align: 'right' });

  // 6. Conveyance Allowance Claim (Sir se lena hai)
  salY += salItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`6. Conveyance Allowance (${conveyances.length} Claims - To Receive from Sir):`, card2X + 4, salY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136); // Teal-600
  doc.text(`+Rs ${(stats.totalConveyance || 0).toFixed(0)}`, card2X + midW - 4, salY, { align: 'right' });

  // 7. Salary Deductions (LOP)
  salY += salItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 38, 38);
  doc.text(`7. Absent LOP Salary Deduction (${stats.totalAbsentDays} Days):`, card2X + 4, salY);
  doc.setFont('helvetica', 'bold');
  doc.text(`-Rs ${stats.salaryDeduction.toFixed(0)}`, card2X + midW - 4, salY, { align: 'right' });

  // 8. Advance Float Deduction
  salY += salItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 38, 38);
  doc.text(`8. Advance Salary Float (Taken From Sir):`, card2X + 4, salY);
  doc.setFont('helvetica', 'bold');
  doc.text(`-Rs ${(stats.totalAdvance || 0).toFixed(0)}`, card2X + midW - 4, salY, { align: 'right' });

  // Final Net Take-Home Salary Banner (Liquid Glass Card)
  salY += 3.8;
  doc.setFillColor(15, 23, 42); // Midnight Slate
  doc.setDrawColor(52, 211, 153); // Glowing Emerald Border
  doc.setLineWidth(0.35);
  doc.roundedRect(card2X + 3, salY, midW - 6, 8.8, 1.8, 1.8, 'FD');
  // Specular top gloss line
  doc.setDrawColor(110, 231, 183);
  doc.setLineWidth(0.3);
  doc.line(card2X + 5, salY + 0.4, card2X + midW - 5, salY + 0.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NET IN-HAND TAKE-HOME PAY:', card2X + 6, salY + 5.7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(52, 211, 153); // Emerald-400
  doc.text(`Rs ${finalInHandSalary.toFixed(0)}`, card2X + midW - 6, salY + 6.2, { align: 'right' });

  // -------------------------------------------------------------------------
  // CARD 3: STORE SALES & SIR CASH SETTLEMENT (LIQUID CYAN OCEAN GLASS)
  // -------------------------------------------------------------------------
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253); // Sky-200
  doc.setLineWidth(0.35);
  doc.roundedRect(card3X, dashY, rightW, dashH, 2.5, 2.5, 'FD');

  // Top Gloss Specular Reflex
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(card3X + 3, dashY + 0.4, card3X + rightW - 3, dashY + 0.4);

  // Cyan-700 Glass Header
  doc.setFillColor(14, 116, 144);
  doc.roundedRect(card3X, dashY, rightW, 6.2, 2.5, 2.5, 'F');
  doc.rect(card3X, dashY + 3.2, rightW, 3, 'F');
  doc.setDrawColor(125, 211, 252);
  doc.setLineWidth(0.2);
  doc.line(card3X + 2, dashY + 0.4, card3X + rightW - 2, dashY + 0.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('3. STORE CASH & SIR SETTLEMENT LOG', card3X + 4, dashY + 4.3);
  doc.setTextColor(224, 242, 254);
  doc.text('RECONCILIATION', card3X + rightW - 4, dashY + 4.3, { align: 'right' });

  let cY = dashY + 9.5;
  const cItemH = 4.2;

  // 1. Gross Store Sales
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`1. Total Store Sales (Stand+Mag+Frame):`, card3X + 4, cY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs ${stats.grossSales.toFixed(0)}`, card3X + rightW - 4, cY, { align: 'right' });

  // 2. Advance Float Received
  cY += cItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`2. Advance Float Received From Sir:`, card3X + 4, cY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text(`+Rs ${(stats.totalAdvance || 0).toFixed(0)}`, card3X + rightW - 4, cY, { align: 'right' });

  // 3. Total Accountable Cash
  cY += cItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`3. Total Accountable Store Cash (1 + 2):`, card3X + 4, cY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs ${stats.totalAccountableCash.toFixed(0)}`, card3X + rightW - 4, cY, { align: 'right' });

  // 4. Cash Sent to Sir
  cY += cItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(5, 150, 105);
  doc.text(`4. Total Cash Sent to Sir (${sentToSirPayments.length} Transfer${sentToSirPayments.length === 1 ? '' : 's'}):`, card3X + 4, cY);
  doc.setFont('helvetica', 'bold');
  doc.text(`-Rs ${stats.totalPaid.toFixed(0)}`, card3X + rightW - 4, cY, { align: 'right' });

  // 5. Transfer dates count note
  cY += cItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const transferDatesCount = cashSentPerDateMap.size;
  doc.text(`5. Transfer Activity: Paisa Bheja on ${transferDatesCount} Day${transferDatesCount === 1 ? '' : 's'}`, card3X + 4, cY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(`${transferDatesCount} Dates Logged`, card3X + rightW - 4, cY, { align: 'right' });

  // 6. Target Hits Status
  cY += cItemH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`6. Milestone Targets: ${activeTargets.length} Hit (+Rs ${stats.totalTargets.toFixed(0)})`, card3X + 4, cY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('Audited', card3X + rightW - 4, cY, { align: 'right' });

  // Remaining Balance to Sir Banner (Liquid Glass Capsule)
  cY += 4.5;
  const isPending = stats.netBalance > 0;
  doc.setFillColor(isPending ? 255 : 236, isPending ? 251 : 253, isPending ? 235 : 245);
  doc.setDrawColor(isPending ? 251 : 167, isPending ? 191 : 243, isPending ? 36 : 208);
  doc.setLineWidth(0.35);
  doc.roundedRect(card3X + 3, cY, rightW - 6, 8.8, 1.8, 1.8, 'FD');
  // Gloss line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(card3X + 5, cY + 0.4, card3X + rightW - 5, cY + 0.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(isPending ? 180 : 6, isPending ? 83 : 95, isPending ? 9 : 70);
  doc.text(isPending ? 'REMAINING CASH TO SEND SIR:' : 'STORE CASH FULLY SETTLED:', card3X + 6, cY + 5.7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.text(`Rs ${stats.netBalance.toFixed(0)}`, card3X + rightW - 6, cY + 6.0, { align: 'right' });

  // -------------------------------------------------------------------------
  // SECTION 2: 8 HIGH-IMPACT LIQUID GLASS METRIC RIBBONS
  // -------------------------------------------------------------------------
  const ribbonY = 75;
  const ribbonH = 11.5;
  const ribbonGap = 2;
  const ribbonW = (W - 20 - (7 * ribbonGap)) / 8;

  const kpis = [
    { label: 'STAND SALES', val: `Rs ${Math.round(stats.totalStand)}`, sub: `${stats.standUnits} Units Sold`, bg: [239, 246, 255], border: [191, 219, 254], c: [37, 99, 235] },
    { label: 'MAGNET SALES', val: `Rs ${Math.round(stats.totalMagnet)}`, sub: `${stats.magnetUnits} Units Sold`, bg: [245, 243, 255], border: [221, 214, 254], c: [124, 58, 237] },
    { label: 'FRAME SALES', val: `Rs ${Math.round(stats.totalFrame)}`, sub: 'Custom Frames', bg: [236, 254, 255], border: [165, 243, 252], c: [8, 145, 178] },
    { label: 'GROSS TURNOVER', val: `Rs ${Math.round(stats.grossSales)}`, sub: `${stats.totalItemsSold} Total Items`, bg: [241, 245, 249], border: [203, 213, 225], c: [15, 23, 42] },
    { label: 'TOTAL WORK', val: formattedGrandWorkHrs, sub: 'Shift Hours', bg: [240, 253, 250], border: [153, 246, 228], c: [13, 148, 136] },
    { label: 'EXTRA OT', val: formattedGrandExtraHrs, sub: `+Rs ${stats.overtimePay.toFixed(0)} Pay`, bg: [254, 243, 199], border: [252, 211, 77], c: [180, 83, 9] },
    { label: 'PAISA BHEJA (SIR)', val: `Rs ${Math.round(stats.totalPaid)}`, sub: `${sentToSirPayments.length} Transfers`, bg: [236, 253, 245], border: [167, 243, 208], c: [5, 150, 105] },
    { label: 'NET TAKE-HOME', val: `Rs ${Math.round(stats.finalPayable)}`, sub: 'In-Hand Salary', bg: [238, 242, 255], border: [199, 210, 254], c: [67, 56, 202] }
  ];

  kpis.forEach((k, idx) => {
    const kX = 10 + idx * (ribbonW + ribbonGap);
    doc.setFillColor(k.bg[0], k.bg[1], k.bg[2]);
    doc.setDrawColor(k.border[0], k.border[1], k.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(kX, ribbonY, ribbonW, ribbonH, 1.6, 1.6, 'FD');

    // Liquid Glass top sheen line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(kX + 1.2, ribbonY + 0.35, kX + ribbonW - 1.2, ribbonY + 0.35);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(k.c[0], k.c[1], k.c[2]);
    doc.text(k.label, kX + 2, ribbonY + 3.4);

    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(k.val, kX + 2, ribbonY + 7.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.4);
    doc.setTextColor(100, 116, 139);
    doc.text(k.sub, kX + 2, ribbonY + 10.0);
  });

  // -------------------------------------------------------------------------
  // SECTION 3: COMPREHENSIVE FINANCIAL AUDIT & RECONCILIATION SUMMARY TABLE (LIQUID GLASS PANELS)
  // -------------------------------------------------------------------------
  const auditStartY = 89.5;
  const auditColW = (W - 24) / 2;

  // Left Audit Box: Staff Salary Summary & Amount in Words
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(10, auditStartY, auditColW, 46, 2.2, 2.2, 'FD');

  // Top Gloss
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.line(12, auditStartY + 0.4, 10 + auditColW - 2, auditStartY + 0.4);

  doc.setFillColor(30, 41, 59); // Slate-800
  doc.roundedRect(10, auditStartY, auditColW, 5.8, 2.2, 2.2, 'F');
  doc.rect(10, auditStartY + 3, auditColW, 2.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('STAFF REMUNERATION AUDIT & IN-HAND PAY CALCULATION', 14, auditStartY + 4.2);

  // Remuneration Table Rows
  const auditRowsStaff = [
    ['Monthly Base Agreed Salary', `Rs ${meta.baseSalary.toLocaleString('en-IN')}`],
    [`Absenteeism Deductions (${stats.totalAbsentDays} Days LOP)`, `-Rs ${stats.salaryDeduction.toFixed(0)}`],
    ['Earned Base Pay (Payable)', `Rs ${stats.netEarnedSalary.toFixed(0)}`],
    ['Sales Commissions Earned (Stand 10% + Magnet 10% + Frame 7%)', `+Rs ${stats.totalIncentive.toFixed(0)}`],
    [`Overtime Extra Duty Pay (${stats.formattedPayableExtra || '0h 0m'} paid @ Rs ${stats.perHourSalary.toFixed(1)}/h | ${formattedGrandExtraHrs} logged)`, `+Rs ${stats.overtimePay.toFixed(0)}`],
    [`Milestone Target Bonuses (${activeTargets.length} Targets Hit)`, `+Rs ${stats.totalTargets.toFixed(0)}`],
    [`Conveyance & Travel Claims (${conveyances.length} Logged - Sir se lena hai)`, `+Rs ${(stats.totalConveyance || 0).toFixed(0)}`],
    ['Advance Salary Float Taken (Deduction)', `-Rs ${(stats.totalAdvance || 0).toFixed(0)}`],
    ['Total Net In-Hand Payable', `Rs ${finalInHandSalary.toFixed(0)}`]
  ];

  let aY = auditStartY + 8.2;
  auditRowsStaff.forEach(([lbl, val], rIdx) => {
    const isFinal = rIdx === auditRowsStaff.length - 1;
    if (isFinal) {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.setLineWidth(0.25);
      doc.roundedRect(12, aY - 2.0, auditColW - 4, 4.4, 1.2, 1.2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(5, 150, 105);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.2);
      doc.setTextColor(71, 85, 105);
    }

    doc.text(lbl, 14, aY + 1.0);
    doc.setFont('helvetica', 'bold');
    if (!isFinal) doc.setTextColor(15, 23, 42);
    doc.text(val, 10 + auditColW - 4, aY + 1.0, { align: 'right' });
    aY += 3.7;
  });

  // Amount In Words Liquid Glass Capsule
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(12, auditStartY + 43, auditColW - 4, 5.5, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT IN WORDS:', 14, auditStartY + 46.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(15, 23, 42);
  doc.text(wordsAmount, 42, auditStartY + 46.5);

  // Right Audit Box: Store Cash Sales & Settlement with Sir
  const rightAuditX = 10 + auditColW + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(rightAuditX, auditStartY, auditColW, 46, 2.2, 2.2, 'FD');

  // Top Gloss
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.line(rightAuditX + 2, auditStartY + 0.4, rightAuditX + auditColW - 2, auditStartY + 0.4);

  doc.setFillColor(14, 116, 144); // Cyan-700
  doc.roundedRect(rightAuditX, auditStartY, auditColW, 5.8, 2.2, 2.2, 'F');
  doc.rect(rightAuditX, auditStartY + 3, auditColW, 2.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('STORE PHOTOBOOTH CASH RECONCILIATION WITH SIR', rightAuditX + 4, auditStartY + 4.2);

  const auditRowsStore = [
    ['Gross Stand Photo Sales', `Rs ${Math.round(stats.totalStand)} (${stats.standUnits} pcs)`],
    ['Gross Magnet Photo Sales', `Rs ${Math.round(stats.totalMagnet)} (${stats.magnetUnits} pcs)`],
    ['Gross Custom Frame Sales', `Rs ${Math.round(stats.totalFrame)}`],
    ['Total Gross Sales Turnover (A)', `Rs ${Math.round(stats.grossSales)} (${stats.totalItemsSold} Items)`],
    ['Advance Cash Float Received from Sir (B)', `+Rs ${(stats.totalAdvance || 0).toFixed(0)}`],
    ['Total Accountable Store Cash (A + B)', `Rs ${stats.totalAccountableCash.toFixed(0)}`],
    [`Total Cash Handed Over / Sent to Sir (${sentToSirPayments.length} Transfers)`, `-Rs ${stats.totalPaid.toFixed(0)}`],
    ['Net Remaining Cash to Handover to Sir', `Rs ${stats.netBalance.toFixed(0)}`]
  ];

  let bY = auditStartY + 9.2;
  auditRowsStore.forEach(([lbl, val], rIdx) => {
    const isFinal = rIdx === auditRowsStore.length - 1;
    if (isFinal) {
      doc.setFillColor(isPending ? 255 : 236, isPending ? 251 : 253, isPending ? 235 : 245);
      doc.setDrawColor(isPending ? 251 : 167, isPending ? 191 : 243, isPending ? 36 : 208);
      doc.setLineWidth(0.25);
      doc.roundedRect(rightAuditX + 2, bY - 2.2, auditColW - 4, 4.6, 1.2, 1.2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(isPending ? 180 : 6, isPending ? 83 : 95, isPending ? 9 : 70);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.4);
      doc.setTextColor(71, 85, 105);
    }

    doc.text(lbl, rightAuditX + 4, bY + 1.1);
    doc.setFont('helvetica', 'bold');
    if (!isFinal) doc.setTextColor(15, 23, 42);
    doc.text(val, rightAuditX + auditColW - 4, bY + 1.1, { align: 'right' });
    bY += 4.2;
  });

  // Transfer Highlights Liquid Glass Capsule
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(rightAuditX + 2, auditStartY + 43, auditColW - 4, 5.5, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('CASH TRANSFER LOG STATUS:', rightAuditX + 4, auditStartY + 46.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(79, 70, 229);
  doc.text(`${sentToSirPayments.length} Transfers on ${cashSentPerDateMap.size} Dates | Detailed Ledger on Page 3`, rightAuditX + 44, auditStartY + 46.5);

  // -------------------------------------------------------------------------
  // SECTION 4: EXECUTIVE SUMMARY NOTICE & VERIFICATION SEAL (LIQUID GLASS)
  // -------------------------------------------------------------------------
  const noticeY = 143;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(10, noticeY, W - 20, 20, 2.2, 2.2, 'FD');

  // Specular top line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.line(12, noticeY + 0.4, W - 12, noticeY + 0.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL DECLARATION & STATEMENT POLICIES:', 14, noticeY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text('• Incentive Structure: 10% earned on combined Stand + Magnet sales when daily gross exceeds Rs 500. Fixed 7% on Custom Frames.', 14, noticeY + 8.5);
  doc.text('• Attendance Policy: 4 allowed paid week-offs per month. Standard duty shift is 9.0 hours. Overtime calculated at hourly rate.', 14, noticeY + 12);
  doc.text('• Cash Settlement: All photobooth cash sent to Sir has been reconciled against daily register entries. View full logs on Page 2 & Page 3.', 14, noticeY + 15.5);

  // Signatures on Page 1 Bottom (Liquid Glass Signature Capsules)
  const sigP1Y = 168;
  const sigP1W = (W - 24) / 2;

  // Left Signature
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(10, sigP1Y, sigP1W, 14, 1.8, 1.8, 'FD');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(12, sigP1Y + 0.4, 10 + sigP1W - 2, sigP1Y + 0.4);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.line(14, sigP1Y + 9, 14 + sigP1W - 8, sigP1Y + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Staff Signature / Acknowledgment (${emp})`, 14, sigP1Y + 12.2);

  // Right Signature
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10 + sigP1W + 4, sigP1Y, sigP1W, 14, 1.8, 1.8, 'FD');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(12 + sigP1W + 4, sigP1Y + 0.4, W - 12, sigP1Y + 0.4);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.line(10 + sigP1W + 8, sigP1Y + 9, W - 14, sigP1Y + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Management Signatory / Official Store Stamp', 10 + sigP1W + 8, sigP1Y + 12.2);

  // =========================================================================
  // PAGE 2: COMPLETE 31-DAY ITEMIZED ATTENDANCE, SALES & CASH TO SIR REGISTER
  // Enhanced with clear row separation, distinct cell borders, and status badges
  // =========================================================================
  doc.addPage();

  drawPageHeader(
    doc,
    W,
    'DAILY ATTENDANCE, SALES & SIR CASH SETTLEMENT REGISTER',
    'Itemized 31-Day Duty Hours, Product Breakdown, Incentive & Cash Sent to Sir Log',
    formattedMonth,
    statementId,
    emp,
    loc,
    keopicLogoDataUrl
  );

  // Mini-Legend & Glassmorphic Summary Bar above Table
  const legY = 21.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(8, legY, W - 16, 4.8, 1.2, 1.2, 'FD');
  // Top glass reflection line for legend
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.line(10, legY + 0.4, W - 10, legY + 0.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(51, 65, 85);
  doc.text('STATUS GUIDE:', 11, legY + 3.3);

  // Legend Glass Badges
  // Present
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(29, legY + 0.8, 19, 3.2, 0.8, 0.8, 'FD');
  doc.setTextColor(5, 150, 105);
  doc.text('✔ Present', 38.5, legY + 3.1, { align: 'center' });

  // Week Off
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(252, 211, 77);
  doc.roundedRect(50, legY + 0.8, 21, 3.2, 0.8, 0.8, 'FD');
  doc.setTextColor(180, 83, 9);
  doc.text('★ Week Off', 60.5, legY + 3.1, { align: 'center' });

  // Absent
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(252, 165, 165);
  doc.roundedRect(73, legY + 0.8, 23, 3.2, 0.8, 0.8, 'FD');
  doc.setTextColor(185, 28, 28);
  doc.text('✖ Absent (LOP)', 84.5, legY + 3.1, { align: 'center' });

  // Paisa Bheja Sir
  doc.setFillColor(224, 242, 254);
  doc.setDrawColor(125, 211, 252);
  doc.roundedRect(98, legY + 0.8, 27, 3.2, 0.8, 0.8, 'FD');
  doc.setTextColor(3, 105, 161);
  doc.text('Paisa Bheja (Sir)', 111.5, legY + 3.1, { align: 'center' });

  // Target Hit
  doc.setFillColor(254, 249, 195);
  doc.setDrawColor(250, 204, 21);
  doc.roundedRect(127, legY + 0.8, 22, 3.2, 0.8, 0.8, 'FD');
  doc.setTextColor(161, 98, 7);
  doc.text('🎯 Target Hit', 138, legY + 3.1, { align: 'center' });

  // Right Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Days: ${stats.daysInMonth}  |  Present: ${stats.presentDays}  |  Offs: ${stats.weekOffs}  |  Absents: ${stats.totalAbsentDays}`, W - 11, legY + 3.3, { align: 'right' });

  const tableStartY = 27.5;

  let grandTotalCashSentOnDates = 0;

  const tableBody = entries.map((r, i) => {
    const stand = Number(r.stand) || 0;
    const magnet = Number(r.magnet) || 0;
    const frame = Number(r.frame) || 0;
    let inc = 0;

    if (r.status === 'Present') {
      if (stand + magnet + frame >= 500) inc += (stand + magnet) * 0.1;
      inc += frame * 0.07;
    }

    const isWeekOff = r.status === 'Week Off';
    const isAbsent = r.status === 'Absent' || r.status === 'Auto Absent';
    const workHrsData = parseWorkHoursDetailed(r.inTime, r.outTime, r.status);

    let statusText = '✔ Present';
    if (isWeekOff) statusText = '★ Week Off';
    else if (isAbsent) statusText = '✖ Absent (LOP)';

    const timingText = isWeekOff
      ? 'Weekly Rest Off'
      : isAbsent
      ? 'Loss of Pay (LOP)'
      : `${r.inTime || '10:30'} - ${r.outTime || '19:31'}`;

    // Target check for this date
    const dateTargets = targets.filter(t => t.date === r.date);
    const dayTargetBonus = dateTargets.reduce((sum, t) => sum + (Number(t.amt) || 0), 0);
    const targetText = dayTargetBonus > 0 ? `🎯 +Rs ${dayTargetBonus.toFixed(0)}` : '-';

    // Cash Sent to Sir on this date
    const dayCashSent = cashSentPerDateMap.get(r.date) || 0;
    grandTotalCashSentOnDates += dayCashSent;
    const cashSentText = dayCashSent > 0 ? `Rs ${dayCashSent.toLocaleString('en-IN')}` : '-';

    return [
      String(i + 1).padStart(2, '0'),
      r.date || r.dateVal || '-',
      (r.day || '-').substring(0, 3),
      statusText,
      timingText,
      isWeekOff || isAbsent ? '-' : workHrsData.workFormatted,
      isWeekOff || isAbsent ? '-' : workHrsData.extraFormatted,
      isWeekOff || isAbsent ? '-' : (stand > 0 ? 'Rs ' + Math.round(stand).toLocaleString('en-IN') : '-'),
      isWeekOff || isAbsent ? '-' : (magnet > 0 ? 'Rs ' + Math.round(magnet).toLocaleString('en-IN') : '-'),
      isWeekOff || isAbsent ? '-' : (frame > 0 ? 'Rs ' + Math.round(frame).toLocaleString('en-IN') : '-'),
      targetText,
      cashSentText,
      isWeekOff || isAbsent ? '-' : (inc > 0 ? '+Rs ' + inc.toFixed(1) : 'Rs 0.0')
    ];
  });

  // Master Totals Row
  tableBody.push([
    '∑',
    'TOTALS',
    '',
    `${stats.presentDays}P / ${stats.weekOffs}O / ${stats.totalAbsentDays}A`,
    `${stats.daysInMonth} Days`,
    formattedGrandWorkHrs,
    formattedGrandExtraHrs,
    'Rs ' + Math.round(stats.totalStand).toLocaleString('en-IN'),
    'Rs ' + Math.round(stats.totalMagnet).toLocaleString('en-IN'),
    'Rs ' + Math.round(stats.totalFrame).toLocaleString('en-IN'),
    stats.totalTargets > 0 ? `Rs ${Math.round(stats.totalTargets).toLocaleString('en-IN')}` : '-',
    stats.totalPaid > 0 ? `Rs ${Math.round(stats.totalPaid).toLocaleString('en-IN')}` : '-',
    'Rs ' + stats.totalIncentive.toFixed(1)
  ]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 8, right: 8, bottom: 10 },
    head: [['#', 'Date', 'Day', 'Attendance Status', 'Duty Hours (In - Out)', 'Work Shift', 'Overtime', 'Stand Sales', 'Magnet Sales', 'Frame Sales', 'Target Bonus', 'Paisa Bheja (Sir)', 'Commission Earned']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42], // Deep Navy Slate-900
      textColor: [255, 255, 255],
      fontSize: 5.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 5.0,
      cellPadding: { top: 0.8, bottom: 0.8, left: 0.6, right: 0.6 }
    },
    bodyStyles: {
      fontSize: 5.2,
      textColor: [15, 23, 42],
      valign: 'middle',
      minCellHeight: 4.4, // Generous row height for the capsule card aesthetic
      cellPadding: { top: 0.8, bottom: 0.8, left: 0.8, right: 0.8 }
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 11 },
      3: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 17, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 23 },
      8: { halign: 'right', cellWidth: 23 },
      9: { halign: 'right', cellWidth: 23 },
      10: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      11: { halign: 'right', cellWidth: 31, fontStyle: 'bold' },
      12: { halign: 'right', fontStyle: 'bold', cellWidth: 39 }
    },
    didParseCell: function (data: any) {
      if (data.section !== 'body') return;

      // Totals Row Styling
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontSize = 5.5;

        if (data.column.index === 11) {
          data.cell.styles.textColor = [56, 189, 248]; // Sky-400 for Sir cash
        } else if (data.column.index === 12) {
          data.cell.styles.textColor = [52, 211, 153]; // Emerald-400 for Commission
        } else if (data.column.index === 10) {
          data.cell.styles.textColor = [253, 224, 71]; // Gold for targets
        }
        return;
      }

      const entry = entries[data.row.index];
      if (entry) {
        const isPresent = entry.status === 'Present';
        const isAbsent = entry.status === 'Absent' || entry.status === 'Auto Absent';
        const isWeekOff = entry.status === 'Week Off';

        const standVal = Number(entry.stand) || 0;
        const magnetVal = Number(entry.magnet) || 0;
        const frameVal = Number(entry.frame) || 0;

        let incVal = 0;
        if (isPresent) {
          if (standVal + magnetVal + frameVal >= 500) {
            incVal += (standVal + magnetVal) * 0.10;
          }
          incVal += frameVal * 0.07;
        }

        // Set high-legibility text colors for each column
        if (isPresent) {
          data.cell.styles.textColor = [15, 23, 42];

          if (data.column.index === 0) {
            data.cell.styles.textColor = [51, 65, 85];
          } else if (data.column.index === 2) {
            data.cell.styles.textColor = [71, 85, 105];
          } else if (data.column.index === 3) {
            data.cell.styles.textColor = [5, 150, 105]; // Emerald text
          } else if (data.column.index === 4) {
            data.cell.styles.textColor = [71, 85, 105];
          } else if (data.column.index === 6 && data.cell.raw !== '-') {
            data.cell.styles.textColor = [180, 83, 9]; // Amber OT text
          } else if (data.column.index === 12 && incVal > 0) {
            data.cell.styles.textColor = [5, 150, 105]; // Green commission
          }
        } else if (isWeekOff) {
          data.cell.styles.textColor = [146, 64, 14];
          if (data.column.index === 3) {
            data.cell.styles.textColor = [180, 83, 9];
          } else if (data.column.index === 4) {
            data.cell.styles.textColor = [180, 83, 9];
          }
        } else if (isAbsent) {
          data.cell.styles.textColor = [185, 28, 28];
          if (data.column.index === 3) {
            data.cell.styles.textColor = [185, 28, 28];
          }
        }

        if (data.column.index === 10 && data.cell.raw !== '-') {
          data.cell.styles.textColor = [161, 98, 7]; // Yellow-700
        }
        if (data.column.index === 11 && data.cell.raw !== '-') {
          data.cell.styles.textColor = [3, 105, 161]; // Sky-700
        }
      }
    },
    willDrawCell: function (data: any) {
      if (data.section !== 'body') return;

      const isLastRow = data.row.index === tableBody.length - 1;
      const rx = 8;
      const ry = data.cell.y + 0.35;
      const rw = W - 16;
      const rh = data.cell.height - 0.7;

      // 1. Draw the Full Row Capsule "Dabba" (Glass Card Box) on Column 0
      if (data.column.index === 0) {
        if (isLastRow) {
          // Totals Row Dabba - Deep Midnight Glass
          doc.setFillColor(15, 23, 42);
          doc.setDrawColor(56, 189, 248); // Glowing Cyan Border
          doc.setLineWidth(0.35);
          doc.roundedRect(rx, ry, rw, rh, 1.2, 1.2, 'FD');
        } else {
          const entry = entries[data.row.index];
          const isPresent = entry?.status === 'Present';
          const isWeekOff = entry?.status === 'Week Off';
          const isAbsent = entry?.status === 'Absent' || entry?.status === 'Auto Absent';

          if (isPresent) {
            const isEven = data.row.index % 2 === 0;
            if (isEven) {
              doc.setFillColor(255, 255, 255); // Pure Translucent White
              doc.setDrawColor(218, 226, 237); // Glass Border
            } else {
              doc.setFillColor(243, 247, 252); // Soft Glacier Slate Glass
              doc.setDrawColor(203, 213, 225); // Slate Glass Border
            }
            doc.setLineWidth(0.25);
            doc.roundedRect(rx, ry, rw, rh, 1.1, 1.1, 'FD');
          } else if (isWeekOff) {
            // Warm Amber Glass Dabba
            doc.setFillColor(255, 251, 235);
            doc.setDrawColor(252, 211, 77);
            doc.setLineWidth(0.3);
            doc.roundedRect(rx, ry, rw, rh, 1.1, 1.1, 'FD');
          } else if (isAbsent) {
            // Soft Rose Glass Dabba
            doc.setFillColor(254, 242, 242);
            doc.setDrawColor(252, 165, 165);
            doc.setLineWidth(0.3);
            doc.roundedRect(rx, ry, rw, rh, 1.1, 1.1, 'FD');
          }
        }
      }

      // 2. Draw Mini Glass Pill Badges for specific cells
      if (!isLastRow) {
        const entry = entries[data.row.index];
        const isPresent = entry?.status === 'Present';
        const isWeekOff = entry?.status === 'Week Off';
        const isAbsent = entry?.status === 'Absent' || entry?.status === 'Auto Absent';

        const cx = data.cell.x + 0.6;
        const cy = data.cell.y + 0.65;
        const cw = data.cell.width - 1.2;
        const ch = data.cell.height - 1.3;

        // Number Col 0 Pill
        if (data.column.index === 0) {
          doc.setFillColor(238, 242, 246);
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.18);
          doc.roundedRect(cx, cy, cw, ch, 0.6, 0.6, 'FD');
        }

        // Attendance Status Col 3 Glass Pill
        if (data.column.index === 3) {
          if (isPresent) {
            doc.setFillColor(236, 253, 245);
            doc.setDrawColor(167, 243, 208);
          } else if (isWeekOff) {
            doc.setFillColor(254, 243, 199);
            doc.setDrawColor(251, 191, 36);
          } else {
            doc.setFillColor(254, 226, 226);
            doc.setDrawColor(248, 113, 113);
          }
          doc.setLineWidth(0.22);
          doc.roundedRect(cx, cy, cw, ch, 0.7, 0.7, 'FD');
        }

        // Overtime OT Col 6 Glass Pill
        if (data.column.index === 6 && data.cell.raw !== '-' && !isWeekOff && !isAbsent) {
          doc.setFillColor(254, 243, 199);
          doc.setDrawColor(252, 211, 77);
          doc.setLineWidth(0.2);
          doc.roundedRect(cx, cy, cw, ch, 0.6, 0.6, 'FD');
        }

        // Target Hit Col 10 Glass Pill
        if (data.column.index === 10 && data.cell.raw !== '-') {
          doc.setFillColor(254, 249, 195);
          doc.setDrawColor(250, 204, 21);
          doc.setLineWidth(0.2);
          doc.roundedRect(cx, cy, cw, ch, 0.6, 0.6, 'FD');
        }

        // Paisa Bheja Sir Col 11 Glass Pill
        if (data.column.index === 11 && data.cell.raw !== '-') {
          doc.setFillColor(224, 242, 254);
          doc.setDrawColor(125, 211, 252);
          doc.setLineWidth(0.2);
          doc.roundedRect(cx, cy, cw, ch, 0.6, 0.6, 'FD');
        }

        // Commission Earned Col 12 Glass Pill
        if (data.column.index === 12 && isPresent && data.cell.raw !== 'Rs 0.0' && data.cell.raw !== '-') {
          doc.setFillColor(236, 253, 245);
          doc.setDrawColor(110, 231, 183);
          doc.setLineWidth(0.2);
          doc.roundedRect(cx, cy, cw, ch, 0.6, 0.6, 'FD');
        }
      }
    },
    didDrawCell: function (data: any) {
      if (data.section !== 'body') return;

      const isLastRow = data.row.index === tableBody.length - 1;
      const rx = 8;
      const ry = data.cell.y + 0.35;
      const rw = W - 16;

      // 3. Draw Frosted Glass Top Sheen Reflection Line on each Row Dabba
      if (data.column.index === 0) {
        if (isLastRow) {
          doc.setDrawColor(94, 234, 212); // Glowing teal highlight
          doc.setLineWidth(0.3);
          doc.line(rx + 2, ry + 0.4, rx + rw - 2, ry + 0.4);
        } else {
          doc.setDrawColor(255, 255, 255); // Crisp Frosted White Glass Reflex
          doc.setLineWidth(0.35);
          doc.line(rx + 2, ry + 0.45, rx + rw - 2, ry + 0.45);
        }
      }

      // 4. Subtle Glass Column Dividers
      if (data.column.index > 0 && data.column.index < 13 && !isLastRow) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.12);
        doc.line(data.cell.x, data.cell.y + 0.9, data.cell.x, data.cell.y + data.cell.height - 0.9);
      }
    }
  });

  // =========================================================================
  // PAGE 3: DETAILED SIR CASH TRANSFERS, ADVANCE LOG & TARGET MILESTONES LEDGER
  // "Pdf me konse konse day sir ko paisa bheja ha add karo"
  // =========================================================================
  doc.addPage();

  drawPageHeader(
    doc,
    W,
    'SIR CASH TRANSFER LEDGER & MILESTONE SETTLEMENT AUDIT',
    'Itemized Record of Daily Money Sent to Sir, Advance Floats & Performance Bonuses',
    formattedMonth,
    statementId,
    emp,
    loc,
    keopicLogoDataUrl
  );

  // -------------------------------------------------------------------------
  // TABLE 1: PAISA BHEJA TO SIR - COMPLETE ITEMIZE LOG (LIQUID GLASS DABBAs)
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. SIR CASH TRANSFER HISTORY (KON-KONSE DIN PAISA BHEJA GAYA):', 10, 26);

  const sentToSirTableBody = sentToSirPayments.map((p, idx) => [
    idx + 1,
    p.date || '-',
    p.paymentMode || (p.note && p.note.toLowerCase().includes('upi') ? 'UPI / Online' : 'Cash Handover'),
    p.note || 'Store Daily Collection Remittance to Sir',
    'Rs ' + (Number(p.amt) || 0).toLocaleString('en-IN'),
    'Transferred & Reconciled'
  ]);

  if (sentToSirTableBody.length === 0) {
    sentToSirTableBody.push([
      '-',
      'No Transfer Records',
      'N/A',
      'No direct cash transfers logged for this billing period yet.',
      'Rs 0',
      'Pending'
    ]);
  } else {
    sentToSirTableBody.push([
      '',
      'TOTAL TRANSFERRED',
      '',
      `${sentToSirPayments.length} Successful Cash Transfers Recorded`,
      'Rs ' + stats.totalPaid.toLocaleString('en-IN'),
      'Fully Audited'
    ]);
  }

  autoTable(doc, {
    startY: 28,
    margin: { left: 10, right: 10 },
    head: [['#', 'Transfer Date', 'Payment Mode', 'Transaction Note / Reference', 'Amount Sent (Rs)', 'Audit Status']],
    body: sentToSirTableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [14, 116, 144], // Cyan-700
      textColor: [255, 255, 255],
      fontSize: 5.8,
      fontStyle: 'bold',
      halign: 'center',
      minCellHeight: 4.8
    },
    bodyStyles: {
      fontSize: 5.4,
      textColor: [15, 23, 42],
      valign: 'middle',
      minCellHeight: 4.0
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 32 },
      3: { halign: 'left', cellWidth: 100 },
      4: { halign: 'right', cellWidth: 38, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 73 }
    },
    willDrawCell: function (data: any) {
      if (data.section === 'body') {
        const isTotalRow = data.row.index === sentToSirTableBody.length - 1 && sentToSirPayments.length > 0;
        const rowX = 10;
        const rowY = data.cell.y + 0.3;
        const rowW = W - 20;
        const rowH = data.cell.height - 0.6;

        if (data.column.index === 0) {
          if (isTotalRow) {
            doc.setFillColor(224, 242, 254); // Sky-100 Glass Total
            doc.setDrawColor(56, 189, 248);
            doc.setLineWidth(0.35);
            doc.roundedRect(rowX, rowY, rowW, rowH, 1.4, 1.4, 'FD');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.3);
            doc.line(rowX + 2, rowY + 0.35, rowX + rowW - 2, rowY + 0.35);
          } else {
            const isAlt = data.row.index % 2 === 1;
            doc.setFillColor(isAlt ? 244 : 252, isAlt ? 249 : 254, isAlt ? 255 : 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.25);
            doc.roundedRect(rowX, rowY, rowW, rowH, 1.2, 1.2, 'FD');
            // Specular glass reflex line
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.3);
            doc.line(rowX + 2, rowY + 0.35, rowX + rowW - 2, rowY + 0.35);
          }
        }
      }
    },
    didParseCell: function (data: any) {
      if (data.section === 'body') {
        if (data.row.index === sentToSirTableBody.length - 1 && sentToSirPayments.length > 0) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [3, 105, 161];
        }
      }
    }
  });

  const sentTableEndY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 70;

  // -------------------------------------------------------------------------
  // 2-COLUMN SECTION: ADVANCE FLOAT LOG + MILESTONE TARGETS LOG (LIQUID GLASS)
  // -------------------------------------------------------------------------
  const dualLogY = sentTableEndY + 5;
  const dualLogW = (W - 24) / 2;

  // Table 2A (Left): Advance Money Received from Sir
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(180, 83, 9);
  doc.text('2. ADVANCE MONEY RECEIVED FROM SIR (FLOAT LOG):', 10, dualLogY);

  const advanceTableBody = advancePayments.map((p, idx) => [
    idx + 1,
    p.date || '-',
    p.note || 'Advance Float Received from Sir',
    'Rs ' + (Number(p.amt) || 0).toLocaleString('en-IN')
  ]);

  if (advanceTableBody.length === 0) {
    advanceTableBody.push(['-', 'No Advance', 'No advance salary float taken', 'Rs 0']);
  } else {
    advanceTableBody.push(['', 'TOTAL ADVANCE', `${advancePayments.length} Advances Taken`, 'Rs ' + (stats.totalAdvance || 0).toLocaleString('en-IN')]);
  }

  autoTable(doc, {
    startY: dualLogY + 2,
    margin: { left: 10, right: 10 + dualLogW + 4 },
    head: [['#', 'Date', 'Advance Note / Purpose', 'Amount (Rs)']],
    body: advanceTableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [217, 119, 6], // Amber-600
      textColor: [255, 255, 255],
      fontSize: 5.6,
      fontStyle: 'bold',
      halign: 'center',
      minCellHeight: 4.4
    },
    bodyStyles: {
      fontSize: 5.2,
      textColor: [15, 23, 42],
      valign: 'middle',
      minCellHeight: 3.6
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 6 },
      1: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 70 },
      3: { halign: 'right', cellWidth: 36, fontStyle: 'bold' }
    },
    willDrawCell: function (data: any) {
      if (data.section === 'body') {
        const isTotalRow = data.row.index === advanceTableBody.length - 1 && advancePayments.length > 0;
        const rowX = 10;
        const rowY = data.cell.y + 0.3;
        const rowW = dualLogW;
        const rowH = data.cell.height - 0.6;

        if (data.column.index === 0) {
          if (isTotalRow) {
            doc.setFillColor(254, 243, 199);
            doc.setDrawColor(245, 158, 11);
            doc.setLineWidth(0.3);
            doc.roundedRect(rowX, rowY, rowW, rowH, 1.2, 1.2, 'FD');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.3);
            doc.line(rowX + 1.5, rowY + 0.35, rowX + rowW - 1.5, rowY + 0.35);
          } else {
            const isAlt = data.row.index % 2 === 1;
            doc.setFillColor(isAlt ? 255 : 255, isAlt ? 251 : 255, isAlt ? 245 : 255);
            doc.setDrawColor(234, 236, 240);
            doc.setLineWidth(0.2);
            doc.roundedRect(rowX, rowY, rowW, rowH, 1, 1, 'FD');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.25);
            doc.line(rowX + 1.5, rowY + 0.3, rowX + rowW - 1.5, rowY + 0.3);
          }
        }
      }
    },
    didParseCell: function (data: any) {
      if (data.section === 'body' && data.row.index === advanceTableBody.length - 1 && advancePayments.length > 0) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [180, 83, 9];
      }
    }
  });

  // Table 2B (Right): Milestone Targets Achieved Log (Liquid Glass)
  const rightLogX = 10 + dualLogW + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(67, 56, 202);
  doc.text('3. MILESTONE TARGETS & PERFORMANCE REWARDS LOG:', rightLogX, dualLogY);

  const targetTableBody = activeTargets.map((t, idx) => [
    idx + 1,
    t.date || '-',
    t.note || 'Milestone Sales Target Achieved',
    '+Rs ' + (Number(t.amt) || 0).toLocaleString('en-IN')
  ]);

  if (targetTableBody.length === 0) {
    targetTableBody.push(['-', 'No Targets', 'No milestone targets recorded', 'Rs 0']);
  } else {
    targetTableBody.push(['', 'TOTAL TARGETS', `${activeTargets.length} Targets Hit`, '+Rs ' + stats.totalTargets.toLocaleString('en-IN')]);
  }

  autoTable(doc, {
    startY: dualLogY + 2,
    margin: { left: rightLogX, right: 10 },
    head: [['#', 'Date Hit', 'Milestone Description', 'Bonus (Rs)']],
    body: targetTableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo-600
      textColor: [255, 255, 255],
      fontSize: 5.6,
      fontStyle: 'bold',
      halign: 'center',
      minCellHeight: 4.4
    },
    bodyStyles: {
      fontSize: 5.2,
      textColor: [15, 23, 42],
      valign: 'middle',
      minCellHeight: 3.6
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 6 },
      1: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 70 },
      3: { halign: 'right', cellWidth: 36, fontStyle: 'bold' }
    },
    willDrawCell: function (data: any) {
      if (data.section === 'body') {
        const isTotalRow = data.row.index === targetTableBody.length - 1 && activeTargets.length > 0;
        const rowX = rightLogX;
        const rowY = data.cell.y + 0.3;
        const rowW = dualLogW;
        const rowH = data.cell.height - 0.6;

        if (data.column.index === 0) {
          if (isTotalRow) {
            doc.setFillColor(238, 242, 255);
            doc.setDrawColor(99, 102, 241);
            doc.setLineWidth(0.3);
            doc.roundedRect(rowX, rowY, rowW, rowH, 1.2, 1.2, 'FD');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.3);
            doc.line(rowX + 1.5, rowY + 0.35, rowX + rowW - 1.5, rowY + 0.35);
          } else {
            const isAlt = data.row.index % 2 === 1;
            doc.setFillColor(isAlt ? 245 : 255, isAlt ? 243 : 255, isAlt ? 255 : 255);
            doc.setDrawColor(234, 236, 240);
            doc.setLineWidth(0.2);
            doc.roundedRect(rowX, rowY, rowW, rowH, 1, 1, 'FD');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.25);
            doc.line(rowX + 1.5, rowY + 0.3, rowX + rowW - 1.5, rowY + 0.3);
          }
        }
      }
    },
    didParseCell: function (data: any) {
      if (data.section === 'body' && data.row.index === targetTableBody.length - 1 && activeTargets.length > 0) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [67, 56, 202];
      }
    }
  });

  const p3FinalEndY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 120;
  const conveyanceSectionY = p3FinalEndY + 5;

  // -------------------------------------------------------------------------
  // TABLE 4: CONVEYANCE & TRAVEL EXPENSE RECORD (KIS DIN PROVIDE KIYE & SIR SE KITNA RUPI LENA HAI)
  // "Iske under convanase ka paisa bhi add karna ha kis day convantionce sir provide kiye uske liye date likhna ha and kitna rupi lena ha sir se vo bhi pdf pe mention hoga and salery me ++ hona ha"
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(13, 148, 136); // Teal-700
  doc.text('4. CONVEYANCE & TRAVEL EXPENSE RECORD (KIS DIN PROVIDE KIYE & SIR SE KITNA RUPI LENA HAI):', 10, conveyanceSectionY);

  const conveyanceTableBody = conveyances.map((c, idx) => [
    idx + 1,
    c.date || '-',
    c.note || 'Conveyance / Travel Reimbursement Claim',
    '+Rs ' + (Number(c.amt) || 0).toLocaleString('en-IN'),
    'Approved / Added in Salary'
  ]);

  if (conveyanceTableBody.length === 0) {
    conveyanceTableBody.push([
      '-',
      'No Conveyance Logged',
      'No travel or conveyance claims filed for this month yet.',
      'Rs 0',
      'N/A'
    ]);
  } else {
    conveyanceTableBody.push([
      '',
      'TOTAL CONVEYANCE CLAIM',
      `${conveyances.length} Travel Claims (Sir se lena hai)`,
      '+Rs ' + (stats.totalConveyance || 0).toLocaleString('en-IN'),
      'Added into In-Hand Pay (++)'
    ]);
  }

  autoTable(doc, {
    startY: conveyanceSectionY + 2,
    margin: { left: 10, right: 10 },
    head: [['#', 'Date (Kis Din Hua/Provide)', 'Conveyance Purpose / Journey Details', 'Amount to Take From Sir (Rs)', 'Claim Status / Salary Action']],
    body: conveyanceTableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [13, 148, 136], // Teal-600
      textColor: [255, 255, 255],
      fontSize: 5.6,
      fontStyle: 'bold',
      halign: 'center',
      minCellHeight: 4.4
    },
    bodyStyles: {
      fontSize: 5.2,
      textColor: [15, 23, 42],
      valign: 'middle',
      minCellHeight: 3.8
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 110 },
      3: { halign: 'right', cellWidth: 46, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 81 }
    },
    willDrawCell: function (data: any) {
      if (data.section === 'body') {
        const isTotalRow = data.row.index === conveyanceTableBody.length - 1 && conveyances.length > 0;
        const rowX = 10;
        const rowY = data.cell.y + 0.3;
        const rowW = W - 20;
        const rowH = data.cell.height - 0.6;

        if (data.column.index === 0) {
          if (isTotalRow) {
            doc.setFillColor(204, 251, 241); // Teal-100
            doc.setDrawColor(20, 184, 166); // Teal-500
            doc.setLineWidth(0.35);
            doc.roundedRect(rowX, rowY, rowW, rowH, 1.4, 1.4, 'FD');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.3);
            doc.line(rowX + 2, rowY + 0.35, rowX + rowW - 2, rowY + 0.35);
          } else {
            const isAlt = data.row.index % 2 === 1;
            doc.setFillColor(isAlt ? 240 : 255, isAlt ? 253 : 255, isAlt ? 250 : 255);
            doc.setDrawColor(204, 251, 241);
            doc.setLineWidth(0.2);
            doc.roundedRect(rowX, rowY, rowW, rowH, 1.1, 1.1, 'FD');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.25);
            doc.line(rowX + 2, rowY + 0.3, rowX + rowW - 2, rowY + 0.3);
          }
        }
      }
    },
    didParseCell: function (data: any) {
      if (data.section === 'body') {
        if (data.row.index === conveyanceTableBody.length - 1 && conveyances.length > 0) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 118, 110];
        }
      }
    }
  });

  const table4EndY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 145;

  // -------------------------------------------------------------------------
  // FINAL VERIFICATION SIGNATURES & OFFICIAL AUDIT STAMP (LIQUID GLASS)
  // -------------------------------------------------------------------------
  let finalSigY = table4EndY + 6;
  if (finalSigY + 20 > H - 14) {
    doc.addPage();
    drawPageHeader(
      doc,
      W,
      'AUDIT VERIFICATION & AUTHORIZATION SIGNATURES',
      'Official Endorsement and Formal Reconciliation Sign-Off',
      formattedMonth,
      statementId,
      emp,
      loc,
      keopicLogoDataUrl
    );
    finalSigY = 32;
  }

  const finalSigW = (W - 24) / 2;

  // Left: Employee Acknowledgment (Liquid Glass)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(10, finalSigY, finalSigW, 18, 2, 2, 'FD');
  // Specular sheen
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(12, finalSigY + 0.4, 10 + finalSigW - 2, finalSigY + 0.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text('I hereby confirm that I have verified all daily attendance timings,', 14, finalSigY + 4.5);
  doc.text('sales numbers, conveyance claims, and cash amounts sent to Sir as recorded above.', 14, finalSigY + 8);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.line(14, finalSigY + 13, 14 + finalSigW - 8, finalSigY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Employee Signature & Date (${emp})`, 14, finalSigY + 16.2);

  // Right: Management Seal (Liquid Glass)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10 + finalSigW + 4, finalSigY, finalSigW, 18, 2, 2, 'FD');
  // Specular sheen
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(12 + finalSigW + 4, finalSigY + 0.4, W - 12, finalSigY + 0.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Certified and approved by Branch Operations & Accounts Management.', 10 + finalSigW + 8, finalSigY + 4.5);
  doc.text('All cash payments received and conveyance reimbursements have been audited.', 10 + finalSigW + 8, finalSigY + 8);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.line(10 + finalSigW + 8, finalSigY + 13, W - 14, finalSigY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory / Keopic Official Stamp', 10 + finalSigW + 8, finalSigY + 16.2);

  // =========================================================================
  // UNIVERSAL FOOTER ON EVERY PAGE (Corporate Contacts & Page Number Counter)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // Liquid Glass Spectrum Bottom Ribbon
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(10, H - 9.5, (W - 20) * 0.25, 0.4, 'F');
    doc.setFillColor(124, 58, 237); // Purple
    doc.rect(10 + (W - 20) * 0.25, H - 9.5, (W - 20) * 0.20, 0.4, 'F');
    doc.setFillColor(6, 182, 212); // Cyan
    doc.rect(10 + (W - 20) * 0.45, H - 9.5, (W - 20) * 0.25, 0.4, 'F');
    doc.setFillColor(16, 185, 129); // Emerald
    doc.rect(10 + (W - 20) * 0.70, H - 9.5, (W - 20) * 0.18, 0.4, 'F');
    doc.setFillColor(245, 158, 11); // Amber
    doc.rect(10 + (W - 20) * 0.88, H - 9.5, (W - 20) * 0.12, 0.4, 'F');

    // Developer Credit & Direct Contact (Requested by Arvind Kumar Sharma)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85); // Slate-700
    doc.text('Developer: xarvind07   |   Number: 9334208989   |   Create by Arvind Kumar Sharma', 10, H - 4.5);

    // Styled Liquid Glass Page Number Counter Badge (Right Aligned)
    doc.setFillColor(243, 246, 252);
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.3);
    doc.roundedRect(W - 32, H - 7.6, 22, 4.8, 1.2, 1.2, 'FD');
    // Top sheen
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(W - 30.5, H - 7.3, W - 11.5, H - 7.3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(67, 56, 202);
    doc.text(`Page ${pageNum} of ${totalPages}`, W - 21, H - 4.3, { align: 'center' });
  }

  return doc;
}

export function exportAndDownloadPDF(
  entries: DailyEntry[] = [],
  targets: TargetEntry[] = [],
  payments: PaymentEntry[] = [],
  meta: MetaConfig = { empName: 'Staff Member', monthVal: '2026-08', locVal: 'Main Counter', baseSalary: 17000 },
  conveyances: ConveyanceEntry[] = []
) {
  const doc = generateRecordPDF(entries, targets, payments, meta, conveyances);
  const cleanName = (meta.empName || 'Staff').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `KEO_Salary_Slip_${cleanName}_${meta.monthVal || 'Report'}.pdf`;
  doc.save(fileName);
}
