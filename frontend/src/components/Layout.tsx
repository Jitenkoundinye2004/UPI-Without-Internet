import React from 'react';
import { Home, QrCode, History, User, Zap, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type TabType = 'home' | 'send' | 'scan' | 'history' | 'profile';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isOnline?: boolean;
  offlineQueueCount?: number;
}

export function Layout({ children, activeTab, onTabChange, isOnline = true, offlineQueueCount = 0 }: LayoutProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'send', label: 'Send Money', icon: Send },
    { id: 'scan', label: 'Scan & Pay', icon: QrCode },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground dark">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4">
        <div className="flex items-center gap-3 px-2 py-6 mb-4">
          <div className="bg-primary/20 p-2 rounded-xl text-primary">
            <Zap size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MeshPay</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-primary' : ''} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4 bg-secondary/50 rounded-xl border border-border">
          <p className="text-xs text-muted-foreground mb-1">Network Status</p>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
            {isOnline ? 'Online & Synced' : 'Offline Mode Active'}
          </div>
          {!isOnline && offlineQueueCount > 0 && (
            <div className="mt-2 text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md inline-block">
              {offlineQueueCount} Packet{offlineQueueCount > 1 ? 's' : ''} Queued
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-y-auto pb-20 md:pb-0">
        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
        <div className="p-4 md:p-8 max-w-5xl mx-auto h-full min-h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 pb-safe z-50">
        <div className="flex items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            if (item.id === 'scan') {
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id as TabType)}
                  className="relative -top-5 flex flex-col items-center justify-center gap-1"
                >
                  <div className={`p-4 rounded-full shadow-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-primary/90 text-primary-foreground'} transition-transform active:scale-95`}>
                    <Icon size={24} />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as TabType)}
                className={`flex flex-col items-center justify-center p-2 min-w-[64px] transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon size={20} className="mb-1" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
