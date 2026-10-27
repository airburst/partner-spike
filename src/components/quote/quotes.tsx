import type { QuoteId } from "@simplybusiness/sdk-core";
import type { Session, SessionState } from "@simplybusiness/sdk-core/session";
import {
	type QuoteCard,
	type QuoteDetailView,
	type Screen,
	toQuoteDetail,
} from "@simplybusiness/sdk-core/view-model";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

type QuotesScreen = Extract<Screen, { kind: "quotes" }>;

const STATUS_LABEL: Record<QuoteCard["status"], string> = {
	choosable: "Available",
	referred: "Referred",
	declined: "Declined",
	unavailable: "Unavailable",
};

export function Quotes({
	session,
	state,
	screen,
}: {
	session: Session;
	state: SessionState;
	screen: QuotesScreen;
}) {
	const [choosing, setChoosing] = useState<QuoteId>();
	const anyChoosable = screen.cards.some((c) => c.choosable);

	return (
		<div className="grid gap-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Your quotes</h2>
					<p className="text-muted-foreground">
						{screen.cards.length} insurer
						{screen.cards.length === 1 ? "" : "s"} responded.
					</p>
				</div>
				<Button variant="outline" onClick={() => session.amend()}>
					<ArrowLeft /> Edit answers
				</Button>
			</div>

			{screen.selectFailed && (
				<Alert variant="destructive">
					<AlertCircle />
					<AlertTitle>We couldn't choose that quote</AlertTitle>
					<AlertDescription>Please try again.</AlertDescription>
				</Alert>
			)}

			{!anyChoosable && (
				<Alert>
					<AlertCircle />
					<AlertTitle>No quote can be chosen online here</AlertTitle>
					<AlertDescription>
						<p>Continue to see your options and next steps.</p>
						<Button className="mt-3" onClick={() => session.handOff()}>
							Continue
						</Button>
					</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-4 md:grid-cols-2">
				{[...screen.cards]
					.sort((a, b) => Number(b.choosable) - Number(a.choosable))
					.map((card) => (
						<QuoteCardView
							key={String(card.id)}
							card={card}
							state={state}
							busy={choosing === card.id}
							onChoose={async () => {
								setChoosing(card.id);
								await session.selectQuote(card.id);
								setChoosing(undefined);
							}}
						/>
					))}
			</div>
		</div>
	);
}

function QuoteCardView({
	card,
	state,
	busy,
	onChoose,
}: {
	card: QuoteCard;
	state: SessionState;
	busy: boolean;
	onChoose: () => void;
}) {
	const [detail, setDetail] = useState<
		| { status: "loading" }
		| { status: "done"; view: QuoteDetailView }
		| { status: "error" }
	>();

	const loadDetail = async () => {
		if (detail?.status === "done") return setDetail(undefined); // toggle closed
		const quotes =
			state.quotes?.status === "quoted" ? state.quotes.quoteSet.quotes : [];
		const quote = quotes.find((q) => q.id === card.id);
		if (!quote) return setDetail({ status: "error" });
		setDetail({ status: "loading" });
		try {
			setDetail({ status: "done", view: toQuoteDetail(await quote.detail()) });
		} catch {
			setDetail({ status: "error" });
		}
	};

	return (
		<Card className={card.choosable ? "" : "opacity-75"}>
			<CardHeader>
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="text-lg">{card.insurer ?? "Insurer"}</CardTitle>
					<Badge variant={card.choosable ? "default" : "secondary"}>
						{STATUS_LABEL[card.status]}
					</Badge>
				</div>
				{card.choosable && card.premium && (
					<p className="text-3xl font-bold">
						{card.premium}
						<span className="text-sm font-normal text-muted-foreground">
							{" "}
							/ year
						</span>
					</p>
				)}
				{card.expiry && (
					<CardDescription>Policy ends {card.expiry}</CardDescription>
				)}
			</CardHeader>
			<CardContent className="grid gap-3 text-sm">
				{card.notice && <p className="text-muted-foreground">{card.notice}</p>}
				{detail?.status === "loading" && (
					<p className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="size-4 animate-spin" /> Loading details…
					</p>
				)}
				{detail?.status === "error" && (
					<p className="text-destructive">Couldn't load the details.</p>
				)}
				{detail?.status === "done" && <DetailView view={detail.view} />}
			</CardContent>
			<CardFooter className="gap-2">
				{card.choosable && (
					<Button onClick={onChoose} disabled={busy}>
						{busy && <Loader2 className="animate-spin" />}
						Choose this quote
					</Button>
				)}
				<Button variant="ghost" onClick={loadDetail}>
					{detail?.status === "done" ? "Hide details" : "View details"}
				</Button>
			</CardFooter>
		</Card>
	);
}

function DetailView({ view }: { view: QuoteDetailView }) {
	const { premium } = view;
	// Never show `commission`: it's the broker's.
	const rows = [
		["Net premium", premium.net],
		["Tax", premium.tax],
		["Fees", premium.fees],
		["Discount", premium.discount],
		["Total", premium.total],
	].filter((r): r is [string, string] => Boolean(r[1]));

	return (
		<div className="grid gap-3 rounded-md border bg-muted/30 p-3">
			{rows.length > 0 && (
				<dl className="grid grid-cols-2 gap-x-4 gap-y-1">
					{rows.map(([k, v]) => (
						<div key={k} className="contents">
							<dt className="text-muted-foreground">{k}</dt>
							<dd className="text-right">{v}</dd>
						</div>
					))}
				</dl>
			)}
			{view.covers.length > 0 && (
				<ul className="grid gap-2">
					{view.covers.map((c) => (
						<li key={c.name}>
							<p className="font-medium">{c.name}</p>
							{[
								...c.limits.map((l) => ["Limit", l] as const),
								...c.excesses.map((x) => ["Excess", x] as const),
							].map(([kind, a]) => (
								<p
									key={`${kind}-${a.name ?? ""}-${a.value}`}
									className="text-xs text-muted-foreground"
								>
									{a.name ?? kind}: {a.value}
								</p>
							))}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
