import { create } from "zustand"

type NetworkType = "polkadot" | "ethereum" | null
type SidebarMode = "connect" | "map"
interface WalletSidebarState {
  isOpen: boolean
  network: NetworkType
  mode: SidebarMode
  openSidebar: (mode?: SidebarMode) => void
  closeSidebar: () => void
  setNetwork: (network: NetworkType) => void
}

export const useWalletSidebar = create<WalletSidebarState>((set) => ({
  isOpen: false,
  network: null,
  mode: "connect",
  openSidebar: (mode="connect") => set({ isOpen: true, mode }),
  closeSidebar: () => set({ isOpen: false }),
  setNetwork: (network) => set({ network }),
}))