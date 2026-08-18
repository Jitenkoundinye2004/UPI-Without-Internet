import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner as QrReader } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, ScanLine, ArrowLeft, Send } from 'lucide-react';

interface ScannerProps {
  currentUser: any;
  onSendOffline: (receiverVpa: string, amount: number, pin: string) => void;
  defaultMode?: 'scan' | 'receive';
}

export function Scanner({ currentUser, onSendOffline, defaultMode = 'receive' }: ScannerProps) {
  const [mode, setMode] = useState<'scan' | 'receive' | 'pay_form'>(defaultMode);
  const [scannedVpa, setScannedVpa] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const handleScan = (text: string) => {
    if (text) {
      setScannedVpa(text);
      setMode('pay_form');
      setIsCameraActive(false);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !pin) return;
    onSendOffline(scannedVpa, parseFloat(amount), pin);
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto relative animate-in fade-in duration-300">
      
      {/* Toggle Header */}
      {mode !== 'pay_form' && (
        <div className="flex bg-secondary p-1 rounded-xl mb-6 mx-4 mt-2">
          <button 
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${mode === 'scan' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => { setMode('scan'); setIsCameraActive(false); }}
          >
            <ScanLine size={16} /> Scan QR
          </button>
          <button 
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${mode === 'receive' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => { setMode('receive'); setIsCameraActive(false); }}
          >
            <QrCode size={16} /> My QR
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          
          {/* RECEIVE MODE (Show My QR) */}
          {mode === 'receive' && (
            <motion.div 
              key="receive"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center w-full"
            >
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.15)] mb-6">
                <QRCodeSVG 
                  value={currentUser.vpa} 
                  size={220} 
                  level="H"
                  fgColor="#000000"
                  bgColor="#ffffff"
                  imageSettings={{
                    src: "https://cdn-icons-png.flaticon.com/512/6001/6001366.png",
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>
              <h2 className="text-2xl font-bold">{currentUser.holderName}</h2>
              <p className="text-primary font-mono mt-1 text-lg">{currentUser.vpa}</p>
              <p className="text-muted-foreground text-sm text-center mt-6 max-w-xs">
                Other users can scan this QR code to instantly transfer funds to you offline.
              </p>
            </motion.div>
          )}

          {/* SCAN MODE (Camera) */}
          {mode === 'scan' && (
            <motion.div 
              key="scan"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full flex flex-col items-center"
            >
              <div className="w-full aspect-square max-w-[320px] rounded-3xl overflow-hidden border-4 border-secondary relative shadow-2xl flex items-center justify-center bg-black">
                {isCameraActive ? (
                  <>
                    <div className="absolute inset-0 z-10 pointer-events-none border-[40px] border-black/40">
                      <div className="w-full h-full border-2 border-primary border-dashed rounded-lg"></div>
                    </div>
                    <QrReader 
                      onScan={(result: any) => {
                        if (result && result.length > 0) {
                          handleScan(result[0].rawValue);
                        }
                      }} 
                      onError={(error: any) => console.log(error?.message)}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="bg-secondary p-4 rounded-full text-muted-foreground">
                      <ScanLine size={48} />
                    </div>
                    <p className="text-sm text-muted-foreground">Camera is currently off for your privacy.</p>
                    <button 
                      onClick={() => setIsCameraActive(true)}
                      className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                    >
                      Enable Camera
                    </button>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mt-8 text-center max-w-xs">
                Point your camera at a MeshPay QR code to capture their UPI ID securely.
              </p>
            </motion.div>
          )}

          {/* PAY FORM MODE (After successful scan) */}
          {mode === 'pay_form' && (
            <motion.div 
              key="pay"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full bg-card border border-border p-6 rounded-3xl shadow-xl"
            >
              <button 
                onClick={() => setMode('scan')}
                className="flex items-center gap-2 text-muted-foreground mb-6 hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} /> Cancel Scan
              </button>

              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Paying</p>
                <h2 className="text-3xl font-black text-primary font-mono mt-1">{scannedVpa}</h2>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase ml-1 font-bold">Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    autoFocus
                    placeholder="0.00"
                    className="w-full bg-background border border-border rounded-2xl py-4 px-4 mt-1 text-3xl font-black text-center focus:ring-2 focus:ring-primary outline-none"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase ml-1 font-bold">Offline PIN</label>
                  <input 
                    type="password" 
                    required
                    maxLength={4}
                    placeholder="••••"
                    className="w-full bg-background border border-border rounded-2xl py-4 px-4 mt-1 text-2xl tracking-[1em] text-center font-mono focus:ring-2 focus:ring-primary outline-none"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-bold rounded-2xl py-4 mt-4 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg"
                >
                  <Send size={20} />
                  Confirm Offline Transfer
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
