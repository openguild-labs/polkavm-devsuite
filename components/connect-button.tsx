"use client"

import { Button } from "@/components/ui/button"
import { Wallet, User } from "lucide-react"
import { AccountSelectDrawer } from "./account-select-drawer"
import { useOpenClose } from "@/hooks/use-open-close"
import { useWallet } from "@/hooks/use-wallet"
import type { InjectedPolkadotAccount } from "@/features/wallet-connect/pjs-signer/types"

export function ConnectButton() {
  const { open, close, isOpen } = useOpenClose()
  const { selectedAccount, isConnected, disconnect, setSelectedAccount } = useWallet()

  const handleAccountSelect = (account: InjectedPolkadotAccount) => {
    console.log('📤 ConnectButton: Account selected with signer:', {
      address: account.address,
      hasSigner: !!account.polkadotSigner,
      signerType: account.polkadotSigner ? typeof account.polkadotSigner : 'null'
    })
    setSelectedAccount(account)
    close()
  }

  const shortenAddress = (address: string, chars = 4) => {
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
  }

  return (
    <>
      {isConnected && selectedAccount ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={open}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{selectedAccount.name}</span>
            <span className="font-mono text-xs">
              {shortenAddress(selectedAccount.address)}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            className="text-muted-foreground hover:text-foreground"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          onClick={open}
          className="flex items-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </Button>
      )}

      <AccountSelectDrawer
        title="Connect Wallet"
        isOpen={isOpen}
        onDismiss={close}
        ownedOnly
        onAccountSelect={handleAccountSelect}
      />
    </>
  )
}
