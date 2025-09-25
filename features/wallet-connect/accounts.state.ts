// Simple utility functions
import type { SessionTypes } from "@walletconnect/types";
// Native JavaScript replacements for lodash
import type { SS58String } from "polkadot-api";
import type { InjectedPolkadotAccount } from "polkadot-api/pjs-signer";
import { distinctUntilChanged, map } from "rxjs";
import { getWcPolkadotSigner } from "./getWcPolkedotSigner";
import { wcSession$ } from "./session.store";

export const wcAccounts$ = wcSession$.pipe(
	distinctUntilChanged<SessionTypes.Struct | null>((a, b) => JSON.stringify(a) === JSON.stringify(b)),
	map((session) => {
		if (!session?.namespaces) {
			console.log("[Wallet Connect] no session", { session });
			return [];
		}
		const wcAccounts = Object.values(session.namespaces).flatMap(
			(namespace) => namespace.accounts,
		);

		// grab account addresses from CAIP account formatted accounts
		const addresses = wcAccounts.map((wcAccount) => {
			const address = wcAccount.split(":")[2] as string;
			return address; // Simplified - no normalization for now
		});

		return [...new Set(addresses)]; // Native JavaScript replacement for uniq
	}),
	distinctUntilChanged<SS58String[]>((a, b) => JSON.stringify(a) === JSON.stringify(b)),
	map((addresses) => {
		console.log("[Wallet Connect] accounts$ updated", { addresses });
		return addresses.map(
			(address) =>
				({
					name: `WalletConnect ${address.slice(0, 6)}...${address.slice(-4)}`,
					address,
					polkadotSigner: getWcPolkadotSigner(address),
				}) as InjectedPolkadotAccount,
		);
	}),
);
