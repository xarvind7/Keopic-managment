import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Building, 
  Trash2, 
  Edit3, 
  Star, 
  Copy, 
  Eye, 
  EyeOff, 
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StaffAccount } from '../AuthLoginModal';
import { BranchItem } from '../../types';
import { 
  createStaffAccountCloud, 
  updateStaffAccountCloud, 
  deleteStaffAccountCloud 
} from '../../lib/supabase';

interface EmployeeManagerProps {
  staffAccounts: StaffAccount[];
  setStaffAccounts: React.Dispatch<React.SetStateAction<StaffAccount[]>>;
  branches: BranchItem[];
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
}

export default function EmployeeManager({
  staffAccounts,
  setStaffAccounts,
  branches,
  triggerToast
}: EmployeeManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Form State for New Employee
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpBranch, setNewEmpBranch] = useState(branches[0]?.name || 'Connaught Place');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'staff' | 'branch_manager' | 'admin'>('staff');

  // Edit Employee State
  const [editingEmp, setEditingEmp] = useState<StaffAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'staff' | 'branch_manager' | 'admin'>('staff');
  const [editRating, setEditRating] = useState<number>(5);

  // Toggle visible passwords
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Auto Generate Employee ID
  const handleAutoGenerateId = () => {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    setNewEmpCode(`EMP-${nextNum}`);
  };

  // Create Employee in Cloud
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newEmpName.trim();
    const cleanBranch = newEmpBranch.trim() || 'Connaught Place';
    const cleanUser = newEmpUsername.trim().toLowerCase();
    const cleanPass = newEmpPassword.trim();
    const cleanCode = (newEmpCode.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();

    if (!cleanName || !cleanUser || !cleanPass) {
      triggerToast('Missing Details', 'Please fill in Name, Username and Password', true);
      return;
    }

    const exists = staffAccounts.some(acc => acc.username.toLowerCase() === cleanUser || acc.code.toUpperCase() === cleanCode);
    if (exists) {
      triggerToast('Duplicate Entry', 'Username or Employee ID already exists. Try another.', true);
      return;
    }

    const docId = 'emp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newAccount: StaffAccount = {
      id: docId,
      empName: cleanName,
      location: cleanBranch,
      username: cleanUser,
      password: cleanPass,
      code: cleanCode,
      createdAt: Date.now(),
      isActive: true,
      role: newEmpRole,
    };

    // Save to Firestore Cloud Database
    await createStaffAccountCloud({
      id: docId,
      employeeId: cleanCode,
      username: cleanUser,
      password: cleanPass,
      displayName: cleanName,
      empName: cleanName,
      branchName: cleanBranch,
      location: cleanBranch,
      role: newEmpRole,
      status: 'active'
    });

    triggerToast('Employee ID Created in Cloud', `ID: ${cleanCode} | Name: ${cleanName}`);
    setNewEmpName('');
    setNewEmpUsername('');
    setNewEmpPassword('');
    setNewEmpCode('');
  };

  // Save Edit Employee in Cloud
  const handleSaveEdit = async () => {
    if (!editingEmp) return;

    await updateStaffAccountCloud(editingEmp.id, {
      empName: editName.trim() || editingEmp.empName,
      displayName: editName.trim() || editingEmp.empName,
      branchName: editBranch || editingEmp.location,
      location: editBranch || editingEmp.location,
      password: editPassword.trim() || editingEmp.password,
      role: editRole,
      rating: editRating
    });

    triggerToast('Employee Updated in Cloud', `Changes saved for ${editName}`);
    setEditingEmp(null);
  };

  // Toggle Active/Disable status in Cloud
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const nextStatus = currentActive ? 'disabled' : 'active';
    await updateStaffAccountCloud(id, {
      status: nextStatus,
      isActive: !currentActive
    });
    triggerToast('Status Updated in Cloud', `Employee set to ${nextStatus.toUpperCase()}`);
  };

  // Delete Employee from Cloud
  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete employee ${name}?`)) return;
    await deleteStaffAccountCloud(id);
    triggerToast('Employee Deleted from Cloud', `${name} removed from system`);
  };

  // Copy Credentials
  const handleCopy = (acc: StaffAccount) => {
    const text = `Employee Account Credentials:\nName: ${acc.empName}\nEmployee ID: ${acc.code}\nBranch: ${acc.location}\nUsername: ${acc.username}\nPassword: ${acc.password}\nRole: ${(acc.role || 'staff').toUpperCase()}`;
    navigator.clipboard.writeText(text);
    triggerToast('Copied to Clipboard', `Credentials for ${acc.empName} copied`);
  };

  // Filtered List
  const filteredEmployees = useMemo(() => {
    return staffAccounts.filter(acc => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || acc.empName.toLowerCase().includes(q) || acc.code.toLowerCase().includes(q) || acc.username.toLowerCase().includes(q) || acc.location.toLowerCase().includes(q);
      const matchesBranch = selectedBranchFilter === 'ALL' || acc.location === selectedBranchFilter;
      const matchesRole = selectedRoleFilter === 'ALL' || (acc.role || 'staff') === selectedRoleFilter;
      return matchesSearch && matchesBranch && matchesRole;
    });
  }, [staffAccounts, searchQuery, selectedBranchFilter, selectedRoleFilter]);

  // Branch wise grouping
  const branchWiseGroups = useMemo(() => {
    const groups: Record<string, StaffAccount[]> = {};
    filteredEmployees.forEach(acc => {
      const b = acc.location || 'Unassigned Branch';
      if (!groups[b]) groups[b] = [];
      groups[b].push(acc);
    });
    return groups;
  }, [filteredEmployees]);

  return (
    <div className="space-y-6">
      
      {/* SECTION TITLE & STATS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a1038] p-4 rounded-3xl border border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shadow-md">
            <div className="w-full h-full bg-[#0a1038] rounded-[14px] flex items-center justify-center text-cyan-300">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-black text-white">Employee ID Management System</h2>
            <p className="text-xs text-slate-400">Create, assign branches, edit roles & manage passwords</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 text-xs font-mono font-bold border border-cyan-400/20">
            Total Staff: {staffAccounts.length}
          </span>
          <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold border border-emerald-400/20">
            Active: {staffAccounts.filter(a => a.isActive !== false).length}
          </span>
        </div>
      </div>

      {/* CREATE EMPLOYEE FORM CARD */}
      <div className="bg-[#0a1038] p-5 rounded-3xl border border-indigo-500/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Generate New Employee ID (Admin Exclusive)</span>
          </h3>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 bg-white/5 px-2.5 py-1 rounded-full">
            Admin Controlled
          </span>
        </div>

        <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Full Name</label>
            <input
              type="text"
              required
              value={newEmpName}
              onChange={e => setNewEmpName(e.target.value)}
              placeholder="e.g., Arvind Sharma"
              className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Assign Branch</label>
            <select
              value={newEmpBranch}
              onChange={e => setNewEmpBranch(e.target.value)}
              className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {branches.length > 0 ? (
                branches.map(b => (
                  <option key={b.id} value={b.name} className="bg-[#0b1238]">{b.name}</option>
                ))
              ) : (
                <option value="Connaught Place" className="bg-[#0b1238]">Connaught Place</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Employee ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newEmpCode}
                onChange={e => setNewEmpCode(e.target.value)}
                placeholder="e.g., EMP-1001"
                className="flex-1 bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleAutoGenerateId}
                className="px-3 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold border border-indigo-400/30 transition cursor-pointer"
              >
                Auto
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Login Username</label>
            <input
              type="text"
              required
              value={newEmpUsername}
              onChange={e => setNewEmpUsername(e.target.value)}
              placeholder="e.g., arvind1001"
              className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Password</label>
            <input
              type="text"
              required
              value={newEmpPassword}
              onChange={e => setNewEmpPassword(e.target.value)}
              placeholder="Set secure password"
              className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Access Role</label>
            <select
              value={newEmpRole}
              onChange={e => setNewEmpRole(e.target.value as any)}
              className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="staff" className="bg-[#0b1238]">Staff (Counter Exec)</option>
              <option value="branch_manager" className="bg-[#0b1238]">Branch Manager</option>
              <option value="admin" className="bg-[#0b1238]">Assistant Admin</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Official Employee ID</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-[#0a1038] p-4 rounded-3xl border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Employee ID, Name, Username or Branch..."
            className="w-full pl-10 pr-4 py-2 bg-[#101742] border border-indigo-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#101742] border border-indigo-500/30 rounded-xl px-3 py-1.5 text-xs">
            <Building className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedBranchFilter}
              onChange={e => setSelectedBranchFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#0b1238]">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name} className="bg-[#0b1238]">{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#101742] border border-indigo-500/30 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <select
              value={selectedRoleFilter}
              onChange={e => setSelectedRoleFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#0b1238]">All Roles</option>
              <option value="staff" className="bg-[#0b1238]">Staff</option>
              <option value="branch_manager" className="bg-[#0b1238]">Branch Managers</option>
              <option value="admin" className="bg-[#0b1238]">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* BRANCH-WISE EMPLOYEE LIST & CARDS */}
      <div className="space-y-6">
        {Object.keys(branchWiseGroups).length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs italic bg-[#0a1038] rounded-3xl border border-indigo-500/20">
            No employees match the current filter criteria.
          </div>
        ) : (
          Object.entries(branchWiseGroups).map(([branchName, employeesList]) => {
            const employees = employeesList as StaffAccount[];
            return (
            <div key={branchName} className="bg-[#0a1038] p-5 rounded-3xl border border-indigo-500/20 shadow-xl space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/15">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-black text-white">{branchName}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold">
                    {employees.length} Employee(s)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map(emp => {
                  const showPass = !!visiblePasswords[emp.id];
                  const isActive = emp.isActive !== false;

                  return (
                    <div
                      key={emp.id}
                      className="bg-[#101742] p-4 rounded-2xl border border-indigo-500/25 shadow-lg space-y-3 relative flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-300 text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
                              {emp.code}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">
                              {emp.role || 'staff'}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-white mt-1.5">{emp.empName}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">📍 Branch: {emp.location}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(emp.id, isActive)}
                          className={`px-2 py-1 rounded-full text-[10px] font-mono font-bold border transition cursor-pointer shrink-0 ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                          }`}
                        >
                          {isActive ? 'Active' : 'Disabled'}
                        </button>
                      </div>

                      <div className="bg-[#0b1133] p-3 rounded-xl border border-indigo-500/15 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Username:</span>
                          <span className="font-mono font-bold text-cyan-300">{emp.username}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Password:</span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-purple-300">
                              {showPass ? emp.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setVisiblePasswords(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                              className="p-1 text-slate-400 hover:text-white transition"
                            >
                              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {emp.rating && (
                          <div className="flex justify-between items-center pt-1 border-t border-indigo-500/15">
                            <span className="text-slate-400">Rating:</span>
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {Array.from({ length: emp.rating }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEmp(emp);
                            setEditName(emp.empName);
                            setEditBranch(emp.location);
                            setEditPassword(emp.password);
                            setEditRole((emp.role as 'staff' | 'admin' | 'branch_manager') || 'staff');
                            setEditRating(emp.rating || 5);
                          }}
                          className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 transition cursor-pointer flex items-center justify-center"
                          title="Edit Employee & Change Branch"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(emp)}
                          className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-400/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy ID</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp.id, emp.empName)}
                          className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 transition cursor-pointer"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })
        )}
      </div>

      {/* EDIT EMPLOYEE MODAL */}
      <AnimatePresence>
        {editingEmp && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a1038] border border-cyan-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <span>Edit Employee ({editingEmp.code})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Change Branch</label>
                  <select
                    value={editBranch}
                    onChange={e => setEditBranch(e.target.value)}
                    className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl p-2.5 text-white"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name} className="bg-[#0b1238]">{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Reset Password</label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Role Permission</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl p-2.5 text-white"
                  >
                    <option value="staff" className="bg-[#0b1238]">Staff</option>
                    <option value="branch_manager" className="bg-[#0b1238]">Branch Manager</option>
                    <option value="admin" className="bg-[#0b1238]">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Performance Rating (1 - 5 Stars)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setEditRating(star)}
                        className={`p-2 rounded-xl border flex-1 flex items-center justify-center transition cursor-pointer ${
                          editRating >= star
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${editRating >= star ? 'fill-amber-400' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-black shadow-md"
                >
                  Save Employee Updates
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
