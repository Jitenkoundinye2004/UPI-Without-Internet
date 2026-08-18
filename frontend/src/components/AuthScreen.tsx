import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ArrowRight, Zap, CreditCard, Lock, User } from 'lucide-react';
import { generateKeyPair, exportPublicKey, exportPrivateKey } from '../lib/crypto';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', holderName: '', password: '', pin: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    let payload: any = { ...formData };
    
    // Auto-generate UPI ID if registering
    if (!isLogin) {
      const baseName = formData.holderName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const randomNum = Math.floor(100 + Math.random() * 900);
      payload.vpa = `${baseName}${randomNum}@upi`;
    }

    let privateKeyBase64 = '';

    try {
      // PHASE 2 MAGIC: If registering, generate the Math Keypair in the browser first!
      if (!isLogin) {
        const keyPair = await generateKeyPair();
        const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
        privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);
        
        // Add the public key to the payload so MongoDB can save it
        payload.publicKey = publicKeyBase64;
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      
      // If login, we only need email and password
      const loginPayload = { email: formData.email, password: formData.password };
      const finalPayload = isLogin ? loginPayload : payload;

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // If registration was successful, save the Private Key to local vault!
      if (!isLogin && privateKeyBase64) {
        localStorage.setItem(`meshpay_private_key_${data.vpa}`, privateKeyBase64);
      }

      onLoginSuccess(data.token, data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden dark text-foreground">
      
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/30 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex bg-primary/20 p-3 rounded-2xl text-primary mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            <Zap size={32} />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">MeshPay</h1>
          <p className="text-muted-foreground font-medium">The True P2P Offline Ledger</p>
        </div>

        <div className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 md:p-8 rounded-3xl shadow-2xl">
          
          {/* Toggle Login/Signup */}
          <div className="flex bg-secondary/50 p-1 rounded-xl mb-6">
            <button 
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              Login
            </button>
            <button 
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              Register
            </button>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 mb-6 text-center font-medium">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input 
                      type="text" 
                      required={!isLogin}
                      placeholder="Jiten Koundinye"
                      className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                      value={formData.holderName}
                      onChange={e => setFormData({...formData, holderName: e.target.value})}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-muted-foreground" />
                </div>
                <input 
                  type="email" 
                  required
                  placeholder="you@email.com"
                  className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Offline Transaction PIN</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input 
                      type="password" 
                      required={!isLogin}
                      maxLength={4}
                      placeholder="4-Digit PIN"
                      className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none tracking-[0.5em] font-mono text-lg"
                      value={formData.pin}
                      onChange={e => setFormData({...formData, pin: e.target.value})}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-1 mt-1">This PIN is used to sign offline transactions.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3.5 mt-4 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>
                  {isLogin ? 'Access Wallet' : 'Create Secure Wallet'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by Asymmetric Cryptography & P2P Mesh Routing
        </p>
      </motion.div>
    </div>
  );
}
