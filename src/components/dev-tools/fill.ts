/**
 * Sets plan answers in whatever form the current spike renders. Spikes differ in ids
 * and controls, so each question is located by, in order:
 *   1. id / name / data-* equal to the question `name` or `field` (or a slug of them)
 *   2. a <label> / <legend> whose text starts with the question prompt
 * and set with native events, so React (or anything else) sees a real edit.
 */
import type { Step } from "./plan";

export const DEV_TOOLS_ATTR = "data-dev-tools";

export interface FillResult {
	set: string[];
	missing: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const norm = (s: string) =>
	s
		.replace(/<[^>]*>/g, " ")
		.replace(/\(optional\)|\*/gi, "")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim()
		.toLowerCase();

/** Some option labels arrive as `{label: "Home Only", image: "home-only"}`. */
const optionLabel = (label: string) =>
	/^\{\s*label:\s*"([^"]*)"/.exec(label)?.[1] ?? label;

const text = (el: Element) =>
	norm((el as HTMLElement).innerText ?? el.textContent ?? "");

function usable(el: Element | null | undefined): el is HTMLElement {
	if (!(el instanceof HTMLElement)) return false;
	if (el.closest(`[${DEV_TOOLS_ATTR}]`)) return false;
	if (el.closest('[aria-hidden="true"]') && el.tagName !== "BUTTON")
		return false;
	return el.getClientRects().length > 0;
}

const CONTROL =
	'input:not([type=hidden]), textarea, select, [role=combobox], [role=radiogroup], [role=radio], [role=checkbox], [role=switch], [role=listbox], [contenteditable="true"]';

function idCandidates(q: Step["question"]): string[] {
	const out = new Set<string>();
	for (const s of [q.name, q.field]) {
		out.add(s);
		const words = s.match(/[A-Za-z0-9]+/g) ?? [];
		out.add(words.join("-").toLowerCase());
		out.add(words.join("_").toLowerCase());
		out.add(
			words
				.map((w, i) =>
					i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase(),
				)
				.join(""),
		);
	}
	return [...out].filter(Boolean);
}

function byId(q: Step["question"]): HTMLElement | undefined {
	for (const id of idCandidates(q)) {
		const v = CSS.escape(id);
		const hit = [
			document.getElementById(id),
			...document.querySelectorAll(
				`[name="${v}"], [data-name="${v}"], [data-question="${v}"], [data-field="${v}"]`,
			),
		].find(usable);
		if (hit) return hit;
	}
	return undefined;
}

/** First control after `label`, inside the nearest ancestor that holds one. */
function controlNear(label: HTMLElement): HTMLElement | undefined {
	const forId = (label as HTMLLabelElement).htmlFor;
	if (forId) {
		const t = document.getElementById(forId);
		// Pointing at something not rendered (e.g. an answered search): don't wander off.
		return usable(t) ? t : undefined;
	}
	const inner = [...label.querySelectorAll<HTMLElement>(CONTROL)].find(usable);
	if (inner) return inner;
	const after = (a: Node, b: Node) =>
		!!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
	let box: HTMLElement | null = label.parentElement;
	for (let i = 0; box && i < 4; i++, box = box.parentElement) {
		const c = [...box.querySelectorAll<HTMLElement>(CONTROL)].find(
			(x) => usable(x) && after(label, x),
		);
		if (!c) continue;
		// Another question's label in between: this control isn't ours.
		const between = [
			...box.querySelectorAll<HTMLElement>("label, legend"),
		].some(
			(l) =>
				l !== label &&
				after(label, l) &&
				after(l, c) &&
				!l.contains(c) &&
				!c.contains(l) &&
				(l as HTMLLabelElement).htmlFor !== c.id,
		);
		return between ? undefined : c;
	}
	return undefined;
}

function byLabel(q: Step["question"], nth: number): HTMLElement | undefined {
	if (!q.prompt) return undefined;
	const want = norm(q.prompt);
	if (!want) return undefined;
	const labels = [
		...document.querySelectorAll<HTMLElement>(
			"label, legend, [id$=label], [id$=-label]",
		),
	].filter((l) => usable(l) && text(l).startsWith(want));
	const label = labels[nth] ?? labels[0];
	if (!label) return undefined;
	if (label.tagName === "LEGEND") {
		const set = label.closest("fieldset");
		const c =
			set && [...set.querySelectorAll<HTMLElement>(CONTROL)].find(usable);
		if (c) return c;
	}
	return controlNear(label);
}

