import { create } from "zustand"

type NetworkType = "polkadot" | "ethereum" | null

interface WalletSidebarState {
  isOpen: boolean
  network: NetworkType
  openSidebar: () => void
  closeSidebar: () => void
  setNetwork: (network: NetworkType) => void
}

export const useWalletSidebar = create<WalletSidebarState>((set) => ({
  isOpen: false,
  network: null,
  openSidebar: () => set({ isOpen: true }),
  closeSidebar: () => set({ isOpen: false }),
  setNetwork: (network) => set({ network }),
}))