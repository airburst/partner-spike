import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Button } from "#/components/ui/button";

const NAV = [
	{ href: "#products", label: "Insurance" },
	{ href: "#why-us", label: "Why us" },
	{ href: "#quote", label: "Get a quote" },
	{ href: "#contact", label: "Contact" },
];

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
						<a
							key={item.href}
							href={item.href}
							className="text-muted-foreground hover:text-foreground"
						>
							{item.label}
						</a>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" className="hidden sm:inline-flex">
						Sign in
					</Button>
					<Button size="sm" asChild>
						<a href="#quote">Get a quote</a>
					</Button>
				</div>
			</div>
		</header>
	);
}