/** Widen a hit (e.g. one radio) to the thing that holds every option. */
function group(el: HTMLElement): HTMLElement {
	return (
		el.closest<HTMLElement>("[role=radiogroup], fieldset, [role=group]") ??
		el.parentElement?.parentElement ??
		el
	);
}

// --- events -----------------------------------------------------------------

/** A tap: works for native buttons and for Radix (which opens/selects on touch click). */
function press(el: HTMLElement) {
	const opts = {
		bubbles: true,
		cancelable: true,
		button: 0,
		pointerType: "touch",
	};
	el.dispatchEvent(new PointerEvent("pointerdown", opts));
	el.dispatchEvent(new MouseEvent("mousedown", opts));
	el.dispatchEvent(new PointerEvent("pointerup", opts));
	el.dispatchEvent(new MouseEvent("mouseup", opts));
	el.click();
}

function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
	el.focus();
	const proto =
		el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
	Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set?.call(
		el,
		value,
	);
	el.dispatchEvent(new Event("input", { bubbles: true }));
	el.dispatchEvent(new Event("change", { bubbles: true }));
}

const blur = (el: HTMLElement) => {
	el.blur();
	el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
};

async function waitFor<T>(
	fn: () => T | undefined,
	ms = 4000,
): Promise<T | undefined> {
	const end = Date.now() + ms;
	for (;;) {
		const v = fn();
		if (v || Date.now() > end) return v;
		await sleep(100);
	}
}

/** Resolve once the DOM has been quiet for `quiet` ms (answers sync, questions appear). */
function settle(quiet = 700, max = 5000): Promise<void> {
	return new Promise((resolve) => {
		let t = setTimeout(done, quiet);
		const cap = setTimeout(done, max);
		const mo = new MutationObserver(() => {
			clearTimeout(t);
			t = setTimeout(done, quiet);
		});
		mo.observe(document.body, {
			subtree: true,
			childList: true,
			attributes: true,
			characterData: true,
		});
		function done() {
			mo.disconnect();
			clearTimeout(t);
			clearTimeout(cap);
			resolve();
		}
	});
}

// --- setters ------------------------------------------------------------------

const isChecked = (el: HTMLElement) =>
	el instanceof HTMLInputElement
		? el.checked
		: el.getAttribute("aria-checked") === "true" ||
			el.dataset.state === "checked";

function labelOf(el: HTMLElement): string {
	const id =
		el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
	const l = id || el.closest("label") || el.parentElement;
	return l ? text(l) : "";
}

function findOption(
	box: HTMLElement,
	sel: string,
	value: string,
	label: string,
) {
	const opts = [...box.querySelectorAll<HTMLElement>(sel)].filter(usable);
	return (
		opts.find(
			(o) => o.getAttribute("value") === value || o.dataset.value === value,
		) ??
		opts.find((o) => labelOf(o) === norm(label)) ??
		opts.find((o) => text(o) === norm(label))
	);
}

async function pickFromPopup(value: string, label: string): Promise<boolean> {
	const opt = await waitFor(() =>
		[...document.querySelectorAll<HTMLElement>("[role=option]")]
			.filter(usable)
			.find((o) => o.dataset.value === value || text(o) === norm(label)),
	);
	if (!opt) {
		document.activeElement?.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		return false;
	}
	opt.scrollIntoView({ block: "nearest" });
	press(opt);
	return true;
}

/** Already showing the answer? Then leave it alone. */
function shows(el: HTMLElement, step: Step): boolean {
	const { question: q, answer } = step;
	const want = Array.isArray(answer.value)
		? answer.value
		: [String(answer.value)];
	if (q.search) return false;
	if (el instanceof HTMLSelectElement) return el.value === want[0];
	if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
		if (el.type === "radio" || el.type === "checkbox") return false;
		const digits = (s: string) => s.replace(/\D/g, "");
		return (
			norm(el.value) === norm(want[0]) ||
			(q.type === "telephone_number" &&
				digits(el.value).endsWith(digits(want[0])))
		);
	}
	if (el.getAttribute("role") === "combobox") {
		const o = q.options?.find((x) => x.value === want[0]);
		return !!o && text(el) === norm(optionLabel(o.label));
	}
	if (!q.options?.length) return false;
	const box = group(el);
	return want.every((v) => {
		const o = findOption(
			box,
			"input[type=radio], [role=radio], input[type=checkbox], [role=checkbox], [role=switch]",
			v,
			labelFor(q, v),
		);
		return !!o && isChecked(o);
	});
}

