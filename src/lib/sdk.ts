import { type Client, createClient } from "@simplybusiness/sdk-core";

let client: Client | undefined;

/** Browser only (effects, handlers): calls go same-origin, through the dev proxy. */
export function getClient(): Client {
	client ??= createClient({ baseUrl: window.location.origin });
	return client;
}

/** One key per product, shared by the product tiles and the journey. */
export const storageKey = (vertical: string) => `sb-quote:${vertical}`;
