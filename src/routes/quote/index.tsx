import { createFileRoute } from "@tanstack/react-router";
import { ProductTiles } from "#/components/quote/product-tiles";

export const Route = createFileRoute("/quote/")({
	head: () => ({ meta: [{ title: "Get a quote — Harbourline Brokers" }] }),
	component: QuotePage,
});

function QuotePage() {
	return (
		<section className="mx-auto max-w-4xl px-4 py-16">
			<h1 className="text-3xl font-bold tracking-tight">Get a quote</h1>
			<p className="mt-2 mb-8 text-muted-foreground">
				Choose the cover you need. It takes a few minutes.
			</p>
			<ProductTiles />
		</section>
	);
}
