
export interface WalletInfo {
  id: string
  name: string
  displayName: string
  icon: string
  isInstalled: boolean
  isAvailable: boolean
  downloadUrl?: string
  description?: string
}

// Detect installed Polkadot wallet extensions
export const detectPolkadotWallets = (): WalletInfo[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const injectedWeb3 = (window as any).injectedWeb3 || {}
  
  const wallets: WalletInfo[] = [
    {
      id: 'polkadot-js',
      name: 'polkadot-js',
      displayName: 'Polkadot{.js}',
      icon: '/wallets/polkadotjs.svg',
      isInstalled: !!injectedWeb3['polkadot-js'],
      isAvailable: !!injectedWeb3['polkadot-js'],
      downloadUrl: 'https://polkadot.js.org/extension/',
      description: 'Official Polkadot browser extension'
    },
    {
      id: 'talisman',
      name: 'talisman',
      displayName: 'Talisman',
      icon: '/wallets/talisman.png',
      isInstalled: !!injectedWeb3['talisman'],
      isAvailable: !!injectedWeb3['talisman'],
      downloadUrl: 'https://talisman.xyz/',
      description: 'Multi-chain wallet for Ethereum and Polkadot'
    },
    {
      id: 'subwallet-js',
      name: 'subwallet-js',
      displayName: 'SubWallet',
      icon: '/wallets/subwallet.svg',
      isInstalled: !!injectedWeb3['subwallet-js'],
      isAvailable: !!injectedWeb3['subwallet-js'],
      downloadUrl: 'https://www.subwallet.app/',
      description: 'Comprehensive Web3 wallet for Polkadot & Ethereum'
    },
    {
      id: 'enkrypt',
      name: 'enkrypt',
      displayName: 'Enkrypt',
      icon: '/wallets/enkrypt.png',
      isInstalled: !!injectedWeb3['enkrypt'],
      isAvailable: !!injectedWeb3['enkrypt'],
      downloadUrl: 'https://www.enkrypt.com/',
      description: 'Multi-chain browser wallet'
    },
    {
      id: 'fearless-wallet',
      name: 'fearless-wallet',
      displayName: 'Fearless Wallet',
      icon: '/wallets/fearless.png',
      isInstalled: !!injectedWeb3['fearless-wallet'],
      isAvailable: !!injectedWeb3['fearless-wallet'],
      downloadUrl: 'https://fearlesswallet.io/',
      description: 'Mobile-first Polkadot wallet'
    }
  ]

  console.log('Detected Polkadot wallets:', {
    injectedWeb3: Object.keys(injectedWeb3),
    wallets: wallets.filter(w => w.isInstalled)
  })

  return wallets
}

// Helper function to get wallet download URLs
function getWalletDownloadUrl(extensionName: string): string {
  const urls: Record<string, string> = {
    'polkadot-js': 'https://polkadot.js.org/extension/',
    'talisman': 'https://talisman.xyz/',
    'subwallet-js': 'https://www.subwallet.app/',
    'enkrypt': 'https://www.enkrypt.com/',
    'fearless-wallet': 'https://fearlesswallet.io/'
  }
  return urls[extensionName] || '#'
}

// Helper function to get wallet descriptions
function getWalletDescription(extensionName: string): string {
  const descriptions: Record<string, string> = {
    'polkadot-js': 'Official Polkadot browser extension',
    'talisman': 'Multi-chain wallet for Ethereum and Polkadot',
    'subwallet-js': 'Comprehensive Web3 wallet for Polkadot & Ethereum',
    'enkrypt': 'Multi-chain browser wallet',
    'fearless-wallet': 'Mobile-first Polkadot wallet'
  }
  return descriptions[extensionName] || 'Polkadot wallet extension'
}

// Get all installed wallets
export const getInstalledWallets = (): WalletInfo[] => {
  return detectPolkadotWallets().filter(wallet => wallet.isInstalled)
}

// Get specific wallet by ID
export const getWalletById = (id: string): WalletInfo | undefined => {
  return detectPolkadotWallets().find(wallet => wallet.id === id)
}

// Check if any Polkadot wallet is installed
export const hasAnyPolkadotWallet = (): boolean => {
  return getInstalledWallets().length > 0
}

// Get wallet extension instance for connecting
export const getWalletExtension = (walletId: string) => {
  if (typeof window === 'undefined') return null
  
  const injectedWeb3 = (window as any).injectedWeb3 || {}
  return injectedWeb3[walletId] || null
}

// External wallets (non-browser extension)
export const externalWallets: WalletInfo[] = [
  {
    id: 'wallet-connect',
    name: 'walletconnect',
    displayName: 'Wallet Connect',
    icon: '/wallets/walletconnect.png',
    isInstalled: true, // Always available
    isAvailable: true,
    description: 'Connect with mobile wallets via QR code'
  }
]

// Get all available wallets (installed + external)
export const getAllAvailableWallets = (): { installed: WalletInfo[], external: WalletInfo[] } => {
  return {
    installed: getInstalledWallets(),
    external: externalWallets
  }
}
