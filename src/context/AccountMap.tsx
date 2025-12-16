"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AccountMapContextType {
  mappedAccounts: Record<string, boolean | null>; 
  setMappedAccount: (evmAddress: string, mapped: boolean | null) => void;
}

const AccountMapContext = createContext<AccountMapContextType | undefined>(undefined);

export const AccountMapProvider = ({ children }: { children: ReactNode }) => {
  const [mappedAccounts, setMappedAccounts] = useState<Record<string, boolean | null>>({});

  const setMappedAccount = (evmAddress: string, mapped: boolean | null) => {
    setMappedAccounts((prev) => ({ ...prev, [evmAddress]: mapped }));
  };

  return (
    <AccountMapContext.Provider value={{ mappedAccounts, setMappedAccount }}>
      {children}
    </AccountMapContext.Provider>
  );
};

export const useAccountMap = () => {
  const context = useContext(AccountMapContext);
  if (!context) throw new Error("useAccountMap must be used within AccountMapProvider");
  return context;
};
