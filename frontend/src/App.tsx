import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Wifi, WifiOff, RefreshCcw, Send, Trash2, Smartphone, ShieldCheck, Database, CreditCard, Eye, EyeOff } from 'lucide-react'
import { useData } from './hooks/useData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Select } from './components/ui/select'
import { Badge } from './components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table'

function App() {
  const { meshState, accounts, transactions, logs, addLog, refreshData } = useData()
  
  const [senderVpa, setSenderVpa] = useState('jiten@demo')
  const [receiverVpa, setReceiverVpa] = useState('janhavi@demo')
  const [amount, setAmount] = useState('500')
  const [pin, setPin] = useState('1234')
  const [isSending, setIsSending] = useState(false)
  const [isGossiping, setIsGossiping] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const handleSendPacket = async () => {
    setIsSending(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/demo/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderVpa, receiverVpa, amount: parseFloat(amount), pin, ttl: 5, startDevice: 'phone-jiten'
        })
      })
      const data = await res.json()
      addLog(`📤 Packet ${data.packetId.substring(0,8)} encrypted & injected (TTL ${data.ttl})`)
      await refreshData()
    } catch (e) {
      addLog('❌ Failed to inject packet')
    } finally {
      setIsSending(false)
    }
  }

  const handleGossip = async () => {
    setIsGossiping(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/mesh/gossip`, { method: 'POST' })
      const data = await res.json()
      addLog(`🔄 Gossip: ${data.transfers} transfer(s) — ${JSON.stringify(data.deviceCounts)}`)
      await refreshData()
    } catch (e) {
      addLog('❌ Gossip failed')
    } finally {
      setIsGossiping(false)
    }
  }

  const handleFlush = async () => {
    setIsFlushing(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/mesh/flush`, { method: 'POST' })
      const data = await res.json()
      addLog(`📡 ${data.uploadsAttempted} bridge upload(s):`)
      data.results.forEach((r: any) => {
        addLog(`   ${r.bridgeNode} packet ${r.packetId} → ${r.outcome}`)
      })
      await refreshData()
    } catch (e) {
      addLog('❌ Bridge flush failed')
    } finally {
      setIsFlushing(false)
    }
  }

  const handleReset = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/mesh/reset`, { method: 'POST' })
      addLog('🗑 Mesh + idempotency cache cleared')
      await refreshData()
    } catch (e) {
      addLog('❌ Reset failed')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/30 flex flex-col hidden lg:flex fixed inset-y-0">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="bg-primary/20 p-2 rounded-lg text-primary">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">Offline Mesh</h1>
            <p className="text-xs text-muted-foreground">Payment Protocol</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="px-3 py-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">Controls</div>
          
          <Card className="bg-card/50 border-border/50 mb-4 shadow-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="bg-primary/20 text-primary h-6 w-6 rounded-full flex items-center justify-center text-xs">1</span>
                Compose
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <Select 
                value={senderVpa} 
                onChange={(val) => {
                  setSenderVpa(val);
                  if (val === receiverVpa) {
                    const all = ["jiten@demo", "janhavi@demo", "suhani@demo", "apeksha@demo"];
                    setReceiverVpa(all.find(v => v !== val) || "");
                  }
                }}
                options={[
                  { value: "jiten@demo", label: "jiten@demo" },
                  { value: "janhavi@demo", label: "janhavi@demo" },
                  { value: "suhani@demo", label: "suhani@demo" },
                  { value: "apeksha@demo", label: "apeksha@demo" }
                ]}
              />
              <div className="text-center text-muted-foreground text-xs">to</div>
              <Select 
                value={receiverVpa} 
                onChange={setReceiverVpa}
                options={[
                  { value: "jiten@demo", label: "jiten@demo" },
                  { value: "janhavi@demo", label: "janhavi@demo" },
                  { value: "suhani@demo", label: "suhani@demo" },
                  { value: "apeksha@demo", label: "apeksha@demo" }
                ].filter(opt => opt.value !== senderVpa)}
              />
              <div className="flex gap-2">
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹ Amount" className="flex-1" />
                <div className="relative w-24">
                  <Input type={showPin ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN" className="w-full pr-8" maxLength={4} />
                  <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleSendPacket} disabled={isSending} className="w-full">
                {isSending ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Inject Packet
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 mb-4 shadow-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-500 h-6 w-6 rounded-full flex items-center justify-center text-xs">2</span>
                Gossip
              </CardTitle>
              <CardDescription className="text-xs">Packets hop device-to-device</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button variant="secondary" onClick={handleGossip} disabled={isGossiping} className="w-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                {isGossiping ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                Run Round
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 mb-4 shadow-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-500 h-6 w-6 rounded-full flex items-center justify-center text-xs">3</span>
                Bridge Upload
              </CardTitle>
              <CardDescription className="text-xs">Bridge node hits 4G</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button variant="outline" onClick={handleFlush} disabled={isFlushing} className="w-full border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10">
                {isFlushing ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}
                Flush Bridges
              </Button>
            </CardContent>
          </Card>

          <div className="px-4 py-2 mt-auto space-y-4">
            <Button variant="destructive" onClick={handleReset} className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20 border-0">
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Mesh
            </Button>
            <div className="text-center text-[10px] text-muted-foreground/50">
              &copy; 2026 Jiten Koundinye
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 overflow-hidden flex flex-col h-screen">
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-10">
          <div className="flex flex-col">
            <h2 className="font-medium text-lg flex items-center gap-2">
              Dashboard
              <Badge variant="secondary" className="font-normal text-[10px] bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Simulation Mode</Badge>
            </h2>
            <span className="text-[10px] text-muted-foreground">Web visualization of offline device-to-device routing</span>
          </div>
          <div className="flex gap-4">
             <Badge variant="outline" className="gap-2">
                <Database className="w-3 h-3 text-muted-foreground" />
                Cache: {meshState?.idempotencyCacheSize || 0}
             </Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Devices View */}
            <Card className="xl:col-span-2 overflow-hidden flex flex-col">
              <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Mesh Network
                </CardTitle>
                <CardDescription>Visualizing active devices and packets</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex-1 bg-gradient-to-br from-background to-muted/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {meshState?.devices.map(device => (
                      <motion.div
                        key={device.deviceId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`p-4 rounded-xl border ${device.hasInternet ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-border bg-card'}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            {device.deviceId}
                          </h4>
                          <Badge variant={device.hasInternet ? "success" : "secondary"} className="text-[10px] uppercase tracking-wider">
                            {device.hasInternet ? <><Wifi className="w-3 h-3 mr-1" /> Bridge</> : <><WifiOff className="w-3 h-3 mr-1" /> Offline</>}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Packets ({device.packetCount})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {device.packetIds.map(id => (
                            <motion.span 
                              key={id}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-mono border border-border"
                            >
                              {id.substring(0,6)}
                            </motion.span>
                          ))}
                          {device.packetIds.length === 0 && (
                            <span className="text-xs italic text-muted-foreground">Empty</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>

            {/* Accounts */}
            <Card className="flex flex-col">
               <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  Accounts
                </CardTitle>
                <CardDescription>Live balances in backend</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>VPA</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map(acc => (
                      <TableRow key={acc.vpa}>
                        <TableCell>
                          <div className="font-medium text-sm">{acc.holderName}</div>
                          <div className="text-xs text-muted-foreground">{acc.vpa}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-500">
                          ₹{parseFloat(acc.balance.toString()).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Ledger */}
            <Card className="xl:col-span-2">
               <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  Transaction Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bridge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {String(tx.id).substring(0,8)}...
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">{tx.senderVpa.split('@')[0]} → {tx.receiverVpa.split('@')[0]}</div>
                        </TableCell>
                        <TableCell className="font-mono">₹{tx.amount}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              tx.status === 'SETTLED' ? 'success' : 
                              tx.status === 'REJECTED' || tx.status === 'INVALID' ? 'destructive' : 
                              'warning'
                            }
                            className="text-[10px]"
                          >
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{tx.bridgeNodeId || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">
                          No transactions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Logs */}
            <Card className="flex flex-col h-[400px]">
               <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-purple-500" />
                  Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden bg-black/40">
                <div className="h-full overflow-y-auto p-4 space-y-2 font-mono text-xs">
                  <AnimatePresence initial={false}>
                    {logs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-muted-foreground break-all"
                      >
                        {log.startsWith('📤') || log.startsWith('🔄') || log.startsWith('📡') ? (
                          <span className="text-foreground">{log}</span>
                        ) : log.includes('❌') ? (
                          <span className="text-destructive">{log}</span>
                        ) : log.includes('✅') || log.includes('SETTLED') ? (
                          <span className="text-emerald-500">{log}</span>
                        ) : (
                          log
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
