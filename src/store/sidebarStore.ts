
import { create } from 'zustand'

type SidebarMode = 'connect' | 'map'

interface SidebarStore {
  isOpen: boolean
  mode: SidebarMode
  open: (mode: SidebarMode) => void
  close: () => void
  setMode: (mode: SidebarMode) => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: false,
  mode: 'connect',
  open: (mode) => set({ isOpen: true, mode }),
  close: () => set({ isOpen: false }),
  setMode: (mode) => set({ mode }),
}))
