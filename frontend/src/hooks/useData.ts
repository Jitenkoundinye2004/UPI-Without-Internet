import { useState, useEffect, useCallback } from 'react';

export interface Device {
  deviceId: string;
  hasInternet: boolean;
  packetCount: number;
  packetIds: string[];
}

export interface Account {
  vpa: string;
  holderName: string;
  balance: number;
}

export interface Transaction {
  id: string;
  senderVpa: string;
  receiverVpa: string;
  amount: number;
  status: string;
  bridgeNodeId: string | null;
  hopCount: number;
  settledAt: string;
}

export interface MeshState {
  devices: Device[];
  idempotencyCacheSize: number;
}

export function useData() {
  const [meshState, setMeshState] = useState<MeshState | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => {
      const time = new Date().toLocaleTimeString();
      return [`[${time}] ${msg}`, ...prev].slice(0, 100);
    });
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [mRes, aRes, tRes] = await Promise.all([
        fetch('/api/mesh/state'),
        fetch('/api/accounts'),
        fetch('/api/transactions')
      ]);

      if (mRes.ok) setMeshState(await mRes.json());
      if (aRes.ok) setAccounts(await aRes.json());
      if (tRes.ok) setTransactions(await tRes.json());
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return { meshState, accounts, transactions, logs, addLog, refreshData };
}
