/**
 * Working answers for the dev-tools FAB, keyed by question data from the SB API
 * (Questionnaire V0). No SDK import: each spike may wire the SDK differently.
 */

export interface ApiQuestion {
	name: string;
	field: string;
	prompt: string | null;
	type: string;
	required: boolean;
	options?: { value: string; label: string }[] | null;
	rules?: Record<string, unknown>[] | null;
	search?: unknown;
}

export type Value = string | number | string[];

export interface Answer {
	/** What a person would enter in the UI (typed text, option value, trade search text). */
	value: Value;
	/** What goes on the wire, when it differs from `value` (e.g. E.164 phone). */
	wire?: Value;
	/** For trade search: the result label to pick. */
	pick?: string;
}

const today = () => {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const STATE = "Texas";
const ZIP = "78701";
const CITY = "Austin";

/** By question name; checked before the defaults by type. Shared by every vertical. */
const BY_NAME: Record<string, Answer> = {
	"Primary trade": {
		value: "photography",
		wire: "Photography",
		pick: "Photography",
	},
	"Business owner": { value: "yes" },
	"Business owner offline": { value: "yes" },
	"US state": { value: STATE },
	"Customer subdivision": { value: STATE },
	"US zipcode": { value: ZIP },
	"Customer postcode": { value: ZIP },
	"Business city": { value: CITY },
	"Customer town": { value: CITY },
	"Customer first name": { value: "Dev" },
	"Customer last name": { value: "Tools" },
	"Business name": { value: "Dev Tools LLC" },
};

/** Per-vertical overrides, for answers that would otherwise decline or fail to quote. */
const BY_VERTICAL: Record<string, Record<string, Answer>> = {
	cyber: {},
	usa: {
		"Years trading": { value: "3" },
		"Annual revenue": { value: "100000" },
		"Texas county": { value: "Travis" },
		// Both "no" fails quoting (EmptyRequestedPrimaryProducts).
		"Include general liability": { value: "yes" },
	},
};

const NOT_ASKED = /^not asked$/i;

function range(q: ApiQuestion): { min?: number; max?: number } {
	const r = q.rules?.find((x) => x.kind === "range");
	return {
		min: r?.min as number | undefined,
		max: r?.max as number | undefined,
	};
}

function byType(q: ApiQuestion): Answer | undefined {
	const options = (q.options ?? []).filter((o) => !NOT_ASKED.test(o.value));
	switch (q.type) {
		case "date": {
			const earliest = q.rules?.find((x) => x.kind === "date_range")?.earliest;
			const t = today();
			return {
				value: typeof earliest === "string" && earliest > t ? earliest : t,
			};
		}
		case "email_address":
			return { value: "dev.tools@example.com" };
		case "telephone_number":
			return { value: "4155550123", wire: "+14155550123" };
		case "us_zip_code":
			return { value: ZIP };
		case "us_residential_address":
			return { value: "100 Congress Ave" };
		case "integer":
		case "number":
		case "decimal":
		case "currency":
		case "free_text_currency": {
			const { min, max } = range(q);
			let n = 50000;
			if (min !== undefined && n < min) n = min;
			if (max !== undefined && n > max) n = max;
			return { value: String(n) };
		}
		case "single_choice": {
			// Eligibility questions are mostly "have you ever…": "No" keeps quotes clean.
			const no = options.find((o) => /^no$/i.test(o.value));
			const first = no ?? options[0];
			return first ? { value: first.value } : undefined;
		}
		case "info_display":
			return undefined;
		default:
			if (q.type.startsWith("multi_choice")) {
				const [first] = options;
				return first ? { value: [first.value] } : undefined;
			}
			return { value: "Test" };
	}
}

export function answerFor(
	vertical: string,
	q: ApiQuestion,
): Answer | undefined {
	return BY_VERTICAL[vertical]?.[q.name] ?? BY_NAME[q.name] ?? byType(q);
}

export const wireValue = (a: Answer): Value => a.wire ?? a.value;
