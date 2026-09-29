import { DailyEntry, TargetEntry, PaymentEntry, ConveyanceEntry } from '../types';

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDaysInMonth(monthVal: string): number {
  if (!monthVal || !monthVal.includes('-')) return 30;
  const [year, month] = monthVal.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function calculateDayName(dateString: string): string {
  if (!dateString) return '';
  const parsed = new Date(dateString + 'T00:00:00');
  return isNaN(parsed.getTime()) ? '' : DAYS[parsed.getDay()];
}

export function formatMoney(value: number, digits = 0): string {
  return '₹' + (value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export const STAND_UNIT_PRICE = 200;
export const MAGNET_UNIT_PRICE = 250;
export const MAX_ALLOWED_WEEK_OFFS = 4;
export const WEEK_OFF_MILESTONE_DAYS = [8, 16, 24, 30] as const;
export const STANDARD_SHIFT_HOURS = 9;
export const STANDARD_SHIFT_MINUTES = 9 * 60; // 540 minutes
export const MIN_OVERTIME_MINUTES_FOR_PAY = 60; // Minimum 1 hour (60 mins) daily overtime required for extra payment

export function parseDailyWorkTime(inTime?: string, outTime?: string, status?: string): {
  totalMinutes: number;
  workFormatted: string;
  extraMinutes: number;
  extraFormatted: string;
  extraHoursDecimal: number;
  payableExtraMinutes: number;
  isOvertimePayable: boolean;
} {
  if (status !== 'Present' || !inTime || !outTime) {
    return {
      totalMinutes: 0,
      workFormatted: '-',
      extraMinutes: 0,
      extraFormatted: '-',
      extraHoursDecimal: 0,
      payableExtraMinutes: 0,
      isOvertimePayable: false
    };
  }
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) {
    return {
      totalMinutes: 0,
      workFormatted: '-',
      extraMinutes: 0,
      extraFormatted: '-',
      extraHoursDecimal: 0,
      payableExtraMinutes: 0,
      isOvertimePayable: false
    };
  }
  let mins = (outH * 60 + outM) - (inH * 60 + inM);
  if (mins < 0) mins += 24 * 60; // handle overnight shift

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const workFormatted = `${h}h${m > 0 ? ` ${m}m` : ''}`;

  const extraMins = Math.max(0, mins - STANDARD_SHIFT_MINUTES);
  const extraH = Math.floor(extraMins / 60);
  const extraM = extraMins % 60;
  const extraFormatted = extraMins > 0 ? `+${extraH}h${extraM > 0 ? ` ${extraM}m` : ''}` : '-';
  const extraHoursDecimal = Number((extraMins / 60).toFixed(2));

  // Overtime Payment Rule:
  // All extra minutes are tracked in extraMinutes/extraFormatted,
  // but extra money (overtime pay) is only credited if extra duty on that day is at least 60 minutes (1 hour).
  const isOvertimePayable = extraMins >= MIN_OVERTIME_MINUTES_FOR_PAY;
  const payableExtraMinutes = isOvertimePayable ? extraMins : 0;

  return {
    totalMinutes: mins,
    workFormatted,
    extraMinutes: extraMins,
    extraFormatted,
    extraHoursDecimal,
    payableExtraMinutes,
    isOvertimePayable
  };
}

export interface CalculationResult {
  baseSalary: number;
  daysInMonth: number;
  perDaySalary: number;
  perHourSalary: number;
  standardShiftHours: number;
  totalWorkMinutes: number;
  totalExtraMinutes: number;
  totalExtraHours: number;
  payableExtraMinutes: number;
  payableExtraHours: number;
  formattedTotalWork: string;
  formattedTotalExtra: string;
  formattedPayableExtra: string;
  overtimePay: number;
  totalStand: number;
  totalMagnet: number;
  totalFrame: number;
  standUnits: number;
  magnetUnits: number;
  totalItemsSold: number;
  grossSales: number;
  totalIncentive: number;
  presentDays: number;
  rawAbsentDays: number;
  absentDays: number;
  weekOffs: number;
  allowedWeekOffs: number;
  allowedWeekOffsUsed: number;
  accruedWeekOffs: number;
  effectiveDays: number;
  extraWeekOffs: number;
  workedDays: number;
  mainSalary: number;
  missedWeekOffs: number;
  extraOffPayment: number;
  continuousWorkStreak: number;
  unavailedWeekOffs: number;
  unavailedWeekOffPay: number;
  isMonthCompleted: boolean;
  totalAbsentDays: number;
  salaryDeduction: number;
  deductions: number;
  overtimeBonus: number;
  excessAbsents: number;
  netEarnedSalary: number;
  totalTargets: number;
  totalConveyance: number;
  conveyanceEntries: ConveyanceEntry[];
  totalSalary: number;
  finalPayable: number;
  totalPaid: number;
  totalAdvance: number;
  totalAccountableCash: number;
  adjustedCashToSir: number;
  extraCashSentToSir: number;
  netRemainingAdvance: number;
  netBalance: number;
  maxDailySales: number;
  maxDailyDate: string;
  processedEntries: DailyEntry[];
}

/**
 * Deterministic business calculations strictly adhering to:
 * - 4 allowed week-offs per month.
 * - Week-offs > 4 automatically marked as Auto Absent and deducted from salary.
 * - Standard daily working shift: 9 Hours.
 * - Hourly Rate = (Base Salary / Days in Month) / 9 Hours.
 * - Overtime Pay = Extra Hours Worked * Hourly Rate.
 * - Net Salary = (Base Salary - Salary Deductions) + Incentives + Targets + Overtime Pay.
 */
export function performCalculations(
  entries: DailyEntry[] = [],
  targets: TargetEntry[] = [],
  payments: PaymentEntry[] = [],
  baseSalary: number = 17000,
  monthVal: string = '2026-08',
  conveyances: ConveyanceEntry[] = []
): CalculationResult {
  const daysInMonth = getDaysInMonth(monthVal);
  const perDaySalary = daysInMonth > 0 ? baseSalary / daysInMonth : 0;
  // Standard Shift = 9 Hours. Per Hour Salary = (Base Salary / daysInMonth) / 9
  const perHourSalary = perDaySalary > 0 ? perDaySalary / STANDARD_SHIFT_HOURS : 0;

  let totalStand = 0;
  let totalMagnet = 0;
  let totalFrame = 0;
  let totalIncentive = 0;
  let presentDays = 0;
  let rawAbsentDays = 0;
  let weekOffCount = 0;
  let maxDailySales = 0;
  let maxDailyDate = '-';

  let grandTotalWorkMinutes = 0;
  let grandTotalExtraMinutes = 0;
  let grandPayableExtraMinutes = 0;

  // Sort entries by date ascending for chronological week-off evaluation
  const sortedEntries = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  let maxStreak = 0;
  let currentStreak = 0;

  const processedEntries: DailyEntry[] = sortedEntries.map(entry => {
    const stand = Number(entry.stand) || 0;
    const magnet = Number(entry.magnet) || 0;
    const frame = Number(entry.frame) || 0;
    const dailyTotal = stand + magnet + frame;

    let currentStatus = entry.status;
    let isAutoAbsent = false;

    if (currentStatus === 'Week Off') {
      weekOffCount++;
      if (weekOffCount > MAX_ALLOWED_WEEK_OFFS) {
        currentStatus = 'Auto Absent';
        isAutoAbsent = true;
      }
      currentStreak = 0; // Break continuous streak on week-off
    } else if (currentStatus === 'Auto Absent') {
      weekOffCount++;
      isAutoAbsent = true;
      currentStreak = 0;
    } else if (currentStatus === 'Absent' || currentStatus === 'Leave') {
      rawAbsentDays++;
      currentStreak = 0;
    }

    if (currentStatus === 'Present') {
      presentDays++;
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
      if (dailyTotal > maxDailySales) {
        maxDailySales = dailyTotal;
        maxDailyDate = entry.date;
      }
    }

    totalStand += stand;
    totalMagnet += magnet;
    totalFrame += frame;

    // Daily Incentive Formula:
    // 10% on (Stand + Magnet) if combined daily sales (Stand + Magnet + Frame) >= 500
    // 7% on Frame sales regardless of amount
    let inc = 0;
    if (currentStatus === 'Present') {
      if (stand + magnet + frame >= 500) {
        inc += (stand + magnet) * 0.10;
      }
      inc += frame * 0.07;
    }
    totalIncentive += inc;

    // Overtime & Work Hours Calculation
    const timingData = parseDailyWorkTime(entry.inTime, entry.outTime, currentStatus);
    grandTotalWorkMinutes += timingData.totalMinutes;
    grandTotalExtraMinutes += timingData.extraMinutes;
    grandPayableExtraMinutes += timingData.payableExtraMinutes;

    return {
      ...entry,
      status: currentStatus,
      autoAbsent: isAutoAbsent,
      incentive: inc,
      workHours: timingData.workFormatted
    };
  });

  const grossSales = totalStand + totalMagnet + totalFrame;

  // Item unit counts based on standard unit pricing
  const standUnits = Math.round(totalStand / STAND_UNIT_PRICE);
  const magnetUnits = Math.round(totalMagnet / MAGNET_UNIT_PRICE);
  const totalItemsSold = standUnits + magnetUnits;

  // Week-off and Deduction calculations
  const totalWeekOffsRequested = weekOffCount;
  const allowedWeekOffs = MAX_ALLOWED_WEEK_OFFS;
  const allowedWeekOffsUsed = Math.min(totalWeekOffsRequested, MAX_ALLOWED_WEEK_OFFS);
  const extraWeekOffs = Math.max(0, totalWeekOffsRequested - MAX_ALLOWED_WEEK_OFFS);

  // Determine elapsed/logged days in the month for milestone-based week-off accrual:
  let maxDayFromEntries = 0;
  for (const entry of entries) {
    if (entry.date) {
      const parts = entry.date.split('-');
      if (parts.length === 3) {
        const dayNum = parseInt(parts[2], 10);
        if (!isNaN(dayNum) && dayNum > maxDayFromEntries) {
          maxDayFromEntries = dayNum;
        }
      }
    }
  }

  const isMonthCompleted = entries.length >= daysInMonth || maxDayFromEntries >= daysInMonth;
  const effectiveDays = isMonthCompleted ? daysInMonth : Math.max(entries.length, maxDayFromEntries);

  // Milestone-Based Week-Off Accrual Business Logic:
  // Har mahine employee ko total 4 allowed week-offs milte hain.
  // Lekin unka extra duty payment / encashment din ke milestones par unlock hota hai:
  // - 8 din hone par: 1st week-off qualify/accrue hota hai (agar off nahi liya to 1 off ka paisa add hoga)
  // - 16 din hone par: 2nd week-off qualify/accrue hote hain (agar off nahi liya to 2 offs ka paisa add hoga)
  // - 24 din hone par: 3rd week-off qualify/accrue hote hain (agar off nahi liya to 3 offs ka paisa add hoga)
  // - 30-31 din (ya month end) pura hone par: 4th week-off qualify/accrue hota hai (agar off nahi liya to 4 offs ka paisa add hoga)
  // - 8 din se kam hone par: 0 week-offs qualify hote hain
  let accruedWeekOffs = 0;
  const monthEndThreshold = Math.min(30, daysInMonth);
  if (effectiveDays >= monthEndThreshold || effectiveDays >= daysInMonth || isMonthCompleted) {
    accruedWeekOffs = 4;
  } else if (effectiveDays >= 24) {
    accruedWeekOffs = 3;
  } else if (effectiveDays >= 16) {
    accruedWeekOffs = 2;
  } else if (effectiveDays >= 8) {
    accruedWeekOffs = 1;
  } else {
    accruedWeekOffs = 0;
  }

  // Unused accrued week-offs encashment pay:
  // Agar employee ne accrued week-offs se kam week-offs liye hain, to un bache huye week-offs par
  // duty karne ka extra payment (+1 din ka salary per unused off) add hota hai.
  const unavailedWeekOffs = Math.max(0, accruedWeekOffs - totalWeekOffsRequested);
  const missedWeekOffs = unavailedWeekOffs;
  const unavailedWeekOffPay = Math.round(unavailedWeekOffs * perDaySalary);
  const extraOffPayment = unavailedWeekOffPay;

  // Total Deductible Absents = Direct Absents + Extra Week Offs (Auto Absents)
  const totalAbsentDays = rawAbsentDays + extraWeekOffs;
  const salaryDeduction = Math.round(totalAbsentDays * perDaySalary);
  const deductions = salaryDeduction;

  // Actual Worked / Payable Days Calculation:
  // Worked days includes days actually worked (Present) + allowable paid week-offs availed
  const workedDays = Math.max(0, daysInMonth - totalAbsentDays);

  // Main Salary Calculation:
  // Per-Day Salary * Worked Days (equivalent to Base Salary - Absent Deductions)
  const mainSalary = Math.max(0, Math.round(workedDays * perDaySalary));
  const netEarnedSalary = mainSalary;

  // Total Targets & Commissions
  const totalTargets = targets.reduce((acc, t) => acc + (Number(t.amt) || 0), 0);

  // Conveyance Allowance Calculation (Sir se lena hai):
  // Sum of all conveyance claims logged for the month + any inline daily entry conveyance
  const totalConveyanceFromList = conveyances.reduce((acc, c) => acc + (Number(c.amt) || 0), 0);
  const totalDailyRowConveyance = entries.reduce((acc, e) => acc + (Number(e.conveyance) || 0), 0);
  const totalConveyance = totalConveyanceFromList + totalDailyRowConveyance;

  // Overtime Pay Calculation:
  // Total Extra Hours tracks all extra minutes logged.
  // Payable Overtime is only credited for days where extra time was at least 60 minutes (1 hour).
  const totalExtraHours = Number((grandTotalExtraMinutes / 60).toFixed(2));
  const payableExtraHours = Number((grandPayableExtraMinutes / 60).toFixed(2));
  const overtimePay = Math.round((grandPayableExtraMinutes / 60) * perHourSalary);
  const overtimeBonus = overtimePay;

  const totalWorkHrsInt = Math.floor(grandTotalWorkMinutes / 60);
  const totalWorkMinsRem = grandTotalWorkMinutes % 60;
  const formattedTotalWork = `${totalWorkHrsInt}h ${totalWorkMinsRem}m`;

  const totalExtraHrsInt = Math.floor(grandTotalExtraMinutes / 60);
  const totalExtraMinsRem = grandTotalExtraMinutes % 60;
  const formattedTotalExtra = grandTotalExtraMinutes > 0 ? `${totalExtraHrsInt}h ${totalExtraMinsRem}m` : '0h 0m';

  const payableExtraHrsInt = Math.floor(grandPayableExtraMinutes / 60);
  const payableExtraMinsRem = grandPayableExtraMinutes % 60;
  const formattedPayableExtra = grandPayableExtraMinutes > 0 ? `${payableExtraHrsInt}h ${payableExtraMinsRem}m` : '0h 0m';

  // Final Total Salary = Main Salary + Extra Off Payment + Incentive + Targets + Overtime Pay + Conveyance Allowance (++)
  const finalPayable = Math.max(0, mainSalary + extraOffPayment + totalIncentive + totalTargets + overtimePay + totalConveyance);
  const totalSalary = finalPayable;

  // Payments categorization: Cash sent to Sir vs Advance money received from Sir
  let totalPaid = 0;
  let totalAdvance = 0;
  payments.forEach(p => {
    const amount = Number(p.amt) || 0;
    if (p.type === 'advance_received') {
      totalAdvance += amount;
    } else {
      totalPaid += amount;
    }
  });

  // Accountable Cash & Store Balance calculations
  const totalAccountableCash = grossSales + totalAdvance;
  const netBalance = totalAccountableCash - totalPaid;
  const extraCashSentToSir = Math.max(0, totalPaid - totalAccountableCash);
  const netRemainingAdvance = Math.max(0, totalAdvance - Math.max(0, totalPaid - grossSales));
  const adjustedCashToSir = totalPaid;

  return {
    baseSalary,
    daysInMonth,
    perDaySalary,
    perHourSalary,
    standardShiftHours: STANDARD_SHIFT_HOURS,
    totalWorkMinutes: grandTotalWorkMinutes,
    totalExtraMinutes: grandTotalExtraMinutes,
    totalExtraHours,
    payableExtraMinutes: grandPayableExtraMinutes,
    payableExtraHours,
    formattedTotalWork,
    formattedTotalExtra,
    formattedPayableExtra,
    overtimePay,
    totalStand,
    totalMagnet,
    totalFrame,
    standUnits,
    magnetUnits,
    totalItemsSold,
    grossSales,
    totalIncentive,
    presentDays,
    rawAbsentDays,
    absentDays: rawAbsentDays,
    weekOffs: allowedWeekOffsUsed,
    allowedWeekOffs,
    allowedWeekOffsUsed,
    accruedWeekOffs,
    effectiveDays,
    extraWeekOffs,
    workedDays,
    mainSalary,
    missedWeekOffs,
    extraOffPayment,
    continuousWorkStreak: maxStreak,
    unavailedWeekOffs,
    unavailedWeekOffPay,
    isMonthCompleted,
    totalAbsentDays,
    salaryDeduction,
    deductions,
    overtimeBonus,
    excessAbsents: extraWeekOffs,
    netEarnedSalary,
    totalTargets,
    totalConveyance,
    conveyanceEntries: conveyances,
    totalSalary,
    finalPayable,
    totalPaid,
    totalAdvance,
    totalAccountableCash,
    adjustedCashToSir,
    extraCashSentToSir,
    netRemainingAdvance,
    netBalance,
    maxDailySales,
    maxDailyDate,
    processedEntries
  };
}
