import type { Session, SessionState } from "@simplybusiness/sdk-core/session";
import {
	fieldState,
	type Screen,
	toField,
	toScreen,
} from "@simplybusiness/sdk-core/view-model";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { FieldControl } from "./field-control";
import { Quotes } from "./quotes";
import { useQuoteSession } from "./use-quote-session";

type SectionScreen = Extract<Screen, { kind: "section" }>;
type AgreementsScreen = Extract<Screen, { kind: "agreements" }>;

/** The whole quote journey for one product: questions, quotes, agreements, handoff. */
export function Journey({ vertical }: { vertical: string }) {
	const { session, state } = useQuoteSession(vertical);
	const [sectionId, setSectionId] = useState<string>();
	const screen = useMemo(
		() => (state ? toScreen(state, { sectionId }) : undefined),
		[state, sectionId],
	);

	// Pin the section, or answering its last question jumps ahead.
	useEffect(() => {
		if (screen?.kind === "section" && screen.section.id !== sectionId)
			setSectionId(screen.section.id);
	}, [screen, sectionId]);

	useEffect(() => {
		if (screen?.kind === "handoff") window.location.assign(screen.url); // the customer buys there
	}, [screen]);

	if (!session || !state || !screen) return <Waiting text="Loading…" />;
	switch (screen.kind) {
		case "loading":
			return <Waiting text="Loading your quote…" />;
		case "waiting":
			return <Waiting text="Getting your quotes from our insurers…" />;
		case "handoff":
			return <Waiting text="Taking you to complete your purchase…" />;
		case "error":
			return (
				<Problem
					title="Something went wrong"
					body="We couldn't load your quote."
					action={
						screen.action === "start"
							? { label: "Try again", run: () => void session.start() }
							: {
									label: "Start again",
									run: () => window.location.assign("/quote"),
								}
					}
				/>
			);
		case "section":
			return (
				<SectionView
					key={screen.section.id}
					session={session}
					state={state}
					screen={screen}
					onNavigate={setSectionId}
				/>
			);
		case "quotes":
			return <Quotes session={session} state={state} screen={screen} />;
		case "failed":
			return (
				<Problem
					title="We couldn't get your quotes"
					body={
						screen.reason === "timeout"
							? "Our insurers took too long to respond."
							: "Something went wrong while quoting."
					}
					action={{ label: "Try again", run: () => void session.retryQuotes() }}
					secondary={{ label: "Edit answers", run: () => session.amend() }}
				/>
			);
		case "agreements":
			return <Agreements session={session} state={state} screen={screen} />;
	}
}

function useReveal() {
	const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
	const reveal = useCallback(
		(...names: string[]) =>
			setRevealed((prev) => {
				if (names.every((n) => prev.has(n))) return prev;
				return new Set([...prev, ...names]);
			}),
		[],
	);
	return [revealed, reveal] as const;
}

const focus = (name: string) =>
	requestAnimationFrame(() => document.getElementById(name)?.focus());

