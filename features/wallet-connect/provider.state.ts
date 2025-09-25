// Simple logger replacement
import UniversalProvider from "@walletconnect/universal-provider";
import {} from "@walletconnect/universal-provider";
import { Observable, firstValueFrom, shareReplay } from "rxjs";
import { WALLET_CONNECT_PROVIDER_OPTS } from "./constants";
import { wcSession$ } from "./session.store";

export const wcProvider$ = new Observable<UniversalProvider>((subscriber) => {
	const promProvider = UniversalProvider.init(WALLET_CONNECT_PROVIDER_OPTS);

	const onSessionUpdate = (props: unknown) => {
		console.log("[WalletConnect Provider] session_update", { props });
	};
	const onSessionDelete = (props: unknown) => {
		console.log("[WalletConnect Provider] session_delete", { props });
		wcSession$.next(null);
	};
	const onSessionPing = (props: unknown) => {
		console.log("[WalletConnect Provider] session_ping", { props });
	};
	const onSessionEvent = (props: unknown) => {
		console.log("[WalletConnect Provider] session_event", { props });
	};
	const onDisplayUri = (props: unknown) => {
		console.log("[WalletConnect Provider] display_uri", { props });
	};

	promProvider
		.then((provider) => {
			console.log("[Wallet Connect] init provider", { provider });
			provider.on("session_update", onSessionUpdate);
			provider.on("session_delete", onSessionDelete);
			provider.on("session_ping", onSessionPing);
			provider.on("session_event", onSessionEvent);
			provider.on("display_uri", onDisplayUri);
			subscriber.next(provider);
		})
		.catch((err) => {
			console.error("[Wallet Connect] Failed to init provider", { err });
			subscriber.error(err);
		});

	return () => {
		promProvider
			.then((provider) => {
				provider.off("session_update", onSessionUpdate);
				provider.off("session_delete", onSessionDelete);
				provider.off("session_ping", onSessionPing);
				provider.off("session_event", onSessionEvent);
				provider.off("display_uri", onDisplayUri);
				provider.disconnect();
			})
			.catch((err) => {
				console.error("[Wallet Connect] Failed to init provider (cleanup)", {
					err,
				});
			});
	};
}).pipe(shareReplay(1));

// auto reconnect
firstValueFrom(wcSession$).then((session) => {
	if (session) {
		firstValueFrom(wcProvider$)
			.then((provider) => {
				console.log("[Wallet Connect] init provider for auto reconnect", {
					provider,
				});
			})
			.catch((err) => {
				// failed to init provider
				console.log(
					"[Wallet Connect] failed to init provider for auto reconnect",
					{ err },
				);
			});
	}
});
