import { type Answer, type ApiQuestion, answerFor, wireValue } from "./answers";

export interface Step {
	question: ApiQuestion;
	answer: Answer;
}

export interface Plan {
	vertical: string;
	steps: Step[];
	/** Required questions with no answer, or still rejected by the server. */
	problems: string[];
	ready: boolean;
	/** The throwaway questionnaire walked to build the plan. */
	self: string;
	quotesHref?: string;
}

interface Link {
	href: string;
}

const href = (l: Link | Link[] | undefined) =>
	(Array.isArray(l) ? l[0] : l)?.href;

interface Wire {
	questions?: ApiQuestion[];
	errors?: { fields: string[]; message?: string | null }[];
	_links?: Record<string, Link | Link[] | undefined>;
}

/** `GET /api/v0` create template: the verticals the API can quote. */
export async function listVerticals(
	base = "",
	fetchFn: typeof fetch = fetch,
): Promise<{ id: string; name: string }[]> {
	const res = await fetchFn(`${base}/api/v0`);
	const root = await res.json();
	const prop = root?._templates?.create?.properties?.find(
		(p: { name: string }) => p.name === "vertical",
	);
	return (prop?.options?.inline ?? []).map(
		(o: { value: string; prompt: string }) => ({
			id: o.value,
			name: o.prompt,
		}),
	);
}

/**
 * Walk a throwaway questionnaire on the real API with the dev-tools answers, so we
 * learn every required question (names, prompts, types, options) this answer set reveals.
 */
export async function planAnswers(
	vertical: string,
	base = "",
	fetchFn: typeof fetch = fetch,
): Promise<Plan> {
	const json = {
		"content-type": "application/json",
		accept: "application/json",
	};
	let res = await fetchFn(`${base}/api/v0/application`, {
		method: "POST",
		headers: json,
		body: JSON.stringify({ vertical }),
	});
	if (!res.ok) throw new Error(`start ${vertical}: ${res.status}`);
	let body = (await res.json()) as Wire;
	const self = href(body._links?.self);
	if (!self) throw new Error("no self link");

	// The server can re-ask a question when a later answer resets it: answer again, a few times.
	const steps = new Map<string, Step>();
	const tries = new Map<string, number>();
	const problems = new Set<string>();
	for (let round = 0; round < 30; round++) {
		const batch: { field: string; value: unknown }[] = [];
		for (const q of body.questions ?? []) {
			if (!q.required || q.type === "info_display") continue;
			const n = tries.get(q.name) ?? 0;
			if (n >= 3) continue;
			tries.set(q.name, n + 1);
			const answer = answerFor(vertical, q);
			if (!answer) {
				problems.add(q.name);
				continue;
			}
			steps.delete(q.name);
			steps.set(q.name, { question: q, answer });
			batch.push({ field: q.field, value: wireValue(answer) });
		}
		if (!batch.length) break;
		res = await fetchFn(`${base}${self}`, {
			method: "PATCH",
			headers: json,
			body: JSON.stringify({ answers: batch }),
		});
		if (!res.ok) throw new Error(`answer ${vertical}: ${res.status}`);
		body = (await res.json()) as Wire;
	}
	for (const e of body.errors ?? [])
		problems.add(`${e.fields.join(", ")}: ${e.message ?? "rejected"}`);
	const quotesHref = href(body._links?.quotes);
	return {
		vertical,
		steps: [...steps.values()],
		problems: [...problems],
		ready: !!quotesHref,
		self,
		quotesHref,
	};
}