async function setStep(el: HTMLElement, step: Step): Promise<boolean> {
	const { question: q, answer } = step;
	const values = Array.isArray(answer.value)
		? answer.value
		: [String(answer.value)];
	const [value] = values;

	// Trade search: type, then pick the result.
	if (q.search) {
		const input = el.matches("input, textarea")
			? (el as HTMLInputElement)
			: el.querySelector<HTMLInputElement>("input, textarea");
		if (!input) return false;
		typeInto(input, value);
		const want = norm(answer.pick ?? value);
		// Most specific first: the option or button, not the <li> wrapping it.
		const hit = await waitFor(() => {
			for (const sel of ["[role=option]", "button, [role=button]", "li"]) {
				const o = [...document.querySelectorAll<HTMLElement>(sel)]
					.filter(usable)
					.find(
						(x) => text(x).split(" ").length < 12 && text(x).startsWith(want),
					);
				if (o) return o;
			}
			return undefined;
		});
		if (!hit) return false;
		press(hit);
		return true;
	}

	if (el instanceof HTMLSelectElement) {
		const o =
			[...el.options].find((x) => x.value === value) ??
			[...el.options].find((x) => norm(x.text) === norm(labelFor(q, value)));
		if (!o) return false;
		el.value = o.value;
		el.dispatchEvent(new Event("change", { bubbles: true }));
		blur(el);
		return true;
	}

	const isText =
		(el instanceof HTMLInputElement &&
			!["radio", "checkbox", "button"].includes(el.type)) ||
		el instanceof HTMLTextAreaElement;
	if (isText && !q.options?.length) {
		typeInto(el as HTMLInputElement, value);
		blur(el);
		return true;
	}

	// Popup select (Radix / ARIA combobox).
	const trigger =
		el.getAttribute("role") === "combobox" ||
		el.getAttribute("aria-haspopup") === "listbox"
			? el
			: el.querySelector<HTMLElement>(
					"[role=combobox], [aria-haspopup=listbox]",
				);
	if (trigger && usable(trigger) && !values.slice(1).length) {
		press(trigger);
		return pickFromPopup(value, labelFor(q, value));
	}

	// Radios, checkboxes, option buttons.
	const box = group(el);
	let any = false;
	for (const v of values) {
		const label = labelFor(q, v);
		const multi = q.type.startsWith("multi_choice");
		const sel = multi
			? "input[type=checkbox], [role=checkbox], [role=switch]"
			: "input[type=radio], [role=radio]";
		let target = findOption(box, sel, v, label);
		// A lone checkbox (consent/confirmation) carries the question label, not the option.
		if (!target && multi && q.options?.length === 1) {
			target = el.matches(sel)
				? el
				: [...box.querySelectorAll<HTMLElement>(sel)].find(usable);
		}
		target ??= findOption(box, "button, [role=button]", v, label);
		if (!target) continue;
		if (!(target.matches(sel) && isChecked(target))) press(target);
		any = true;
	}
	return any;
}

function labelFor(q: Step["question"], value: string): string {
	const o = q.options?.find((x) => x.value === value);
	return o ? optionLabel(o.label) : value;
}

/**
 * Fill every plan step currently on screen. Repeats while the form changes, since
 * answers reveal (or re-ask) questions; stops when a pass changes nothing.
 */
export async function fillForm(
	steps: Step[],
	onProgress?: (done: number, total: number) => void,
): Promise<FillResult> {
	const set = new Set<string>();
	const tries = new Map<string, number>();
	const end = Date.now() + 90_000;
	for (let pass = 0; pass < 30 && Date.now() < end; pass++) {
		let acted = false;
		const promptSeen = new Map<string, number>();
		for (const step of steps) {
			const q = step.question;
			const key = q.prompt ? norm(q.prompt) : "";
			const nth = promptSeen.get(key) ?? 0;
			promptSeen.set(key, nth + 1);
			const el = byId(q) ?? byLabel(q, nth);
			if (!el) continue;
			if (shows(el, step)) {
				set.add(q.name);
				continue;
			}
			const n = tries.get(q.name) ?? 0;
			if (n >= 3) continue;
			tries.set(q.name, n + 1);
			el.scrollIntoView({ block: "center" });
			if (await setStep(el, step)) {
				set.add(q.name);
				acted = true;
				onProgress?.(set.size, steps.length);
				await sleep(q.search || q.options?.length ? 250 : 30);
			}
		}
		await settle();
		if (!acted && pass > 0) break;
	}
	return {
		set: [...set],
		missing: steps.map((s) => s.question.name).filter((n) => !set.has(n)),
	};
}
