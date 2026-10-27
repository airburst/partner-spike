import type { Vertical } from "@simplybusiness/sdk-core";
import { sessionStorageAdapter } from "@simplybusiness/sdk-core/session";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { getClient, storageKey } from "#/lib/sdk";

/** One tile per product the API offers. A tile starts a fresh journey. */
export function ProductTiles() {
	const navigate = useNavigate();
	const [verticals, setVerticals] = useState<Vertical[]>();
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		getClient()
			.listVerticals({ signal: controller.signal })
			.then(setVerticals, () => {
				if (!controller.signal.aborted) setFailed(true);
			});
		return () => controller.abort();
	}, []);

	if (failed)
		return (
			<p className="text-center text-destructive">
				We couldn't load our products. Please refresh to try again.
			</p>
		);
	if (!verticals)
		return (
			<p className="flex items-center justify-center gap-2 text-muted-foreground">
				<Loader2 className="size-4 animate-spin" /> Loading products…
			</p>
		);

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{verticals.map((v) => (
				<Button
					key={v.id}
					variant="outline"
					className="h-auto justify-between px-4 py-4 text-left text-base whitespace-normal"
					onClick={() => {
						sessionStorageAdapter().remove(storageKey(v.id)); // a tile means "start again"
						void navigate({
							to: "/quote/$vertical",
							params: { vertical: v.id },
						});
					}}
				>
					{v.name}
					<ArrowRight />
				</Button>
			))}
		</div>
	);
}
