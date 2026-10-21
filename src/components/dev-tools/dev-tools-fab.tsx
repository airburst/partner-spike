import { Check, Loader2, Wand2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DEV_TOOLS_ATTR, fillForm } from "./fill";
import { listVerticals, planAnswers } from "./plan";

/** Verticals with answers known to quote (see scripts/dev-tools/walk.ts). */
const TESTED = ["cyber", "usa"];

type Status =
	| { kind: "idle" }
	| { kind: "busy"; text: string }
	| { kind: "done"; text: string; missing: string[] }
	| { kind: "error"; text: string };

/** Fill the current quote form with answers that quote. Dev only; bottom left. */
export async function fillVertical(
	vertical: string,
	report: (s: Status) => void = () => {},
) {
	try {
		report({ kind: "busy", text: `Planning ${vertical} via API…` });
		const plan = await planAnswers(vertical);
		report({ kind: "busy", text: `Filling 0/${plan.steps.length}…` });
		const { set, missing } = await fillForm(plan.steps, (n, total) =>
			report({ kind: "busy", text: `Filling ${n}/${total}…` }),
		);
		const result: Status = {
			kind: "done",
			text: `Set ${set.length}/${plan.steps.length} answers`,
			missing: [...missing, ...plan.problems],
		};
		report(result);
		return result;
	} catch (e) {
		const result: Status = { kind: "error", text: String(e) };
		report(result);
		return result;
	}
}

export function DevToolsFab() {
	const [open, setOpen] = useState(false);
	const [verticals, setVerticals] = useState<{ id: string; name: string }[]>();
	const [status, setStatus] = useState<Status>({ kind: "idle" });

	useEffect(() => {
		// Handy for scripted checks: `await __devTools.fill("cyber")`.
		Object.assign(window, { __devTools: { fill: fillVertical } });
	}, []);

	useEffect(() => {
		if (!open || verticals) return;
		listVerticals()
			.then((all) =>
				setVerticals(
					[...all].sort(
						(a, b) =>
							Number(TESTED.includes(b.id)) - Number(TESTED.includes(a.id)),
					),
				),
			)
			.catch((e) => setStatus({ kind: "error", text: `Verticals: ${e}` }));
	}, [open, verticals]);

	const busy = status.kind === "busy";
	return (
		<div
			{...{ [DEV_TOOLS_ATTR]: "" }}
			className="fixed bottom-4 left-4 z-[99999] flex flex-col items-start gap-2 text-sm"
		>
			{open && (
				<div className="w-72 rounded-lg border bg-background p-2 shadow-xl">
					<p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Fill current form
					</p>
					{!verticals && status.kind !== "error" && (
						<p className="flex items-center gap-2 px-2 py-2 text-muted-foreground">
							<Loader2 className="size-4 animate-spin" /> Loading verticals…
						</p>
					)}
					<ul>
						{verticals?.map((v) => (
							<li key={v.id}>
								<button
									type="button"
									disabled={busy}
									onClick={() => void fillVertical(v.id, setStatus)}
									className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50"
								>
									<span>{v.name}</span>
									<span className="font-mono text-xs text-muted-foreground">
										{v.id}
										{TESTED.includes(v.id) ? "" : " (untested)"}
									</span>
								</button>
							</li>
						))}
					</ul>
					{status.kind !== "idle" && (
						<output className="mt-2 block border-t px-2 pt-2 text-xs">
							<p className="flex items-center gap-2">
								{busy && <Loader2 className="size-3 animate-spin" />}
								{status.kind === "done" && (
									<Check className="size-3 text-primary" />
								)}
								<span
									className={
										status.kind === "error" ? "text-destructive" : undefined
									}
								>
									{status.text}
								</span>
							</p>
							{status.kind === "done" && status.missing.length > 0 && (
								<p className="mt-1 text-muted-foreground">
									Not on screen: {status.missing.join(", ")}
								</p>
							)}
						</output>
					)}
				</div>
			)}
			<button
				type="button"
				aria-label={open ? "Close dev tools" : "Open dev tools"}
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
			>
				{busy ? (
					<Loader2 className="size-5 animate-spin" />
				) : open ? (
					<X className="size-5" />
				) : (
					<Wand2 className="size-5" />
				)}
			</button>
		</div>
	);
}
