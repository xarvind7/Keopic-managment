import React, { useState } from 'react';
import { 
  Building, 
  Plus, 
  Edit3, 
  Trash2, 
  MapPin, 
  ArrowRightLeft, 
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BranchItem, ProductStockItem } from '../../types';
import { StaffAccount } from '../AuthLoginModal';
import { 
  createBranchCloud, 
  deleteBranchCloud, 
  updateStaffAccountCloud 
} from '../../lib/supabase';

interface BranchManagerProps {
  branches: BranchItem[];
  setBranches: React.Dispatch<React.SetStateAction<BranchItem[]>>;
  staffAccounts: StaffAccount[];
  setStaffAccounts: React.Dispatch<React.SetStateAction<StaffAccount[]>>;
  stockItems: ProductStockItem[];
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
}

export default function BranchManager({
  branches,
  setBranches,
  staffAccounts,
  setStaffAccounts,
  stockItems,
  triggerToast
}: BranchManagerProps) {
  // Form State
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchManager, setNewBranchManager] = useState('');

  // Move Employee State
  const [movingEmpId, setMovingEmpId] = useState('');
  const [targetBranch, setTargetBranch] = useState('');

  // Edit Branch State
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editManager, setEditManager] = useState('');

  // Create Branch in Cloud
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newBranchName.trim();
    if (!cleanName) {
      triggerToast('Branch Name Required', 'Please provide a valid branch name', true);
      return;
    }

    const exists = branches.some(b => b.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      triggerToast('Duplicate Branch', `Branch '${cleanName}' already exists`, true);
      return;
    }

    const code = newBranchCode.trim().toUpperCase() || `BR-${Math.floor(100 + Math.random() * 900)}`;
    const docId = 'br_' + Date.now();

    await createBranchCloud({
      id: docId,
      name: cleanName,
      code,
      address: newBranchAddress.trim() || 'Store Location',
      status: 'active'
    });

    triggerToast('Branch Created in Cloud', `New branch '${cleanName}' (${code}) added successfully`);
    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchAddress('');
    setNewBranchManager('');
  };

  // Save Edit Branch
  const handleSaveEditBranch = async () => {
    if (!editingBranch) return;
    await createBranchCloud({
      id: editingBranch.id,
      name: editName.trim() || editingBranch.name,
      code: editCode.trim().toUpperCase() || editingBranch.code,
      address: editAddress.trim() || editingBranch.address,
      status: 'active'
    });

    triggerToast('Branch Updated in Cloud', `Branch details saved`);
    setEditingBranch(null);
  };

  // Delete Branch from Cloud
  const handleDeleteBranch = async (id: string, name: string) => {
    const assignedStaff = staffAccounts.filter(s => s.location === name || s.branchName === name);
    const otherBranches = branches.filter(b => b.id !== id);
    const fallbackBranch = otherBranches.length > 0 ? otherBranches[0].name : 'Main Counter';

    const confirmMsg = assignedStaff.length > 0
      ? `Are you sure you want to delete branch '${name}'? ${assignedStaff.length} staff member${assignedStaff.length > 1 ? 's' : ''} assigned to this branch will be moved to '${fallbackBranch}'.`
      : `Are you sure you want to delete branch '${name}'?`;

    if (!window.confirm(confirmMsg)) return;

    await deleteBranchCloud(id);

    // Reassign employees in cloud
    if (assignedStaff.length > 0) {
      for (const s of assignedStaff) {
        await updateStaffAccountCloud(s.id, {
          branchName: fallbackBranch,
          location: fallbackBranch
        });
      }
    }

    triggerToast('Branch Deleted from Cloud', `'${name}' removed.${assignedStaff.length > 0 ? ` Staff moved to ${fallbackBranch}` : ''}`);
  };

  // Move Employee Handler
  const handleMoveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingEmpId || !targetBranch) {
      triggerToast('Select Details', 'Select an employee and target branch', true);
      return;
    }

    await updateStaffAccountCloud(movingEmpId, {
      branchName: targetBranch,
      location: targetBranch
    });

    const empObj = staffAccounts.find(s => s.id === movingEmpId);
    triggerToast('Employee Moved in Cloud', `${empObj?.empName || 'Employee'} transferred to ${targetBranch}`);
    setMovingEmpId('');
    setTargetBranch('');
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a1038] p-4 rounded-3xl border border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-400 via-pink-500 to-purple-600 p-0.5 shadow-md">
            <div className="w-full h-full bg-[#0a1038] rounded-[14px] flex items-center justify-center text-rose-300">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-black text-white">Branch Management & Employee Transfers</h2>
            <p className="text-xs text-slate-400">Manage store branches, locations & transfer staff between branches</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-xl bg-rose-500/15 text-rose-300 text-xs font-mono font-bold border border-rose-400/20">
          Total Branches: {branches.length}
        </span>
      </div>

      {/* TWO COLUMN CARDS: CREATE BRANCH & MOVE EMPLOYEE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: CREATE NEW BRANCH */}
        <div className="bg-[#0a1038] p-5 rounded-3xl border border-indigo-500/20 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Create Unlimited Store Branches</span>
          </h3>

          <form onSubmit={handleCreateBranch} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Branch Name</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={e => setNewBranchName(e.target.value)}
                  placeholder="e.g., Connaught Place, Lajpat Nagar"
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Branch Code</label>
                <input
                  type="text"
                  value={newBranchCode}
                  onChange={e => setNewBranchCode(e.target.value)}
                  placeholder="e.g., DEL-CP"
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Branch Address / Location</label>
              <input
                type="text"
                value={newBranchAddress}
                onChange={e => setNewBranchAddress(e.target.value)}
                placeholder="e.g., Ground Floor, Block B, CP Market"
                className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Assigned Branch Manager</label>
              <input
                type="text"
                value={newBranchManager}
                onChange={e => setNewBranchManager(e.target.value)}
                placeholder="e.g., Manager Name"
                className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-rose-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Building className="w-4 h-4" />
              <span>Add Store Branch</span>
            </button>
          </form>
        </div>

        {/* CARD 2: MOVE EMPLOYEE BETWEEN BRANCHES */}
        <div className="bg-[#0a1038] p-5 rounded-3xl border border-indigo-500/20 shadow-xl space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span>Transfer Employee Between Branches</span>
          </h3>

          <form onSubmit={handleMoveEmployee} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Select Employee</label>
              <select
                value={movingEmpId}
                onChange={e => setMovingEmpId(e.target.value)}
                className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="" className="bg-[#0b1238]">-- Select Employee to Move --</option>
                {staffAccounts.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0b1238]">
                    {s.empName} ({s.code}) - Current: {s.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Select Destination Branch</label>
              <select
                value={targetBranch}
                onChange={e => setTargetBranch(e.target.value)}
                className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="" className="bg-[#0b1238]">{branches.length === 0 ? '-- No Branches Available --' : '-- Select Target Branch --'}</option>
                {branches.map(b => (
                  <option key={b.id} value={b.name} className="bg-[#0b1238]">{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Moving an employee updates their branch location immediately while keeping their sales records intact.
            </p>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Confirm Branch Transfer</span>
            </button>
          </form>
        </div>

      </div>

      {/* BRANCHES LIST & STOCK STATUS GRID */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Building className="w-4 h-4 text-cyan-400" />
          <span>Active Store Branches & Stock Levels ({branches.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.length === 0 ? (
            <div className="col-span-full bg-[#0a1038] p-8 rounded-3xl border border-dashed border-indigo-500/30 text-center space-y-2">
              <Building className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No active branches found</p>
              <p className="text-xs text-slate-500">Use the form above to add your first branch location.</p>
            </div>
          ) : (
            branches.map(b => {
              const branchStaff = staffAccounts.filter(s => s.location === b.name);
              const branchStockItems = stockItems.filter(st => st.branchName === b.name);
              const lowStockAlert = branchStockItems.some(st => st.currentStock <= st.minThreshold);

              return (
                <div
                  key={b.id}
                  className="bg-[#0a1038] p-5 rounded-3xl border border-indigo-500/20 shadow-xl space-y-4 relative flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-cyan-300 text-xs bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-400/20">
                          {b.code}
                        </span>
                        {lowStockAlert && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Low Stock
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-extrabold text-white mt-1.5">{b.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{b.address || 'Address not set'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBranch(b);
                          setEditName(b.name);
                          setEditCode(b.code);
                          setEditAddress(b.address);
                          setEditManager(b.managerName || '');
                        }}
                        className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 transition cursor-pointer"
                        title="Edit Branch"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBranch(b.id, b.name)}
                        className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 transition cursor-pointer"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#101742] p-3 rounded-2xl border border-indigo-500/20 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Branch Manager:</span>
                      <span className="font-bold text-white">{b.managerName || 'Not assigned'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Assigned Employees:</span>
                      <span className="font-mono font-bold text-emerald-400">{branchStaff.length} Staff</span>
                    </div>

                    {branchStockItems.length > 0 && (
                      <div className="pt-2 border-t border-indigo-500/15 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Available Stock Status:</span>
                        {branchStockItems.map(st => (
                          <div key={st.id} className="flex justify-between text-[11px]">
                            <span className="text-slate-300">{st.productName}:</span>
                            <span className={`font-mono font-bold ${st.currentStock <= st.minThreshold ? 'text-amber-400' : 'text-cyan-300'}`}>
                              {st.currentStock} Units
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assigned staff chip list */}
                  <div className="pt-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Branch Staff Members:</span>
                    <div className="flex flex-wrap gap-1">
                      {branchStaff.length === 0 ? (
                        <span className="text-[11px] text-slate-500 italic">No employees assigned yet</span>
                      ) : (
                        branchStaff.map(s => (
                          <span key={s.id} className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 text-[10px] font-mono border border-white/10">
                            {s.empName} ({s.code})
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* EDIT BRANCH MODAL */}
      <AnimatePresence>
        {editingBranch && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a1038] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-rose-400" />
                  <span>Edit Branch ({editingBranch.name})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Branch Code</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={e => setEditCode(e.target.value)}
                    className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl p-2.5 text-cyan-300 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Branch Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Branch Manager</label>
                  <input
                    type="text"
                    value={editManager}
                    onChange={e => setEditManager(e.target.value)}
                    className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditBranch}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black shadow-md"
                >
                  Save Branch Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
