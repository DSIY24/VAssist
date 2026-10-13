"use client";

import * as React from "react";
import { GlobeIcon, XIcon } from "lucide-react";
import { MAX_ALLOWED_DOMAINS, allowedDomainSchema } from "@vassist/shared";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * The hostnames the widget may load on (PRD W-2). Whatever is typed or pasted
 * is reduced to a bare hostname before it is added.
 */
export function AllowedDomainsField({
    domains,
    onChange,
}: {
    domains: readonly string[];
    onChange: (domains: string[]) => void;
}) {
    const [value, setValue] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const full = domains.length >= MAX_ALLOWED_DOMAINS;

    function add() {
        const parsed = allowedDomainSchema.safeParse(value);
        if (!parsed.success) {
            setError(
                parsed.error.issues[0]?.message ?? "Enter a valid domain.",
            );
            return;
        }
        if (domains.includes(parsed.data)) {
            setError(`${parsed.data} is already on the list.`);
            return;
        }
        if (full) {
            setError(`You can add up to ${MAX_ALLOWED_DOMAINS} domains.`);
            return;
        }
        onChange([...domains, parsed.data]);
        setValue("");
        setError(null);
    }

    return (
        <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="allowed-domain">Allowed domains</FieldLabel>
            <form
                noValidate
                className="flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    add();
                }}
            >
                <Input
                    ref={inputRef}
                    id="allowed-domain"
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="example.com"
                    value={value}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                        error ? "allowed-domain-error" : "allowed-domain-hint"
                    }
                    onChange={(event) => {
                        setValue(event.target.value);
                        setError(null);
                    }}
                />
                <Button type="submit" variant="outline">
                    Add
                </Button>
            </form>
            {error ? (
                <FieldError id="allowed-domain-error">{error}</FieldError>
            ) : (
                <FieldDescription id="allowed-domain-hint">
                    The widget only loads on these domains. Add each one you
                    use, such as example.com and www.example.com.
                </FieldDescription>
            )}
            {domains.length > 0 ? (
                <ul
                    aria-label="Allowed domains"
                    className="flex flex-col divide-y rounded-lg border"
                >
                    {domains.map((domain) => (
                        <li
                            key={domain}
                            className="flex items-center gap-2 py-1.5 pr-1.5 pl-3"
                        >
                            <GlobeIcon
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                {domain}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${domain}`}
                                onClick={() => {
                                    onChange(
                                        domains.filter(
                                            (item) => item !== domain,
                                        ),
                                    );
                                    inputRef.current?.focus();
                                }}
                            >
                                <XIcon />
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </Field>
    );
}
