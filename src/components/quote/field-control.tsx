// biome-ignore-all lint/security/noDangerouslySetInnerHtml: SDK labels and hints are server HTML by contract
import type { Session, SessionState } from "@simplybusiness/sdk-core/session";
import { type Field, fieldState } from "@simplybusiness/sdk-core/view-model";
import { cn } from "cn";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { TradeSearch } from "./trade-search";

export interface FieldProps {
	session: Session;
	state: SessionState;
	field: Field;
	revealed: boolean;
	onReveal: (name: string) => void;
}

const html = (s: string) => ({ __html: s });

/** A rejected trade gets the generic `choice` copy; say what to do instead. */
const TRADE_ERRORS = {
	choice:
		"We couldn't match that trade. Try describing your business in different words.",
};

/** One question, rendered by `field.kind`. Labels and hints are server HTML. */
export function FieldControl(props: FieldProps) {
	const { state, field, revealed } = props;
	const { error, invalid } = fieldState(state, field.name, {
		reveal: revealed,
		messages: field.kind === "search" ? TRADE_ERRORS : undefined,
	});
	const hintId = field.hint ? `${field.name}-hint` : undefined;
	const errorId = error ? `${field.name}-error` : undefined;
	const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

	if (field.kind === "info")
		return (
			<div className="rounded-md border bg-muted/40 p-4 text-sm">
				<div
					className="font-medium"
					dangerouslySetInnerHTML={html(field.label)}
				/>
				{field.hint && (
					<div
						className="prose prose-sm mt-2 max-w-none text-muted-foreground"
						dangerouslySetInnerHTML={html(field.hint)}
					/>
				)}
			</div>
		);

	const grouped =
		field.kind === "choice" && field.presentation === "radio"
			? true
			: field.kind === "multi" && field.presentation === "group";

	const labelEl = grouped ? (
		<legend
			className="text-sm font-medium"
			dangerouslySetInnerHTML={html(labelText(field))}
		/>
	) : field.kind === "multi" ? null : (
		<Label
			htmlFor={field.name}
			className="block"
			dangerouslySetInnerHTML={html(labelText(field))}
		/>
	);

	const body = (
		<>
			{labelEl}
			{field.hint && (
				<div
					id={hintId}
					className="prose prose-sm max-w-none text-muted-foreground"
					dangerouslySetInnerHTML={html(field.hint)}
				/>
			)}
			<Control {...props} invalid={invalid} describedBy={describedBy} />
			{error && (
				<p id={errorId} className="text-sm text-destructive">
					{error}
				</p>
			)}
		</>
	);

	const className = cn("grid gap-2", invalid && "[&_input]:border-destructive");
	return grouped ? (
		<fieldset className={className} data-name={field.name}>
			{body}
		</fieldset>
	) : (
		<div className={className} data-name={field.name}>
			{body}
		</div>
	);
}

const labelText = (field: Field) =>
	field.required
		? field.label
		: `${field.label} <span class="text-muted-foreground font-normal">(optional)</span>`;

function Control({
	session,
	state,
	field,
	onReveal,
	invalid,
	describedBy,
}: FieldProps & { invalid: boolean; describedBy?: string }) {
	const value = fieldState(state, field.name).value;
	const aria = {
		"aria-invalid": invalid || undefined,
		"aria-describedby": describedBy,
	};
	const commit = () => {
		onReveal(field.name);
		void session.commit();
	};
	const editAndCommit = (v: Parameters<Session["edit"]>[1]) => {
		session.edit(field.name, v);
		commit();
	};

	switch (field.kind) {
		case "text":
			return (
				<Input
					id={field.name}
					name={field.name}
					type={field.inputType}
					autoComplete={field.autoComplete}
					inputMode={field.inputMode}
					maxLength={field.maxLength}
					placeholder={field.placeholder}
					required={field.required}
					value={String(value ?? "")}
					onChange={(e) => session.edit(field.name, e.target.value)}
					onBlur={commit}
					{...aria}
				/>
			);
		case "number":
			return (
				<div className="relative">
					{field.prefix && (
						<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
							{field.prefix}
						</span>
					)}
					<Input
						id={field.name}
						name={field.name}
						type="number"
						inputMode="numeric"
						min={field.min}
						max={field.max}
						step={field.integer ? 1 : "any"}
						required={field.required}
						className={cn(field.prefix && "pl-7")}
						value={String(value ?? "")}
						onChange={(e) => session.edit(field.name, e.target.value)}
						onBlur={commit}
						{...aria}
					/>
				</div>
			);
		case "date":
			return (
				<Input
					id={field.name}
					name={field.name}
					type="date"
					min={field.min}
					max={field.max}
					required={field.required}
					value={String(value ?? "")}
					onChange={(e) => session.edit(field.name, e.target.value)}
					onBlur={commit}
					{...aria}
				/>
			);
		case "choice":
			if (field.presentation === "radio")
				return (
					<RadioGroup
						id={field.name}
						name={field.name}
						value={value == null ? "" : String(value)}
						onValueChange={editAndCommit}
						{...aria}
					>
						{field.options.map((o) => {
							const id = `${field.name}--${o.value}`;
							return (
								<div key={o.value} className="flex items-center gap-2">
									<RadioGroupItem id={id} value={o.value} />
									<Label
										htmlFor={id}
										className="font-normal"
										dangerouslySetInnerHTML={html(o.label)}
									/>
								</div>
							);
						})}
					</RadioGroup>
				);
			return (
				<select
					id={field.name}
					name={field.name}
					required={field.required}
					className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
					value={value == null ? "" : String(value)}
					onChange={(e) => editAndCommit(e.target.value || null)}
					{...aria}
				>
					<option value="">Select…</option>
					{field.options.map((o) => (
						<option key={o.value} value={o.value}>
							{stripTags(o.label)}
						</option>
					))}
				</select>
			);
		case "multi": {
			const checked = new Set(
				Array.isArray(value)
					? value.map(String)
					: value == null
						? []
						: [String(value)],
			);
			if (field.presentation === "checkbox") {
				const [option] = field.options;
				if (!option) return null;
				return (
					<div className="flex items-start gap-3">
						<Checkbox
							id={field.name}
							name={field.name}
							checked={checked.has(option.value)}
							onCheckedChange={(on) =>
								editAndCommit(on === true ? [option.value] : [])
							}
							{...aria}
						/>
						<Label
							htmlFor={field.name}
							className="block leading-snug font-normal"
							dangerouslySetInnerHTML={html(labelText(field))}
						/>
					</div>
				);
			}
			return (
				<div className="grid gap-2" {...aria}>
					{field.options.map((o) => {
						const id = `${field.name}--${o.value}`;
						return (
							<div key={o.value} className="flex items-center gap-2">
								<Checkbox
									id={id}
									name={field.name}
									value={o.value}
									checked={checked.has(o.value)}
									onCheckedChange={(on) => {
										const next = new Set(checked);
										if (on === true) next.add(o.value);
										else next.delete(o.value);
										editAndCommit([...next]);
									}}
								/>
								<Label
									htmlFor={id}
									className="font-normal"
									dangerouslySetInnerHTML={html(o.label)}
								/>
							</div>
						);
					})}
				</div>
			);
		}
		case "search":
			return (
				<TradeSearch
					session={session}
					state={state}
					field={field}
					onCommit={() => onReveal(field.name)}
					invalid={invalid}
					aria={aria}
				/>
			);
		default:
			return null;
	}
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");
