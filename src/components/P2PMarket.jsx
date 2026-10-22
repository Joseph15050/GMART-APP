import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PlusCircle, ShieldCheck, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

export default function P2PMarket({ currentUserId, onBalanceChange }) {
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('p2p_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('p2p_orders')
      .select('*, profiles:seller_id(username, gender_avatar)')
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
  };

  const handleCreateSellOffer = async (e) => {
    e.preventDefault();
    if (!amount || !price || !paymentDetails) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('create_p2p_sell_order', {
      p_seller_id: currentUserId,
      p_amount: parseFloat(amount),
      p_price: parseFloat(price),
      p_fiat: 'NGN',
      p_payment_info: paymentDetails,
    });

    setLoading(false);
    if (error) {
      alert(error.message || 'Failed to create offer.');
    } else {
      setShowModal(false);
      setAmount('');
      setPrice('');
      setPaymentDetails('');
      if (onBalanceChange) onBalanceChange();
      alert('GMART locked in Escrow and listing posted!');
    }
  };

  const handleInitiateBuy = async (order) => {
    if (order.seller_id === currentUserId) return alert('You cannot buy from your own offer.');

    const { error } = await supabase
      .from('p2p_orders')
      .update({ buyer_id: currentUserId, status: 'pending_payment' })
      .eq('id', order.id);

    if (!error) {
      alert(`Order initiated! Transfer ₦${(order.amount_gmart * order.price_per_unit).toLocaleString()} to the seller's account.`);
    }
  };

  const handleReleaseEscrow = async (orderId) => {
    if (!window.confirm('Confirm you received the full payment in your bank account?')) return;

    setLoading(true);
    const { error } = await supabase.rpc('release_p2p_escrow', {
      p_order_id: orderId,
      p_seller_id: currentUserId,
    });
    setLoading(false);

    if (!error) {
      alert('GMART released to buyer!');
      if (onBalanceChange) onBalanceChange();
    } else {
      alert('Error releasing escrow: ' + error.message);
    }
  };

  return (
    <div className="p-3 space-y-4 pb-24">
      {/* HEADER BAR */}
      <div className="flex justify-between items-center bg-slate-800 p-3 rounded-2xl border border-slate-700">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> P2P Escrow Market
          </h2>
          <p className="text-[10px] text-slate-400">Buy & Sell GMART securely with local currency</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Sell GMART
        </button>
      </div>

{/* ORDERS LIST */}
<div className="space-y-3">
  {orders.map((order) => {
    const totalCost = (order.amount_gmart * order.price_per_unit).toLocaleString();
    const isSeller = order.seller_id === currentUserId;
    const isBuyer = order.buyer_id === currentUserId;

    return (
      <div key={order.id} className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-200">
            @{order.profiles?.username || 'Vendor'}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            order.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            order.status === 'pending_payment' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-slate-700 text-slate-400'
          }`}>
            {order.status.replace('_', ' ').toUpperCase()}
          </span>
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

        {/* ACTION BUTTONS */}
        {order.status === 'open' && !isSeller && (
          <button
            onClick={() => handleInitiateBuy(order)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded-xl font-bold flex items-center justify-center gap-1"
          >
            Buy GMART <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {order.status === 'pending_payment' && (
          <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-700 space-y-2 text-xs">
            <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Payment Instructions / Bank Details:</p>
              <p className="text-xs text-amber-300 font-mono whitespace-pre-wrap">{order.payment_details}</p>
            </div>

            {/* CHAT VENDOR BUTTON */}
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
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2 rounded-xl font-bold"
            >
              💬 Chat with @{order.profiles?.username || 'Vendor'}
            </button>

            {isSeller && (
              <button
                onClick={() => handleReleaseEscrow(order.id)}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-xs py-2 rounded-xl mt-1"
              >
                Release Escrow GMART
              </button>
            )}
          </div>
        )}
      </div>
    );
  })}
</div>

      {/* CREATE OFFER MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Post GMART Sell Offer</h3>
            <form onSubmit={handleCreateSellOffer} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">GMART Amount to Lock</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Price per GMART (NGN)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Bank Payment Details</label>
                <textarea
                  required
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder="e.g., Bank Name: Kuda, Account Number: 1234567890, Name: John Doe"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none h-20 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold"
                >
                  Post Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
      }
                
