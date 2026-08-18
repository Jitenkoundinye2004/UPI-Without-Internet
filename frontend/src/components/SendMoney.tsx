import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, User, Zap } from 'lucide-react';

interface SendMoneyProps {
  currentUser: any;
  onSendOffline: (receiverVpa: string, amount: number, pin: string) => void;
}

export function SendMoney({ currentUser, onSendOffline }: SendMoneyProps) {
  const [step, setStep] = useState<'vpa' | 'amount'>('vpa');
  const [receiverVpa, setReceiverVpa] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');

  const handleVpaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (receiverVpa.trim()) {
      setStep('amount');
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !pin) return;
    onSendOffline(receiverVpa, parseFloat(amount), pin);
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-4 animate-in fade-in zoom-in-95 duration-300 pt-12">
      <AnimatePresence mode="wait">
        
        {/* STEP 1: Enter VPA */}
        {step === 'vpa' && (
          <motion.div 
            key="vpa-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full flex flex-col items-center"
          >
            <div className="bg-primary/20 p-4 rounded-full text-primary mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Zap size={48} />
            </div>
            <h2 className="text-3xl font-black mb-2 text-center">Send Money</h2>
            <p className="text-muted-foreground text-center mb-8">Enter the recipient's UPI ID to instantly transfer funds offline.</p>

            <div className="w-full bg-card border border-border p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={16} className="text-primary"/> Recipient UPI ID
              </h3>
              
              <form onSubmit={handleVpaSubmit} className="flex flex-col gap-5 relative z-10">
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="e.g. rahul@upi"
                  value={receiverVpa}
                  onChange={(e) => setReceiverVpa(e.target.value.toLowerCase())}
                  className="w-full bg-secondary/50 border border-border rounded-xl py-4 px-4 text-lg font-medium focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                />
                <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black text-lg hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2">
                  Continue <ArrowLeft className="rotate-180" size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Amount & PIN */}
        {step === 'amount' && (
          <motion.div 
            key="amount-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full bg-card border border-border p-6 rounded-3xl shadow-2xl"
          >
            <button 
              onClick={() => setStep('vpa')}
              className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors font-medium"
            >
              <ArrowLeft size={18} /> Change Recipient
            </button>

            <div className="text-center mb-10">
              <div className="inline-block bg-secondary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Sending To
              </div>
              <h2 className="text-3xl font-black text-primary font-mono">{receiverVpa}</h2>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div>
                <label className="text-xs text-muted-foreground uppercase ml-1 font-bold tracking-wider">Amount (₹)</label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">₹</span>
                  <input 
                    type="number" 
                    required
                    autoFocus
                    placeholder="0.00"
                    className="w-full bg-secondary/30 border border-border rounded-2xl py-5 pl-12 pr-4 text-4xl font-black focus:ring-2 focus:ring-primary outline-none transition-all"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase ml-1 font-bold tracking-wider">Offline PIN</label>
                <input 
                  type="password" 
                  required
                  maxLength={4}
                  placeholder="••••"
                  className="w-full bg-secondary/30 border border-border rounded-2xl py-4 px-4 mt-1 text-2xl tracking-[1.5em] text-center font-mono focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                />
                <p className="text-[10px] text-center text-muted-foreground mt-2">Required to cryptographically sign the transaction.</p>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-primary-foreground font-black text-lg rounded-2xl py-5 mt-4 flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)]"
              >
                <Send size={24} />
                Confirm Transfer
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
