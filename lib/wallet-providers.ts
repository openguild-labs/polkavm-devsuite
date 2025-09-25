import type { InjectedPolkadotAccount } from "@/features/wallet-connect/pjs-signer/types"

export interface WalletProvider {
  id: string
  name: string
  icon: string
  isAvailable: () => boolean
  connect: () => Promise<void>
  getAccounts: () => Promise<InjectedPolkadotAccount[]>
  disconnect: () => Promise<void>
}

// Check if Polkadot JS extension is available
export const isPolkadotJSAvailable = (): boolean => {
  if (typeof window === 'undefined') return false
  return !!(window as any).injectedWeb3?.['polkadot-js']
}

// Get accounts from Polkadot JS extension
export const getPolkadotJSAccounts = async (): Promise<InjectedPolkadotAccount[]> => {
  if (!isPolkadotJSAvailable()) return []
  
  try {
    const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp')
    
    // Enable the extension
    const extensions = await web3Enable('PolkaVM Bridge')
    if (extensions.length === 0) {
      throw new Error('No extension found')
    }

    // Get accounts
    const accounts = await web3Accounts()
    
    // Convert to InjectedPolkadotAccount format
    return accounts.map(account => ({
      address: account.address,
      name: account.meta.name || 'Unknown',
      polkadotSigner: null as any, // We'll need to implement this
      genesisHash: account.meta.genesisHash,
      type: account.type as any
    }))
  } catch (error) {
    console.error('Failed to get Polkadot JS accounts:', error)
    return []
  }
}

// Available wallet providers
export const walletProviders: WalletProvider[] = [
  {
    id: 'polkadot-js',
    name: 'Polkadot{.js}',
    icon: '🟡', // Could use actual icon
    isAvailable: isPolkadotJSAvailable,
    connect: async () => {
      await getPolkadotJSAccounts()
    },
    getAccounts: getPolkadotJSAccounts,
    disconnect: async () => {
      // Polkadot JS doesn't have explicit disconnect
    }
  },
  {
    id: 'wallet-connect',
    name: 'WalletConnect',
    icon: '🔗',
    isAvailable: () => true, // Always available
    connect: async () => {
      const { walletConnect } = await import('@/features/wallet-connect')
      await walletConnect.connect()
    },
    getAccounts: async () => {
      const { useWalletConnectAccounts } = await import('@/features/wallet-connect')
      // This is a hook, we'll need a different approach
      return []
    },
    disconnect: async () => {
      const { walletConnect } = await import('@/features/wallet-connect')
      await walletConnect.disconnect()
    }
  }
]
