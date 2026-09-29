import { supabase } from '../lib/supabase';
import { DailyEntry, AttendanceRecord } from '../types';
import { logActivity } from './activityService';

export async function saveAttendanceEntrySupabase(
  employeeId: string,
  empName: string,
  branchName: string,
  entry: DailyEntry
) {
  if (!employeeId || !entry.date) return;

  try {
    const isWeekOff = entry.status === 'Week Off';
    const isAutoAbsent = entry.status === 'Auto Absent' || Boolean(entry.autoAbsent);
    const dbStatus = entry.status.toLowerCase().replace(/\s+/g, '_');

    await supabase.from('attendance').upsert({
      employee_id: employeeId,
      emp_name: empName,
      branch_name: branchName,
      date: entry.date,
      status: dbStatus,
      check_in: entry.inTime || null,
      check_out: entry.outTime || null,
      week_off: isWeekOff,
      auto_absent: isAutoAbsent,
      notes: entry.day || '',
      updated_at: new Date().toISOString()
    }, { onConflict: 'employee_id,date' });

    logActivity(
      'ATTENDANCE_RECORDED',
      'Attendance',
      `${empName} marked ${entry.status} for ${entry.date}`,
      empName,
      employeeId
    );
  } catch (err) {
    console.warn('[attendanceService] Error saving attendance:', err);
  }
}

export function subscribeToAllAttendance(callback: (records: AttendanceRecord[]) => void) {
  const fetchAll = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data) {
        callback(data.map(d => ({
          id: d.id,
          employee_id: d.employee_id,
          employee_name: d.emp_name,
          branch_name: d.branch_name,
          date: d.date,
          status: d.status,
          check_in: d.check_in,
          check_out: d.check_out,
          work_hours: d.work_hours,
          overtime_hours: d.overtime_hours,
          week_off: d.week_off,
          auto_absent: d.auto_absent,
          created_at: d.created_at,
          updated_at: d.updated_at
        })));
      }
    } catch (err) {
      console.warn('[attendanceService] Error fetching attendance:', err);
    }
  };

  fetchAll();

  const channel = supabase
    .channel('public:attendance')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
      fetchAll();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
