import {
	createSession,
	type Session,
	sessionStorageAdapter,
} from "@simplybusiness/sdk-core/session";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getClient, storageKey } from "#/lib/sdk";

/** Holds the live session outside React, so the effect never calls setState. */
function createSlot() {
	let current: Session | undefined;
	const listeners = new Set<() => void>();
	return {
		get: () => current,
		set(next: Session | undefined) {
			current = next;
			for (const listener of listeners) listener();
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;

export function useQuoteSession(vertical: string) {
	const [slot] = useState(createSlot);

	useEffect(() => {
		const session = createSession({
			client: getClient(),
			vertical,
			storage: sessionStorageAdapter(),
			storageKey: storageKey(vertical),
		});
		slot.set(session);
		void session.start(); // resumes a stored journey, or creates a new one
		return () => {
			slot.set(undefined);
			session.dispose();
		};
	}, [slot, vertical]);

	const session = useSyncExternalStore(slot.subscribe, slot.get, noSnapshot);
	const state = useSyncExternalStore(
		session?.subscribe ?? noSubscribe,
		session?.getSnapshot ?? noSnapshot,
		noSnapshot,
	);
	return { session, state };
}
