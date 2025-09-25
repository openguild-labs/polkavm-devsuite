import { WALLET_CONNECT_PROJECT_ID } from "@/lib/constants";
import { WalletConnectModal } from "@walletconnect/modal";
import { firstValueFrom } from "rxjs";
import {
	WALLET_CONNECT_CHAINS,
	WALLET_CONNECT_CONNECT_PARAMS,
} from "./constants";
import { wcProvider$ } from "./provider.state";
import { wcSession$ } from "./session.store";

const wcModal = new WalletConnectModal({
	projectId: WALLET_CONNECT_PROJECT_ID,
	chains: WALLET_CONNECT_CHAINS,
	desktopWallets: [],
	enableAuthMode: false,
	enableExplorer: false,
	explorerRecommendedWalletIds: [],
	explorerExcludedWalletIds: [],
});

export const connectWalletConnect = async () => {
	console.log("[Wallet Connect] connectWalletConnectClient()");

	const provider = await firstValueFrom(wcProvider$);

	if (!provider) {
		console.warn("[Wallet Connect] no provider to connect with", {
			provider,
		});
		return;
	}

	try {
		// biome-ignore lint/style/noVar: <explanation>
		// biome-ignore lint/correctness/noInnerDeclarations: <explanation>
		var { uri, approval } = await provider.client.connect(
			WALLET_CONNECT_CONNECT_PARAMS,
		);
		if (!uri) throw new Error("No URI");
	} catch (cause) {
		console.error("Failed to connect to wallet connect", { cause });
		// Simple error notification instead of notifyError
		alert("Failed to connect to WalletConnect");
		return;
	}

	try {
		await wcModal.openModal({ uri });

		const session = await Promise.race([
			approval(),
			new Promise<null>((resolve) => {
				const unsubscribe = wcModal.subscribeModal(
					({ open }: { open: boolean }) => {
						if (open) return;
						unsubscribe();
						resolve(null);
					},
				);
			}),
		]);

		if (session) wcSession$.next(session);

		console.log("[Wallet Connect] after approval", { session });

		wcModal.closeModal();
	} catch (err) {
		console.error("Failed to connect to wallet connect", { err });
	} finally {
		wcModal.closeModal();
	}
};
