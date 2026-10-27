import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Button } from "#/components/ui/button";

const NAV = [
	{ to: "/", hash: "products", label: "Insurance" },
	{ to: "/", hash: "why-us", label: "Why us" },
	{ to: "/quote", label: "Get a quote" },
	{ to: "/", hash: "contact", label: "Contact" },
] as const;

export function SiteHeader() {
	return (
		<header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
				<Link
					to="/"
					className="flex items-center gap-2 font-semibold text-primary"
				>
					<ShieldCheck className="size-6" />
					<span className="text-lg">Harbourline Brokers</span>
				</Link>
				<nav className="hidden gap-6 text-sm md:flex">
					{NAV.map((item) => (
						<Link
							key={item.label}
							to={item.to}
							hash={"hash" in item ? item.hash : undefined}
							className="text-muted-foreground hover:text-foreground"
						>
							{item.label}
						</Link>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" className="hidden sm:inline-flex">
						Sign in
					</Button>
					<Button size="sm" asChild>
						<Link to="/quote">Get a quote</Link>
					</Button>
				</div>
			</div>
		</header>
	);
}
