import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, ArrowRight, ShieldCheck, Trash2, MessageSquare } from 'lucide-react';

export default function P2PMarket({ currentUserId, onBalanceChange, onSelectChatUser }) {
  const [orders, setOrders] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [amountGmart, setAmountGmart] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('public:p2p_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'p2p_orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('p2p_orders')
      .select(`
        *,
        profiles:seller_id (id, username, gender_avatar)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
  };

  const handleCreateSellOrder = async () => {
    if (!amountGmart || !pricePerUnit || !paymentDetails.trim()) {
      alert('Please fill in all fields including payment instructions.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('create_p2p_sell_order', {
      p_seller_id: currentUserId,
      p_amount: parseFloat(amountGmart),
      p_price_per_unit: parseFloat(pricePerUnit),
      p_payment_details: paymentDetails.trim()
    });
    setLoading(false);

    if (error) {
      alert(error.message || 'Failed to create sell order.');
    } else {
      setAmountGmart('');
      setPricePerUnit('');
      setPaymentDetails('');
      setShowCreateModal(false);
      fetchOrders();
      if (onBalanceChange) onBalanceChange();
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Delete this listing? Escrowed GMART will be refunded.')) return;
    
    setLoading(true);
    const { error } = await supabase.rpc('cancel_p2p_order', {
      p_order_id: orderId,
      p_user_id: currentUserId
    });
    setLoading(false);

    if (error) {
      alert(error.message || 'Failed to cancel order.');
    } else {
      fetchOrders();
      if (onBalanceChange) onBalanceChange();
    }
  };

  const handleInitiateBuy = async (orderId) => {
    setLoading(true);
    const { error } = await supabase.rpc('initiate_p2p_buy', {
      p_order_id: orderId,
      p_buyer_id: currentUserId
    });
    setLoading(false);

    if (error) {
      alert(error.message || 'Failed to initiate buy order.');
    } else {
      fetchOrders();
    }
  };

  const handleReleaseEscrow = async (orderId) => {
    if (!window.confirm('Confirm that you have received payment and wish to release GMART from escrow?')) return;

    setLoading(true);
    const { error } = await supabase.rpc('release_p2p_escrow', {
      p_order_id: orderId,
      p_seller_id: currentUserId
    });
    setLoading(false);

    if (error) {
      alert(error.message || 'Failed to release escrow.');
    } else {
      alert('Escrow released successfully!');
      fetchOrders();
      if (onBalanceChange) onBalanceChange();
    }
  };

  return (
    <div className="p-3 space-y-4 overflow-y-auto pb-24 text-xs">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-100">P2P Market</h2>
        <button
          onClick={() => setShowCreateModal(!showCreateModal)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" /> Sell GMART
        </button>
      </div>

      {/* CREATE SELL ORDER MODAL */}
      {showCreateModal && (
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-3 shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-emerald-400">Create P2P Sell Order</h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Escrow Protected
            </span>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Amount (GMART)</label>
            <input
              type="number"
              value={amountGmart}
              onChange={(e) => setAmountGmart(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Price per GMART (₦)</label>
            <input
              type="number"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Payment Instructions Statement</label>
            <textarea
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder="Type account numbers, bank name, or instructions here..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500 h-24 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreateSellOrder}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold transition"
            >
              Post Listing & Lock Escrow
            </button>
            <button
              onClick={() => setShowCreateModal(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2.5 rounded-xl font-bold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ORDERS LIST */}
      <div className="space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => {
            const totalCost = (order.amount_gmart * order.price_per_unit).toLocaleString();
            const isSeller = order.seller_id === currentUserId;
            const isBuyer = order.buyer_id === currentUserId;

            return (
              <div key={order.id} className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">
                    @{order.profiles?.username || 'Vendor'}
                  </span>

                  {/* REPLACED OPEN BADGE WITH CLICKABLE CHAT VENDOR BUTTON */}
                  <button
                    onClick={() => {
                      if (onSelectChatUser) {
                        onSelectChatUser({
                          user_id: order.seller_id,
                          username: order.profiles?.username || 'Vendor',
                          gender_avatar: order.profiles?.gender_avatar || 'male'
                        });
                      }
                    }}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 hover:bg-emerald-500/20 transition"
                  >
                    <MessageSquare className="w-3 h-3" /> Chat Vendor
                  </button>
                </div>

                <div className="flex justify-between items-baseline border-y border-slate-700/50 py-2">
                  <div>
                    <p className="text-[10px] text-slate-400">Amount</p>
                    <p className="text-xs font-black text-amber-400">{order.amount_gmart} GMART</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Total Price</p>
                    <p className="text-xs font-black text-slate-100">₦{totalCost} <span className="text-[10px] font-normal text-slate-400">({order.price_per_unit}/unit)</span></p>
                  </div>
                </div>

                {/* BUY BUTTON (FOR OPEN ORDERS NOT CREATED BY YOU) */}
                {order.status === 'open' && !isSeller && (
                  <button
                    onClick={() => handleInitiateBuy(order.id)}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2.5 rounded-xl font-bold flex items-center justify-center gap-1 transition"
                  >
                    Buy GMART <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* DELETE LISTING BUTTON (FOR SELLER's OWN OPEN ORDERS) */}
                {order.status === 'open' && isSeller && (
                  <button
                    onClick={() => handleDeleteOrder(order.id)}
                    disabled={loading}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Listing & Refund
                  </button>
                )}

                {/* PENDING PAYMENT SECTION (REVEALS PAYMENT DETAILS) */}
                {order.status === 'pending_payment' && (isBuyer || isSeller) && (
                  <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-700 space-y-2 text-xs">
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Payment Instructions:</p>
                      <p className="text-xs text-amber-300 font-mono whitespace-pre-wrap">{order.payment_details}</p>
                    </div>

                    {isSeller && (
                      <button
                        onClick={() => handleReleaseEscrow(order.id)}
                        disabled={loading}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-xs py-2 rounded-xl transition"
                      >
                        Release Escrow GMART
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-500 text-xs">
            No active P2P orders available.
          </div>
        )}
      </div>
    </div>
  );
}
