import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BadgeCheck,
	Briefcase,
	Clock,
	HardHat,
	Headphones,
	Laptop,
	ShieldCheck,
	Store,
	Users,
} from "lucide-react";
import { ProductTiles } from "#/components/quote/product-tiles";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/")({ component: Home });

const PRODUCTS = [
	{
		icon: Users,
		title: "Public liability",
		body: "Cover if a customer or member of the public is injured or their property damaged.",
	},
	{
		icon: Briefcase,
		title: "Professional indemnity",
		body: "Protection if a client claims your advice or work cost them money.",
	},
	{
		icon: Laptop,
		title: "Cyber insurance",
		body: "Help recovering from data breaches, ransomware and online fraud.",
	},
	{
		icon: HardHat,
		title: "Employers’ liability",
		body: "Legally required cover if you employ staff in the UK.",
	},
	{
		icon: Store,
		title: "Shop & premises",
		body: "Buildings, contents and stock cover for your workplace.",
	},
	{
		icon: ShieldCheck,
		title: "Tradesperson",
		body: "Tailored cover for builders, electricians, plumbers and more.",
	},
];

const REASONS = [
	{
		icon: Clock,
		title: "Quotes in minutes",
		body: "Answer a few questions and compare quotes online.",
	},
	{
		icon: BadgeCheck,
		title: "Trusted insurers",
		body: "We work with a panel of leading UK insurers.",
	},
	{
		icon: Headphones,
		title: "Real people",
		body: "UK-based advisers on hand if you get stuck.",
	},
];

function Home() {
	return (
		<>
			<Hero />
			<Products />
			<WhyUs />
			<QuoteSlot />
		</>
	);
}

function Hero() {
	return (
		<section className="bg-primary text-primary-foreground">
			<div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center">
				<div>
					<Badge variant="secondary" className="mb-4">
						Rated 4.8/5 by 20,000+ small businesses
					</Badge>
					<h1 className="text-4xl font-bold tracking-tight md:text-5xl">
						Business insurance, sorted in minutes
					</h1>
					<p className="mt-4 max-w-md text-lg text-primary-foreground/80">
						Compare tailored quotes for your small business from leading UK
						insurers. Buy online, cover starts today.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Button size="lg" variant="secondary" asChild>
							<Link to="/quote">Get a quote</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
							asChild
						>
							<a href="#products">Explore cover</a>
						</Button>
					</div>
				</div>
				<ul className="grid gap-3 text-sm">
					{[
						"No hidden fees",
						"Instant documents",
						"Cancel anytime",
						"Pay monthly or annually",
					].map((item) => (
						<li
							key={item}
							className="flex items-center gap-3 rounded-lg bg-primary-foreground/10 px-4 py-3"
						>
							<BadgeCheck className="size-5 text-accent" />
							{item}
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

function Products() {
	return (
		<section
			id="products"
			className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20"
		>
			<h2 className="text-3xl font-bold tracking-tight">
				Cover for every kind of business
			</h2>
			<p className="mt-2 text-muted-foreground">
				Pick the policies you need, or let us help you build a package.
			</p>
			<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{PRODUCTS.map(({ icon: Icon, title, body }) => (
					<Card key={title} className="transition-shadow hover:shadow-md">
						<CardHeader>
							<Icon className="mb-2 size-8 text-primary" />
							<CardTitle>{title}</CardTitle>
							<CardDescription>{body}</CardDescription>
						</CardHeader>
					</Card>
				))}
			</div>
		</section>
	);
}

function WhyUs() {
	return (
		<section id="why-us" className="scroll-mt-16 bg-muted/50">
			<div className="mx-auto max-w-6xl px-4 py-20">
				<h2 className="text-3xl font-bold tracking-tight">Why Harbourline?</h2>
				<div className="mt-10 grid gap-8 md:grid-cols-3">
					{REASONS.map(({ icon: Icon, title, body }) => (
						<div key={title}>
							<Icon className="size-8 text-primary" />
							<h3 className="mt-3 font-semibold">{title}</h3>
							<p className="mt-1 text-sm text-muted-foreground">{body}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function QuoteSlot() {
	return (
		<section id="quote" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20">
			<h2 className="text-3xl font-bold tracking-tight">Get a quote</h2>
			<p className="mt-2 text-muted-foreground">
				Choose a product to start your quote.
			</p>
			<Card className="mt-8">
				<CardContent id="quote-app" className="py-8">
					<ProductTiles />
				</CardContent>
			</Card>
		</section>
	);
}
