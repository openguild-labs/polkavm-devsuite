
'use client'

import { ConnectButton } from '@luno-kit/ui'
import { useAccount, useDisconnect } from '@luno-kit/react'

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function WalletConnect() {
  const { account } = useAccount()
  const { disconnect, isPending } = useDisconnect()

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg border border-border/50">
          <span className="text-sm font-medium">{formatAddress(account.address)}</span>
        </div>
        <button
          className="h-9 rounded-md px-3 border border-border/50 hover:bg-secondary/50 text-sm"
          onClick={() => disconnect()}
          disabled={isPending}
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <ConnectButton
      className="h-9 rounded-md px-3 bg-primary text-primary-foreground hover:bg-primary/90"
    />
  )
}
