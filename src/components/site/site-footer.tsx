import { Separator } from "#/components/ui/separator";

const COLUMNS = [
	{
		title: "Insurance",
		links: [
			"Public liability",
			"Professional indemnity",
			"Cyber",
			"Employers’ liability",
		],
	},
	{ title: "Company", links: ["About us", "Careers", "Press", "Complaints"] },
	{ title: "Support", links: ["Make a claim", "Help centre", "Contact us"] },
];

export function SiteFooter() {
	return (
		<footer id="contact" className="border-t bg-muted/40">
			<div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
				<div>
					<p className="font-semibold text-primary">Harbourline Brokers</p>
					<p className="mt-2 text-sm text-muted-foreground">
						0800 000 0000
						<br />
						Mon–Fri, 8am–8pm
					</p>
				</div>
				{COLUMNS.map((col) => (
					<div key={col.title}>
						<p className="text-sm font-semibold">{col.title}</p>
						<ul className="mt-3 space-y-2 text-sm text-muted-foreground">
							{col.links.map((link) => (
								<li key={link}>
									<a href="/" className="hover:text-foreground">
										{link}
									</a>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<Separator />
			<p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
				© {new Date().getFullYear()} Harbourline Brokers Ltd. Demo site — not a
				real insurance broker. Authorised and regulated by nobody.
			</p>
		</footer>
	);
}
