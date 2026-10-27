import type { Session, SessionState } from "@simplybusiness/sdk-core/session";
import {
	type Field,
	TRADE_MESSAGES,
	toTradeOption,
} from "@simplybusiness/sdk-core/view-model";
import { Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";

interface Props {
	session: Session;
	state: SessionState;
	field: Extract<Field, { kind: "search" }>;
	onCommit: () => void;
	/** A server-rejected trade reopens the search. */
	invalid: boolean;
	aria: Record<string, unknown>;
}

/** Trade question: the customer types, picks a result; we submit its `value`. */
export function TradeSearch({
	session,
	state,
	field,
	onCommit,
	invalid,
	aria,
}: Props) {
	const answer = state.values[field.name];
	const [editing, setEditing] = useState(answer == null);
	const [text, setText] = useState("");
	const [blocked, setBlocked] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);

	const slice = state.search[field.name];
	const options = (slice?.results ?? []).map((r) => toTradeOption(r));

	if (!editing && answer != null && !invalid)
		return (
			<div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
				<span className="font-medium">{String(answer)}</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => setEditing(true)}
				>
					Change
				</Button>
			</div>
		);

	return (
		<div className="grid gap-2">
			<div className="relative">
				<Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
				<Input
					id={field.name}
					name={field.name}
					type="search"
					autoComplete="off"
					placeholder="Start typing your trade, e.g. accountant"
					className="pl-9"
					value={text}
					onChange={(e) => {
						const next = e.target.value;
						setText(next);
						setBlocked(false);
						clearTimeout(timer.current);
						if (next.trim().length >= 2)
							timer.current = setTimeout(
								() => void session.searchTrade(field.name, next),
								250,
							);
					}}
					{...aria}
				/>
				{slice?.status === "loading" && (
					<Loader2 className="absolute top-2.5 right-3 size-4 animate-spin text-muted-foreground" />
				)}
			</div>
			{slice?.status === "error" && (
				<p className="text-sm text-destructive">
					Trade search failed. Try again.
				</p>
			)}
			{blocked && (
				<p className="text-sm text-destructive">{TRADE_MESSAGES.blocked}</p>
			)}
			{text.trim().length >= 2 && options.length > 0 && (
				<ul className="max-h-72 divide-y overflow-auto rounded-md border">
					{options.map((o) => (
						<li key={o.value}>
							<button
								type="button"
								className="w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-60"
								onClick={() => {
									if (o.blocked) return setBlocked(true);
									session.edit(field.name, o.value);
									void session.commit();
									onCommit();
									setEditing(false);
									setText("");
								}}
							>
								<span className="font-medium">{o.label}</span>
								{o.definition && (
									<span className="block text-xs text-muted-foreground">
										{o.definition}
									</span>
								)}
							</button>
						</li>
					))}
				</ul>
			)}
			{slice?.status === "done" &&
				text.trim().length >= 2 &&
				!options.length && (
					<p className="text-sm text-muted-foreground">No matching trades.</p>
				)}
			{answer != null && !invalid && (
				<Button
					type="button"
					variant="link"
					size="sm"
					className="justify-self-start px-0"
					onClick={() => setEditing(false)}
				>
					Keep {String(answer)}
				</Button>
			)}
		</div>
	);
}
