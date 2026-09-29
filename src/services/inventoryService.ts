import { supabase } from '../lib/supabase';
import { ProductStockItem, StockTransferLog } from '../types';
import { logActivity } from './activityService';
import { createNotification } from './notificationService';

export function subscribeToInventory(callback: (items: ProductStockItem[]) => void) {
  const fetchStock = async () => {
    try {
      const { data, error } = await supabase.from('branch_stock').select('*');
      if (!error && data) {
        callback(data.map(d => ({
          id: d.id,
          branchName: d.branch_name,
          productName: d.product_name,
          openingStock: Number(d.opening_stock) || 0,
          receivedStock: Number(d.received_stock) || 0,
          soldStock: Number(d.sold_stock) || 0,
          damagedStock: Number(d.damaged_stock) || 0,
          returnedStock: Number(d.returned_stock) || 0,
          currentStock: Number(d.current_stock) || 0,
          minThreshold: Number(d.min_threshold) || 50
        })));
      }
    } catch (err) {
      console.warn('[inventoryService] Error fetching stock:', err);
    }
  };

  fetchStock();

  const channel = supabase
    .channel('public:inventory')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'branch_stock' }, () => {
      fetchStock();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToTransfers(callback: (transfers: StockTransferLog[]) => void) {
  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        callback(data.map(d => ({
          id: d.id,
          transferDate: d.created_at ? d.created_at.split('T')[0] : '',
          productName: d.product_name,
          quantity: Number(d.quantity) || 0,
          fromBranch: d.from_branch || 'Main Counter',
          toBranch: d.to_branch || 'Branch',
          senderName: d.sender_name || 'Admin',
          receiverName: d.receiver_name || 'Branch Manager',
          remarks: d.remarks || '',
          status: 'Completed',
          timestamp: d.created_at ? new Date(d.created_at).getTime() : Date.now()
        })));
      }
    } catch (err) {
      console.warn('[inventoryService] Error fetching transfers:', err);
    }
  };

  fetchTransfers();

  const channel = supabase
    .channel('public:stock_transactions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transactions' }, () => {
      fetchTransfers();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function transferStock(
  productName: 'Stand' | 'Magnet' | 'Frame',
  fromBranch: string,
  toBranch: string,
  quantity: number,
  senderName: string = 'Admin',
  receiverName: string = 'Store Receiver',
  remarks: string = 'Stock Transfer'
) {
  try {
    const txId = 'tx_' + Date.now();
    await supabase.from('stock_transactions').insert({
      id: txId,
      transaction_type: 'TRANSFER',
      product_name: productName,
      quantity,
      from_branch: fromBranch,
      to_branch: toBranch,
      sender_name: senderName,
      receiver_name: receiverName,
      remarks,
      created_at: new Date().toISOString()
    });

    // Deduct from source branch
    const { data: src } = await supabase
      .from('branch_stock')
      .select('*')
      .eq('branch_name', fromBranch)
      .eq('product_name', productName)
      .maybeSingle();

    if (src) {
      const nextStock = Math.max(0, (src.current_stock || 0) - quantity);
      await supabase
        .from('branch_stock')
        .update({ current_stock: nextStock, updated_at: new Date().toISOString() })
        .eq('id', src.id);

      if (nextStock <= (src.min_threshold || 50)) {
        createNotification(
          'Low Stock Warning',
          `${productName} at ${fromBranch} is low (${nextStock} left)`,
          'stock',
          'admin'
        );
      }
    }

    // Add to target branch
    const { data: dst } = await supabase
      .from('branch_stock')
      .select('*')
      .eq('branch_name', toBranch)
      .eq('product_name', productName)
      .maybeSingle();

    if (dst) {
      await supabase
        .from('branch_stock')
        .update({
          current_stock: (dst.current_stock || 0) + quantity,
          received_stock: (dst.received_stock || 0) + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', dst.id);
    } else {
      await supabase.from('branch_stock').insert({
        branch_name: toBranch,
        product_name: productName,
        opening_stock: 0,
        received_stock: quantity,
        current_stock: quantity,
        min_threshold: 50
      });
    }

    logActivity(
      'STOCK_TRANSFERRED',
      'Inventory',
      `Transferred ${quantity} units of ${productName} from ${fromBranch} to ${toBranch}`,
      senderName
    );

    createNotification(
      'Stock Transfer Completed',
      `${quantity} units of ${productName} sent to ${toBranch}`,
      'stock',
      'all'
    );
  } catch (err) {
    console.error('[inventoryService] Stock transfer error:', err);
    throw err;
  }
}
