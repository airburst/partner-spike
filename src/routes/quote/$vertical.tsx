import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Journey } from "#/components/quote/journey";
import { getClient } from "#/lib/sdk";

export const Route = createFileRoute("/quote/$vertical")({
	head: () => ({ meta: [{ title: "Your quote — Harbourline Brokers" }] }),
	component: QuoteJourneyPage,
});

function QuoteJourneyPage() {
	const { vertical } = Route.useParams();
	const name = useVerticalName(vertical);

	return (
		<section className="mx-auto max-w-3xl px-4 py-12">
			<Link
				to="/quote"
				className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-4" /> All products
			</Link>
			<h1 className="mb-6 text-3xl font-bold tracking-tight">
				{name ? `${name} quote` : "Your quote"}
			</h1>
			<Journey key={vertical} vertical={vertical} />
		</section>
	);
}

function useVerticalName(vertical: string) {
	const [name, setName] = useState<string>();
	useEffect(() => {
		const controller = new AbortController();
		getClient()
			.listVerticals({ signal: controller.signal })
			.then(
				(all) => setName(all.find((v) => v.id === vertical)?.name),
				() => {},
			);
		return () => controller.abort();
	}, [vertical]);
	return name;
}