function SectionView({
	session,
	state,
	screen,
	onNavigate,
}: {
	session: Session;
	state: SessionState;
	screen: SectionScreen;
	onNavigate: (id: string | undefined) => void;
}) {
	const [revealed, reveal] = useReveal();
	const { section, sections } = screen;
	const index = sections.findIndex((s) => s.id === section.id);
	const fields = section.names.flatMap((name) => {
		const q = state.questions[name];
		return q ? [toField(q)] : [];
	});

	/** Reveal the section's checks; true when every field passes. */
	const check = () => {
		reveal(...section.names);
		const invalid = section.names.find(
			(name) => fieldState(state, name, { reveal: true }).invalid,
		);
		if (invalid) focus(invalid);
		return !invalid;
	};

	const next = async () => {
		if (!check()) return;
		await session.flush();
		onNavigate(screen.nextId);
		window.scrollTo({ top: 0 });
	};

	const getQuotes = async () => {
		if (!check()) return;
		await session.requestQuotes();
	};

	// A blocked quote request points at what's missing.
	// Keyed by primitives: `toScreen` returns new objects on every state change.
	const missing = screen.missing.length > 0;
	const attentionSection = screen.attention?.sectionId;
	const attentionName = screen.attention?.name;
	useEffect(() => {
		if (!missing || attentionSection === undefined || !attentionName) return;
		if (attentionSection !== section.id) onNavigate(attentionSection);
		else focus(attentionName);
	}, [missing, attentionSection, attentionName, section.id, onNavigate]);

	return (
		<Card>
			<CardHeader>
				{sections.length > 1 && (
					<CardDescription>
						Step {index + 1} of {sections.length}
					</CardDescription>
				)}
				<CardTitle className="text-2xl">
					{section.title ?? "Tell us about your business"}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					className="grid gap-6"
					noValidate
					onSubmit={(e) => {
						e.preventDefault();
						void (screen.nextId ? next() : getQuotes());
					}}
				>
					{fields.map((field) => (
						<FieldControl
							key={field.name}
							session={session}
							state={state}
							field={field}
							revealed={revealed.has(field.name)}
							onReveal={reveal}
						/>
					))}

					{screen.syncFailed && (
						<Alert variant="destructive">
							<AlertCircle />
							<AlertTitle>Couldn't save your answers</AlertTitle>
							<AlertDescription>
								We'll retry automatically. Check your connection.
							</AlertDescription>
						</Alert>
					)}
					{screen.missing.length > 0 && (
						<Alert>
							<AlertCircle />
							<AlertTitle>A few more answers needed</AlertTitle>
							<AlertDescription>
								Please answer the highlighted questions to get your quotes.
							</AlertDescription>
						</Alert>
					)}

					<div className="flex items-center justify-between gap-3 border-t pt-6">
						{screen.previousId !== undefined ? (
							<Button
								type="button"
								variant="ghost"
								onClick={() => onNavigate(screen.previousId)}
							>
								<ArrowLeft /> Back
							</Button>
						) : (
							<span />
						)}
						<div className="flex items-center gap-3">
							{screen.syncing && (
								<span className="text-xs text-muted-foreground">Saving…</span>
							)}
							{screen.nextId !== undefined ? (
								<Button type="submit">
									Continue <ArrowRight />
								</Button>
							) : (
								<Button type="submit">
									Get quotes <ArrowRight />
								</Button>
							)}
						</div>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function Agreements({
	session,
	state,
	screen,
}: {
	session: Session;
	state: SessionState;
	screen: AgreementsScreen;
}) {
	const [revealed, reveal] = useReveal();
	// An accepted consent leaves `screen.fields` once synced: keep the first render's names.
	const [names] = useState(() => screen.fields.map((f) => f.name));
	const fields = names.flatMap((name) => {
		const q = state.questions[name];
		const f = q ? toField(q) : screen.fields.find((x) => x.name === name);
		return f ? [f] : [];
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-2xl">Before you buy</CardTitle>
				<CardDescription>
					Please read the insurer's notices and confirm each statement.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					className="grid gap-6"
					noValidate
					onSubmit={(e) => {
						e.preventDefault();
						reveal(...names);
						void session.confirmAgreements();
					}}
				>
					{fields.map((field) => (
						<FieldControl
							key={field.name}
							session={session}
							state={state}
							field={field}
							revealed={revealed.has(field.name)}
							onReveal={reveal}
						/>
					))}
					<div className="flex justify-end border-t pt-6">
						<Button type="submit">
							Continue <ArrowRight />
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function Waiting({ text }: { text: string }) {
	return (
		<Card>
			<CardContent className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
				<Loader2 className="size-8 animate-spin text-primary" />
				<p>{text}</p>
			</CardContent>
		</Card>
	);
}

interface Action {
	label: string;
	run: () => void;
}

function Problem({
	title,
	body,
	action,
	secondary,
}: {
	title: string;
	body: string;
	action: Action;
	secondary?: Action;
}) {
	return (
		<Card>
			<CardContent className="flex flex-col items-center gap-4 py-16 text-center">
				<AlertCircle className="size-8 text-destructive" />
				<div>
					<h2 className="text-xl font-semibold">{title}</h2>
					<p className="mt-1 text-muted-foreground">{body}</p>
				</div>
				<div className="flex gap-3">
					{secondary && (
						<Button variant="outline" onClick={secondary.run}>
							{secondary.label}
						</Button>
					)}
					<Button onClick={action.run}>{action.label}</Button>
				</div>
			</CardContent>
		</Card>
	);
}
