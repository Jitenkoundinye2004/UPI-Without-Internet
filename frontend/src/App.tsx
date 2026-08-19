import { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import type { TabType } from './components/Layout';
import { AuthScreen } from './components/AuthScreen';
import { Scanner } from './components/Scanner';
import { SendMoney } from './components/SendMoney';
import { signTransaction } from './lib/crypto';
import { useData } from './hooks/useData';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Send, ArrowDownLeft, Activity, Wifi, WifiOff, Smartphone, QrCode, LogOut, Copy, Check, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [token, setToken] = useState<string | null>(localStorage.getItem('meshpay_token'));
  const [authUser, setAuthUser] = useState<any>(null);
  
  // Custom Toast State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  
  // Phase 4: Offline Queue State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    const saved = localStorage.getItem('meshpay_offline_queue');
    return saved ? JSON.parse(saved) : [];
  });

  const { accounts, transactions } = useData(token);

  useEffect(() => {
    // 1. Fetch user on mount
    const savedUser = localStorage.getItem('meshpay_user');
    if (savedUser) {
      setAuthUser(JSON.parse(savedUser));
    } else if (token) {
      // Fallback: If token exists but user data is missing, fetch from server
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.vpa) {
          setAuthUser(data);
          localStorage.setItem('meshpay_user', JSON.stringify(data));
        } else {
          // Invalid token or user deleted
          setToken(null);
          localStorage.removeItem('meshpay_token');
        }
      })
      .catch(console.error);
    }

    // 2. Setup Network Listeners for Auto-Sync
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. Auto-Sync trigger when internet returns
  useEffect(() => {
    if (isOnline && isSyncEnabled && offlineQueue.length > 0) {
      console.log("Internet restored! Syncing offline queue...");
      syncOfflineQueue();
    }
  }, [isOnline, isSyncEnabled]);

  const syncOfflineQueue = async () => {
    const currentQueue = [...offlineQueue];
    const failedQueue = [];

    for (const packet of currentQueue) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/transaction/offline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet)
        });
        if (!res.ok) {
          failedQueue.push(packet); // Keep if backend rejected due to server error
        }
      } catch (e) {
        failedQueue.push(packet); // Keep if network dropped again
      }
    }

    setOfflineQueue(failedQueue);
    localStorage.setItem('meshpay_offline_queue', JSON.stringify(failedQueue));
        if (failedQueue.length === 0) {
          showToast("✅ All offline transactions have been successfully synced to the bank!", "success");
        } else {
          showToast("⚠️ Some offline transactions failed to sync. Check history.", "error");
        };
  };

  const handleLogin = (newToken: string, user: any) => {
    localStorage.setItem('meshpay_token', newToken);
    localStorage.setItem('meshpay_user', JSON.stringify(user));
    setToken(newToken);
    setAuthUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('meshpay_token');
    localStorage.removeItem('meshpay_user');
    setToken(null);
    setAuthUser(null);
  };

  const [copied, setCopied] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('500');
  const [isAddingMoney, setIsAddingMoney] = useState(false);

  const handleCopy = () => {
    if (currentUser?.vpa) {
      navigator.clipboard.writeText(currentUser.vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confirmAddMoney = async () => {
    if (!currentUser || !addMoneyAmount) return;
    const amount = Number(addMoneyAmount);
    if (amount <= 0 || amount > 100000) {
      showToast("You can only add up to ₹1,00,000 at a time", "error");
      return;
    }
    
    setIsAddingMoney(true);
    try {
      const amount = Number(addMoneyAmount);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/account/add-money`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vpa: currentUser.vpa, amount })
      });
      if (res.ok) {
        const data = await res.json();
        // Update local authUser state
        const updatedUser = { ...currentUser, balance: data.balance };
        setAuthUser(updatedUser);
        localStorage.setItem('meshpay_user', JSON.stringify(updatedUser));
        setShowAddMoneyModal(false);
        // Optional: show a small toast, but the UI updating is usually enough
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to add money", "error");
    } finally {
      setIsAddingMoney(false);
    }
  };

  const handleAddMoney = () => {
    setAddMoneyAmount('500');
    setShowAddMoneyModal(true);
  };

  // The currently logged in user
  const currentUser = authUser;

  const displayBalance = useMemo(() => {
    try {
      if (!currentUser || currentUser.balance === undefined || currentUser.balance === null) return '0.00';
      const bal = Number(currentUser.balance);
      if (isNaN(bal)) return '0.00';
      return bal.toFixed(2);
    } catch (e) {
      return '0.00';
    }
  }, [currentUser]);

  if (!token) {
    return <AuthScreen onLoginSuccess={handleLogin} />;
  }

  const renderHome = () => (
      <div className="flex flex-col p-4 max-w-2xl mx-auto animate-in fade-in duration-300 w-full">
         {/* Top Navigation */}
         <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shadow-md">
                  {currentUser?.holderName?.charAt(0).toUpperCase()}
               </div>
               <div>
                  <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                     Hello, {currentUser?.holderName} <span className="animate-wave inline-block origin-bottom-right">👋</span>
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-sm text-muted-foreground">{currentUser?.vpa || 'Loading...'}</p>
                    <button onClick={handleCopy} className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 bg-secondary rounded-md">
                      {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12} />}
                    </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Hero Balance Card */}
         <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/20 mb-8 relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
            <CreditCard className="absolute -right-6 -bottom-6 w-48 h-48 text-white/10 rotate-[-15deg] pointer-events-none" />
            
            <p className="text-emerald-50 text-sm font-semibold tracking-wider uppercase mb-2">Offline Wallet Balance</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-8 font-mono break-words">
               ₹{displayBalance}
            </h1>
            <div className="flex flex-col sm:flex-row gap-3">
               <button onClick={handleAddMoney} className="flex-1 justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
                  <ArrowDownLeft size={18} className="shrink-0" /> Add Money
               </button>
               <button 
                  onClick={() => setActiveTab('send')}
                  className="flex-1 justify-center bg-white text-emerald-900 hover:bg-white/90 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg transition-colors"
               >
                  <Send size={18} className="shrink-0" /> {isOnline ? 'Send Online' : 'Send Offline'}
               </button>
            </div>
         </div>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 gap-6 pb-8">
           {/* Recent Transactions List */}
           <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-5">
                 <h3 className="font-semibold text-lg tracking-tight">Recent Transactions</h3>
                 <button onClick={() => setActiveTab('history')} className="text-primary text-sm font-medium hover:underline">View All</button>
              </div>
              <div className="space-y-3">
                 {transactions.slice(0, 4).map(tx => {
                    const isSender = tx.senderVpa === currentUser?.vpa;
                    return (
                       <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-secondary/50 rounded-xl transition-colors group cursor-default border border-transparent hover:border-border">
                          <div className="flex items-center gap-4 min-w-0">
                             <div className={`p-2.5 rounded-full shrink-0 ${isSender ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {isSender ? <Send size={18} className="transform -rotate-45" /> : <ArrowDownLeft size={18} />}
                             </div>
                             <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{isSender ? tx.receiverVpa : tx.senderVpa}</p>
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">{tx.status}</p>
                             </div>
                          </div>
                          <p className={`font-bold shrink-0 ml-3 ${isSender ? '' : 'text-emerald-500'}`}>
                             {isSender ? '-' : '+'}₹{tx.amount}
                          </p>
                       </div>
                    )
                 })}
                 {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No recent transactions</p>}
              </div>
           </div>

           {/* Mesh Network Nodes (Real MongoDB Users) */}
           <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex flex-col">
              <h3 className="font-semibold text-lg mb-5 tracking-tight">Active Mesh Nodes</h3>
              <div className="flex-1 space-y-3">
                 {accounts.filter(a => a.vpa !== currentUser?.vpa).slice(0, 4).map(account => (
                    <div key={account.vpa} className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-border/50">
                       <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-lg border border-border">
                            <Smartphone size={16} className="text-muted-foreground" />
                          </div>
                          <div>
                            <span className="text-sm font-medium block">{account.holderName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{account.vpa}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-500 flex items-center bg-emerald-500/10 px-2 py-1 rounded-md font-medium border border-emerald-500/20">
                            <Wifi size={12} className="mr-1.5"/> Node Active
                          </span>
                       </div>
                    </div>
                 ))}
                 {accounts.length <= 1 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No other nodes registered in database</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    );

  const handleOfflineSend = async (receiverVpa: string, amount: number, pin: string) => {
    try {
      const privateKeyBase64 = localStorage.getItem(`meshpay_private_key_${currentUser.vpa}`);
      
      if (!privateKeyBase64) {
        showToast("CRITICAL SECURITY ERROR: Private Key not found on this device. Cannot sign transaction offline.", "error");
        return;
      }

      // 1. The pure data payload
      const payload = {
        senderVpa: currentUser.vpa,
        receiverVpa,
        amount,
        timestamp: Date.now(),
        nonce: crypto.randomUUID() // Prevent replay attacks
      };

      // 2. Mathematically Sign the data offline!
      console.log("Signing offline payload...", payload);
      const signature = await signTransaction(privateKeyBase64, payload);

      const packet = {
        payload,
        signature,
        pin 
      };

      // PHASE 4: PWA Offline Queue Logic
      if (!isOnline) {
        // Save to offline queue
        const newQueue = [...offlineQueue, packet];
        setOfflineQueue(newQueue);
        localStorage.setItem('meshpay_offline_queue', JSON.stringify(newQueue));
        
        showToast("📴 OFFLINE MODE: Transaction cryptographically signed and saved. It will sync automatically when you reconnect to the internet.", "info");
        setActiveTab('home');
        return;
      }

      // If online, send immediately
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/transaction/offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet)
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${data.message}`, "success");
        
        // Update local UI state immediately to show the debited amount!
        if (currentUser) {
          const updatedUser = { ...currentUser, balance: currentUser.balance - amount };
          setAuthUser(updatedUser);
          localStorage.setItem('meshpay_user', JSON.stringify(updatedUser));
        }
        
        setActiveTab('home'); 
      } else {
        showToast(`❌ Failed: ${data.error}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("System Error: Could not process the transaction", "error");
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} isOnline={isOnline} offlineQueueCount={offlineQueue.length}>
       {activeTab === 'home' && renderHome()}
       {activeTab === 'send' && <SendMoney key="send" isOnline={isOnline} onSendOffline={handleOfflineSend} />}
       {activeTab === 'scan' && <Scanner key="scan" currentUser={currentUser} onSendOffline={handleOfflineSend} defaultMode="scan" />}
       {activeTab === 'history' && (
         <div className="h-full flex flex-col p-4 max-w-2xl mx-auto animate-in fade-in duration-300 w-full">
           <h2 className="text-2xl font-bold mb-6">Transaction Ledger</h2>
           
           {transactions.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
               <Activity size={48} className="mb-4 opacity-20" />
               <p>No transactions found on the mesh yet.</p>
             </div>
           ) : (
             <div className="space-y-4 overflow-y-auto pb-20">
               {transactions.map((tx: any) => {
                 const isSender = tx.senderVpa === currentUser?.vpa;
                 return (
                   <div key={tx._id || tx.id} className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
                     <div className="flex items-center gap-4 min-w-0">
                       <div className={`p-3 rounded-xl shrink-0 ${isSender ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                         {isSender ? <ArrowDownLeft className="rotate-180" size={24} /> : <ArrowDownLeft size={24} />}
                       </div>
                       <div className="min-w-0">
                         <p className="font-bold text-lg truncate">{isSender ? `To: ${tx.receiverVpa}` : `From: ${tx.senderVpa}`}</p>
                         <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{new Date(tx.createdAt || Date.now()).toLocaleString()}</p>
                       </div>
                     </div>
                     <div className="text-right shrink-0 ml-4 max-w-[100px] sm:max-w-none">
                       <p className={`font-black text-xl truncate ${isSender ? 'text-destructive' : 'text-primary'}`}>
                         {isSender ? '-' : '+'}₹{tx.amount.toFixed(2)}
                       </p>
                       <p className="text-xs text-muted-foreground font-mono mt-1">ID: {tx.packetId.substring(0, 8)}</p>
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       )}
       {activeTab === 'profile' && (
         <div className="h-full flex flex-col p-4 max-w-2xl mx-auto animate-in fade-in duration-300 w-full pb-24">
           <h2 className="text-2xl font-bold mb-6">Your Profile</h2>
           
           {/* Digital Card */}
           <div className="relative w-full h-48 bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-3xl p-6 text-white shadow-2xl overflow-hidden mb-8 transform hover:scale-[1.02] transition-transform">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
             <div className="flex justify-between items-start relative z-10">
               <div>
                 <p className="text-emerald-100/80 text-xs uppercase tracking-widest font-semibold mb-1">Total Balance</p>
                 <h2 className="text-4xl font-black tracking-tight truncate">₹{displayBalance}</h2>
               </div>
               <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                 <Activity size={24} className="text-white" />
               </div>
             </div>
             
             <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-10">
               <div>
                 <p className="font-bold text-lg">{currentUser?.holderName}</p>
                 <div className="flex items-center gap-2 mt-1">
                   <p className="text-emerald-100/80 font-mono text-sm tracking-wide">{currentUser?.vpa}</p>
                   <button onClick={handleCopy} className="text-emerald-100/60 hover:text-white transition-colors p-1 bg-black/10 rounded-md">
                     {copied ? <Check size={14} className="text-emerald-300"/> : <Copy size={14} />}
                   </button>
                 </div>
               </div>
             </div>
           </div>

           {/* Security Settings Menu */}
           <div className="space-y-4 mb-8">
             <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-2">Security & Settings</h3>
             
             <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
               
               <div className="flex items-center justify-between p-4 border-b border-border hover:bg-secondary/50 cursor-pointer transition-colors">
                 <div className="flex items-center gap-4">
                   <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500">
                     <QrCode size={20} />
                   </div>
                   <div>
                     <p className="font-bold">Offline Private Key</p>
                     <p className="text-xs text-muted-foreground mt-0.5">Stored securely in local vault</p>
                   </div>
                 </div>
                 <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Secured</span>
               </div>

               <div 
                 onClick={() => setIsSyncEnabled(!isSyncEnabled)}
                 className="flex items-center justify-between p-4 border-b border-border hover:bg-secondary/50 cursor-pointer transition-colors"
               >
                 <div className="flex items-center gap-4">
                   <div className={`${isSyncEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'} p-3 rounded-xl transition-colors`}>
                     <Wifi size={20} />
                   </div>
                   <div>
                     <p className="font-bold">Background Sync</p>
                     <p className="text-xs text-muted-foreground mt-0.5">Auto-upload when WiFi returns</p>
                   </div>
                 </div>
                 <div className={`w-12 h-7 rounded-full relative transition-colors ${isSyncEnabled ? 'bg-primary' : 'bg-muted'}`}>
                   <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${isSyncEnabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
                 </div>
               </div>

             </div>
           </div>

           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:shadow-sm rounded-2xl font-bold transition-all mt-auto"
           >
             <LogOut size={20} />
             Secure Logout
           </button>
         </div>
       )}

       {/* Add Money Modal */}
       {showAddMoneyModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-card border border-border w-full max-w-sm rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
             <button 
               onClick={() => setShowAddMoneyModal(false)}
               className="absolute top-4 right-4 p-2 bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
             >
               <X size={20} />
             </button>
             <div className="mb-6">
               <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                 <ArrowDownLeft size={24} />
               </div>
               <h3 className="text-2xl font-bold">Add Money</h3>
               <p className="text-muted-foreground text-sm">Deposit funds into your offline wallet instantly.</p>
             </div>
             
             <div className="relative mb-6">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₹</span>
               <input
                 type="number"
                 value={addMoneyAmount}
                 onChange={(e) => setAddMoneyAmount(e.target.value)}
                 className="w-full bg-secondary/50 border border-border rounded-2xl py-4 pl-10 pr-4 text-3xl font-black focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                 placeholder="0.00"
                 autoFocus
               />
             </div>
             
             <div className="flex gap-3 mb-6">
               {[500, 1000, 5000].map(amt => (
                 <button 
                   key={amt}
                   onClick={() => setAddMoneyAmount(amt.toString())}
                   className="flex-1 py-2 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-sm transition-colors border border-border"
                 >
                   +₹{amt}
                 </button>
               ))}
             </div>
             
             <button 
               onClick={confirmAddMoney}
               disabled={isAddingMoney || !addMoneyAmount}
               className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black text-lg hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {isAddingMoney ? <Activity className="animate-spin" size={20}/> : 'Deposit Funds'}
             </button>
           </div>
         </div>
       )}

       {/* Toast Notification System */}
       <AnimatePresence>
         {toast && (
           <motion.div
             initial={{ opacity: 0, y: -50, scale: 0.9 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: -20, scale: 0.9 }}
             className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-[90%] mx-auto"
           >
             <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-xl ${
               toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-500/50 text-white' :
               toast.type === 'error' ? 'bg-destructive/90 border-destructive/50 text-white' :
               'bg-primary/90 border-primary/50 text-white'
             }`}>
               <div className="mt-0.5">
                 {toast.type === 'success' ? <CheckCircle2 size={20} /> :
                  toast.type === 'error' ? <AlertCircle size={20} /> :
                  <Info size={20} />}
               </div>
               <p className="text-sm font-medium leading-tight">{toast.message}</p>
               <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100 transition-opacity">
                 <X size={16} />
               </button>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </Layout>
  );
}

export default App;
