/**
 * Runs the dev-tools planner against the real API and prints the answers the FAB
 * would set; `--quote` also polls quotes, to prove the answers quote.
 *
 *   bun scripts/dev-tools/walk.ts cyber --quote
 */
import { planAnswers } from "../../src/components/dev-tools/plan";

const base = process.env.SB_API ?? "http://localhost:3000";
const vertical = process.argv[2] ?? "cyber";
const plan = await planAnswers(vertical, base);

for (const { question: q, answer: a } of plan.steps)
	console.log(
		`${q.name} [${q.type}${q.options ? `/${q.options.length}` : ""}] "${q.prompt ?? ""}" = ${JSON.stringify(a.value)}`,
	);
console.log(`ready=${plan.ready} problems=${JSON.stringify(plan.problems)}`);

if (process.argv.includes("--quote") && plan.quotesHref) {
	const url = `${base}${plan.quotesHref}`;
	for (let i = 0; i < 60; i++) {
		const res = await fetch(url, { redirect: "follow", headers: { accept: "application/json" } });
		if (res.status === 202) {
			await new Promise((r) =>
				setTimeout(r, Number(res.headers.get("retry-after") ?? 1) * 1000),
			);
			continue;
		}
		const body = await res.json();
		if (!res.ok) {
			console.log(`quote failed ${res.status}`, JSON.stringify(body).slice(0, 500));
			break;
		}
		const quotes = body.quotes ?? body._embedded?.quotes ?? [];
		for (const x of quotes)
			console.log(`  ${x.insurer} ${x.decision} ${JSON.stringify(x.premium)}`);
		if (!quotes.length) console.log(JSON.stringify(body).slice(0, 800));
		break;
	}
}
