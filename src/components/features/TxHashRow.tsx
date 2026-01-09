import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface TxHashRowProps {
  label: string;
  txHash: string;
}

export function TxHashRow({ label, txHash }: TxHashRowProps) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-blue-600">
          {txHash.slice(0, 6)}...{txHash.slice(-4)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => navigator.clipboard.writeText(txHash)}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
