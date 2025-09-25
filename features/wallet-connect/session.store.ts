import type { SessionTypes } from "@walletconnect/types";
import { BehaviorSubject, debounceTime, tap } from "rxjs";

// Simple storage key generator
const getLocalStorageKey = (key: string): string => {
	return `polkavm-bridge:${key}`;
};

// Development mode check
const DEV_IGNORE_STORAGE = process.env.NODE_ENV === 'development' && 
	process.env.NEXT_PUBLIC_IGNORE_STORAGE === 'true';

const STORAGE_KEY = getLocalStorageKey("wallet-connect-session");

const load = (): SessionTypes.Struct | null => {
	if (DEV_IGNORE_STORAGE || typeof window === 'undefined') return null;

	try {
		const strSession = localStorage.getItem(STORAGE_KEY);
		return strSession ? JSON.parse(strSession) : null;
	} catch (err) {
		console.error("[Wallet Connect] Failed to load session", err);
		return null;
	}
};

const save = (session: SessionTypes.Struct | null) => {
	if (typeof window === 'undefined') return;
	
	try {
		if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
		else localStorage.removeItem(STORAGE_KEY);
	} catch (err) {
		console.error("[Wallet Connect] Failed to save session", err);
		localStorage.removeItem(STORAGE_KEY);
	}
};

export const wcSession$ = new BehaviorSubject<SessionTypes.Struct | null>(
	load(),
);

// save after updates
wcSession$
	.pipe(
		tap((session) => {
			console.log("[Wallet Connect] session updated", { session });
		}),
		debounceTime(500),
	)
	.subscribe(save);
