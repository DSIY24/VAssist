import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Who a message in the widget is from, as the visitor sees it. */
export type WidgetMessageData = {
    id: string;
    author: "visitor" | "agent" | "member" | "system";
    body: string;
    /** The agent's or the member's name. Unused for visitors and notices. */
    name?: string;
    avatarUrl?: string | null;
};

/**
 * One message. The visitor's own messages sit on the right in the accent
 * colour; the agent's and a member's sit on the left with a name and an
 * avatar, so it is clear who is talking (PRD W-6, W-7). A system message is a
 * centred notice.
 */
export function WidgetMessage({ message }: { message: WidgetMessageData }) {
    if (message.author === "system") {
        return (
            <p className="px-4 text-center text-xs text-muted-foreground">
                {message.body}
            </p>
        );
    }
    if (message.author === "visitor") {
        return (
            <div className="flex justify-end">
                <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-(--widget-accent) px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap text-(--widget-accent-foreground)">
                    {message.body}
                </p>
            </div>
        );
    }
    return (
        <div className="flex items-end gap-2">
            <Avatar size="sm">
                {message.avatarUrl ? (
                    <AvatarImage src={message.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback>
                    {Array.from(message.name?.trim() ?? "")[0]?.toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[80%] flex-col gap-1">
                {message.name ? (
                    <span className="px-1 text-xs text-muted-foreground">
                        {message.name}
                    </span>
                ) : null}
                <p className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap text-foreground">
                    {message.body}
                </p>
            </div>
        </div>
    );
}

export function WidgetMessageList({
    messages,
    children,
    className,
}: {
    messages: readonly WidgetMessageData[];
    /** Rendered after the messages, for example the suggested questions. */
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex flex-1 flex-col gap-3 overflow-y-auto p-4",
                className,
            )}
        >
            {messages.map((message) => (
                <WidgetMessage key={message.id} message={message} />
            ))}
            {children}
        </div>
    );
}
