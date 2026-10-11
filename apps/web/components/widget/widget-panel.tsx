import { UserRoundIcon, XIcon } from "lucide-react";
import type { WidgetColor } from "@vassist/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { widgetAccentStyle } from "./widget-accent";
import { WidgetComposer } from "./widget-composer";
import { WidgetMessageList, type WidgetMessageData } from "./widget-message";

/** The agent's name and avatar, on the accent colour. */
export function WidgetHeader({
    agentName,
    agentAvatarUrl,
    onClose,
}: {
    agentName: string;
    agentAvatarUrl: string | null;
    onClose?: () => void;
}) {
    return (
        <header className="flex items-center gap-3 bg-(--widget-accent) px-4 py-3 text-(--widget-accent-foreground)">
            <Avatar className="after:hidden">
                {agentAvatarUrl ? (
                    <AvatarImage src={agentAvatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="bg-(--widget-accent-foreground)/20 text-(--widget-accent-foreground)">
                    {Array.from(agentName.trim())[0]?.toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {agentName}
            </p>
            {onClose ? (
                <button
                    type="button"
                    aria-label="Close chat"
                    onClick={onClose}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full outline-none hover:bg-(--widget-accent-foreground)/15 focus-visible:ring-3 focus-visible:ring-(--widget-accent-foreground)/50"
                >
                    <XIcon className="size-4" />
                </button>
            ) : null}
        </header>
    );
}

/**
 * Up to four questions shown as chips under the greeting until the visitor's
 * first message. Tapping one sends it (PRD W-4).
 */
export function WidgetSuggestedQuestions({
    questions,
    onSelect,
}: {
    questions: readonly string[];
    onSelect?: (question: string) => void;
}) {
    if (questions.length === 0) return null;
    return (
        <ul className="flex flex-col items-start gap-2 pl-8">
            {questions.map((question) => (
                <li key={question}>
                    <button
                        type="button"
                        onClick={() => onSelect?.(question)}
                        className="rounded-full border px-3 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                        {question}
                    </button>
                </li>
            ))}
        </ul>
    );
}

/**
 * The widget as a visitor sees it: header, messages and composer. It holds no
 * data access: the widget route feeds it the conversation, and the settings
 * preview feeds it the form's values. It fills its container.
 *
 * `agentOn` follows PRD "Agent off": while the agent is off there are no
 * suggested questions and no "Talk to a human" button.
 */
export function WidgetPanel({
    color,
    agentName,
    agentAvatarUrl,
    messages,
    suggestedQuestions = [],
    agentOn,
    onSend,
    onSelectQuestion,
    onTalkToHuman,
    onClose,
    className,
}: {
    color: WidgetColor;
    agentName: string;
    agentAvatarUrl: string | null;
    messages: readonly WidgetMessageData[];
    suggestedQuestions?: readonly string[];
    agentOn: boolean;
    onSend?: (body: string) => void;
    onSelectQuestion?: (question: string) => void;
    onTalkToHuman?: () => void;
    onClose?: () => void;
    className?: string;
}) {
    const visitorHasWritten = messages.some(
        (message) => message.author === "visitor",
    );
    return (
        <section
            aria-label={`Chat with ${agentName}`}
            style={widgetAccentStyle(color)}
            className={cn(
                "flex size-full flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-xl",
                className,
            )}
        >
            <WidgetHeader
                agentName={agentName}
                agentAvatarUrl={agentAvatarUrl}
                onClose={onClose}
            />
            <WidgetMessageList messages={messages}>
                {agentOn && !visitorHasWritten ? (
                    <WidgetSuggestedQuestions
                        questions={suggestedQuestions}
                        onSelect={onSelectQuestion}
                    />
                ) : null}
            </WidgetMessageList>
            {agentOn ? (
                <div className="flex justify-center px-3 pb-2">
                    <button
                        type="button"
                        onClick={onTalkToHuman}
                        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                        <UserRoundIcon className="size-3.5" />
                        Talk to a human
                    </button>
                </div>
            ) : null}
            <WidgetComposer onSend={onSend} />
        </section>
    );
}
