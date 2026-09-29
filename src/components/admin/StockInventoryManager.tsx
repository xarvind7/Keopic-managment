import React, { useState, useMemo } from 'react';
import { 
  Package, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  Edit3, 
  Building, 
  Filter,
} from 'lucide-react';
import { ProductStockItem, StockTransferLog, BranchItem } from '../../types';
import { executeStockTransferCloud } from '../../lib/supabase';

interface StockInventoryManagerProps {
  stockItems: ProductStockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<ProductStockItem[]>>;
  transferLogs: StockTransferLog[];
  setTransferLogs: React.Dispatch<React.SetStateAction<StockTransferLog[]>>;
  branches: BranchItem[];
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
}

export default function StockInventoryManager({
  stockItems,
  setStockItems,
  transferLogs,
  setTransferLogs,
  branches,
  triggerToast
}: StockInventoryManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'transfers' | 'adjust'>('inventory');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedProductFilter, setSelectedProductFilter] = useState('ALL');

  // Stock Adjustment State
  const [adjBranch, setAdjBranch] = useState(branches[0]?.name || 'Main Counter');
  const [adjProduct, setAdjProduct] = useState<'Stand' | 'Magnet' | 'Frame'>('Stand');
  const [adjOpening, setAdjOpening] = useState<number>(1000);
  const [adjReceived, setAdjReceived] = useState<number>(500);
  const [adjSold, setAdjSold] = useState<number>(0);
  const [adjDamaged, setAdjDamaged] = useState<number>(0);
  const [adjReturned, setAdjReturned] = useState<number>(0);
  const [adjThreshold, setAdjThreshold] = useState<number>(100);

  // Stock Transfer Form State
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transferProduct, setTransferProduct] = useState<'Stand' | 'Magnet' | 'Frame'>('Stand');
  const [transferQty, setTransferQty] = useState<number>(50);
  const [fromBranch, setFromBranch] = useState(branches[0]?.name || 'Main Counter');
  const [toBranch, setToBranch] = useState(branches[1]?.name || 'Delhi CP Branch');
  const [senderName, setSenderName] = useState('Admin');
  const [receiverName, setReceiverName] = useState('Branch Manager');
  const [transferRemarks, setTransferRemarks] = useState('Stock Refill');

  // Handle Save Stock Adjustment
  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const currentStock = Math.max(0, adjOpening + adjReceived - adjSold - adjDamaged + adjReturned);

    const existingIndex = stockItems.findIndex(st => st.branchName === adjBranch && st.productName === adjProduct);

    let updated: ProductStockItem[];
    if (existingIndex >= 0) {
      updated = stockItems.map((st, idx) => {
        if (idx === existingIndex) {
          return {
            ...st,
            openingStock: adjOpening,
            receivedStock: adjReceived,
            soldStock: adjSold,
            damagedStock: adjDamaged,
            returnedStock: adjReturned,
            currentStock,
            minThreshold: adjThreshold
          };
        }
        return st;
      });
    } else {
      const newItem: ProductStockItem = {
        id: 'stk_' + Date.now(),
        branchName: adjBranch,
        productName: adjProduct,
        openingStock: adjOpening,
        receivedStock: adjReceived,
        soldStock: adjSold,
        damagedStock: adjDamaged,
        returnedStock: adjReturned,
        currentStock,
        minThreshold: adjThreshold
      };
      updated = [...stockItems, newItem];
    }

    setStockItems(updated);
    triggerToast('Stock Updated', `Stock for ${adjProduct} at ${adjBranch} updated (${currentStock} Units)`);
  };

  // Handle Stock Transfer Submit via Cloud Transaction
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromBranch === toBranch) {
      triggerToast('Transfer Error', 'Source and destination branch cannot be the same', true);
      return;
    }

    if (transferQty <= 0) {
      triggerToast('Invalid Quantity', 'Please enter a valid transfer quantity', true);
      return;
    }

    const txId = 'tx_' + Date.now();
    await executeStockTransferCloud({
      id: txId,
      type: 'TRANSFER',
      fromBranch,
      toBranch,
      productName: transferProduct,
      quantity: transferQty,
      senderName: senderName.trim() || 'Admin',
      receiverName: receiverName.trim() || 'Store Receiver',
      remarks: transferRemarks.trim() || 'Routine Refill',
      status: 'Completed',
      createdAt: Date.now()
    });

    triggerToast('Stock Transferred in Cloud', `${transferQty} units of ${transferProduct} sent from ${fromBranch} to ${toBranch}`);
  };

  // Filtered Stock Items
  const filteredStock = useMemo(() => {
    return stockItems.filter(st => {
      const matchesBranch = selectedBranchFilter === 'ALL' || st.branchName === selectedBranchFilter;
      const matchesProduct = selectedProductFilter === 'ALL' || st.productName === selectedProductFilter;
      return matchesBranch && matchesProduct;
    });
  }, [stockItems, selectedBranchFilter, selectedProductFilter]);

  // Total Available Stock Metrics
  const totalMetrics = useMemo(() => {
    let totalStand = 0;
    let totalMagnet = 0;
    let totalFrame = 0;
    let lowStockCount = 0;

    stockItems.forEach(st => {
      if (st.productName === 'Stand') totalStand += st.currentStock;
      if (st.productName === 'Magnet') totalMagnet += st.currentStock;
      if (st.productName === 'Frame') totalFrame += st.currentStock;
      if (st.currentStock <= st.minThreshold) lowStockCount += 1;
    });

    return { totalStand, totalMagnet, totalFrame, lowStockCount };
  }, [stockItems]);

  return (
    <div className="space-y-6">
      
      {/* SECTION HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a1038] p-4 rounded-3xl border border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shadow-md">
            <div className="w-full h-full bg-[#0a1038] rounded-[14px] flex items-center justify-center text-cyan-300">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-black text-white">Stock & Inventory Management System</h2>
            <p className="text-xs text-slate-400">Track Stands (₹200), Magnets (₹250), Frames & Stock Transfers</p>
          </div>
        </div>

        {/* SUB TAB SELECTOR */}
        <div className="bg-[#101742] p-1 rounded-2xl border border-indigo-500/30 flex gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('inventory')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSubTab === 'inventory'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📦 Branch Stock
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('transfers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSubTab === 'transfers'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🚚 Stock Transfers ({transferLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('adjust')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSubTab === 'adjust'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚙️ Stock Adjustment
          </button>
        </div>
      </div>

      {/* OVERVIEW HERO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#0a1038] p-4 rounded-3xl border border-cyan-500/25 shadow-xl relative">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Total Stands Available</span>
          <div className="text-2xl font-black text-white font-mono mt-1">{totalMetrics.totalStand} Units</div>
          <p className="text-[11px] text-slate-400 mt-1">₹200 Product Line Stock</p>
        </div>

        <div className="bg-[#0a1038] p-4 rounded-3xl border border-purple-500/25 shadow-xl relative">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Total Magnets Available</span>
          <div className="text-2xl font-black text-purple-200 font-mono mt-1">{totalMetrics.totalMagnet} Units</div>
          <p className="text-[11px] text-slate-400 mt-1">₹250 Product Line Stock</p>
        </div>

        <div className="bg-[#0a1038] p-4 rounded-3xl border border-rose-500/25 shadow-xl relative">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Total Frames Available</span>
          <div className="text-2xl font-black text-rose-200 font-mono mt-1">{totalMetrics.totalFrame} Units</div>
          <p className="text-[11px] text-slate-400 mt-1">Custom Photo Frame Line</p>
        </div>

        <div className="bg-[#0a1038] p-4 rounded-3xl border border-amber-500/25 shadow-xl relative">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Low Stock Warnings</span>
          <div className="text-2xl font-black text-amber-300 font-mono mt-1">{totalMetrics.lowStockCount} Alerts</div>
          <p className="text-[11px] text-slate-400 mt-1">Branches near minimum threshold</p>
        </div>

      </div>

      {/* SUB TAB 1: BRANCH INVENTORY TABLE */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          
          <div className="bg-[#0a1038] p-4 rounded-3xl border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" />
              <span>Branch Stock Balance Ledger</span>
            </h3>

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
                  value={selectedProductFilter}
                  onChange={e => setSelectedProductFilter(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="ALL" className="bg-[#0b1238]">All Products</option>
                  <option value="Stand" className="bg-[#0b1238]">Stand (₹200)</option>
                  <option value="Magnet" className="bg-[#0b1238]">Magnet (₹250)</option>
                  <option value="Frame" className="bg-[#0b1238]">Frame</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#0a1038] rounded-3xl border border-indigo-500/20 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#101742] text-slate-400 uppercase text-[10px] font-extrabold border-b border-indigo-500/20">
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 text-right">Opening</th>
                    <th className="py-3 px-4 text-right">Received</th>
                    <th className="py-3 px-4 text-right">Sold</th>
                    <th className="py-3 px-4 text-right">Damaged</th>
                    <th className="py-3 px-4 text-right">Returned</th>
                    <th className="py-3 px-4 text-right">Current Available</th>
                    <th className="py-3 px-4 text-center">Stock Alert Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/10">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 italic">No stock records found for the selected filters.</td>
                    </tr>
                  ) : (
                    filteredStock.map(st => {
                      const isLow = st.currentStock <= st.minThreshold;
                      return (
                        <tr key={st.id} className="hover:bg-indigo-950/40 transition">
                          <td className="py-3 px-4 font-bold text-white">{st.branchName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-extrabold text-[11px]">
                              {st.productName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">{st.openingStock}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400">+{st.receivedStock}</td>
                          <td className="py-3 px-4 text-right font-mono text-purple-300">-{st.soldStock}</td>
                          <td className="py-3 px-4 text-right font-mono text-rose-400">-{st.damagedStock}</td>
                          <td className="py-3 px-4 text-right font-mono text-amber-300">+{st.returnedStock}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-sm text-cyan-300">
                            {st.currentStock} Units
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-400/30">
                                <AlertTriangle className="w-3 h-3 text-amber-400" /> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-400/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB TAB 2: STOCK TRANSFERS & LOGS */}
      {activeSubTab === 'transfers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* TRANSFER FORM */}
          <div className="bg-[#0a1038] p-5 rounded-3xl border border-indigo-500/20 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              <span>Execute Branch Stock Transfer</span>
            </h3>

            <form onSubmit={handleExecuteTransfer} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Transfer Date</label>
                <input
                  type="date"
                  required
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Product</label>
                <select
                  value={transferProduct}
                  onChange={e => setTransferProduct(e.target.value as any)}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="Stand" className="bg-[#0b1238]">Stand (₹200)</option>
                  <option value="Magnet" className="bg-[#0b1238]">Magnet (₹250)</option>
                  <option value="Frame" className="bg-[#0b1238]">Frame</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Quantity (Units)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQty}
                  onChange={e => setTransferQty(Number(e.target.value))}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-cyan-300"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">From Source Branch</label>
                <select
                  value={fromBranch}
                  onChange={e => setFromBranch(e.target.value)}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name} className="bg-[#0b1238]">{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">To Destination Branch</label>
                <select
                  value={toBranch}
                  onChange={e => setToBranch(e.target.value)}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name} className="bg-[#0b1238]">{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Receiver Name</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Remarks / Notes</label>
                <input
                  type="text"
                  value={transferRemarks}
                  onChange={e => setTransferRemarks(e.target.value)}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Confirm Stock Transfer</span>
              </button>
            </form>
          </div>

          {/* TRANSFER LOGS TABLE */}
          <div className="lg:col-span-2 bg-[#0a1038] p-5 rounded-3xl border border-indigo-500/20 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <span>Immutable Stock Transfer Logs History</span>
            </h3>

            <div className="border border-indigo-500/20 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#101742] text-slate-400 uppercase text-[10px] font-extrabold border-b border-indigo-500/20">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3">From Branch</th>
                      <th className="py-2.5 px-3">To Branch</th>
                      <th className="py-2.5 px-3">Sender / Receiver</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/10">
                    {transferLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic">No stock transfer history recorded yet.</td>
                      </tr>
                    ) : (
                      transferLogs.map(log => (
                        <tr key={log.id} className="hover:bg-indigo-950/40 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-300">{log.transferDate}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                              {log.productName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-cyan-300">
                            {log.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{log.fromBranch}</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{log.toBranch}</td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {log.senderName} ➔ {log.receiverName}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SUB TAB 3: STOCK ADJUSTMENT FORM */}
      {activeSubTab === 'adjust' && (
        <div className="bg-[#0a1038] p-5 rounded-3xl border border-indigo-500/20 shadow-xl max-w-2xl mx-auto space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>Manual Stock Adjustment & Baseline Setup</span>
          </h3>

          <form onSubmit={handleSaveStockAdjustment} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Target Branch</label>
                <select
                  value={adjBranch}
                  onChange={e => setAdjBranch(e.target.value)}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name} className="bg-[#0b1238]">{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Target Product</label>
                <select
                  value={adjProduct}
                  onChange={e => setAdjProduct(e.target.value as any)}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="Stand" className="bg-[#0b1238]">Stand (₹200)</option>
                  <option value="Magnet" className="bg-[#0b1238]">Magnet (₹250)</option>
                  <option value="Frame" className="bg-[#0b1238]">Frame</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Opening Stock</label>
                <input
                  type="number"
                  min="0"
                  value={adjOpening}
                  onChange={e => setAdjOpening(Number(e.target.value))}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Received Stock</label>
                <input
                  type="number"
                  min="0"
                  value={adjReceived}
                  onChange={e => setAdjReceived(Number(e.target.value))}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono text-emerald-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Sold Stock</label>
                <input
                  type="number"
                  min="0"
                  value={adjSold}
                  onChange={e => setAdjSold(Number(e.target.value))}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono text-purple-300"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Damaged Stock</label>
                <input
                  type="number"
                  min="0"
                  value={adjDamaged}
                  onChange={e => setAdjDamaged(Number(e.target.value))}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono text-rose-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Returned Stock</label>
                <input
                  type="number"
                  min="0"
                  value={adjReturned}
                  onChange={e => setAdjReturned(Number(e.target.value))}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono text-amber-300"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Low Stock Alert Min</label>
                <input
                  type="number"
                  min="1"
                  value={adjThreshold}
                  onChange={e => setAdjThreshold(Number(e.target.value))}
                  className="w-full bg-[#101742] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="bg-[#101742] p-3 rounded-xl border border-indigo-500/20 text-xs flex justify-between items-center">
              <span className="text-slate-400 font-bold">Calculated Available Current Stock:</span>
              <span className="font-mono font-black text-sm text-cyan-300">
                {Math.max(0, adjOpening + adjReceived - adjSold - adjDamaged + adjReturned)} Units
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              <span>Save Stock Baseline</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
