import type { ConversationState } from "@vassist/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATE_LABEL } from "./labels";

// One look per state (DESIGN section 2). `waiting` is the only one with
// colour, because it is the only one that asks something of the owner.
const STATE_CLASS: Record<ConversationState, string> = {
    waiting: "border-attention/30 bg-attention/15 text-attention-foreground",
    ai: "border-border bg-transparent text-muted-foreground",
    human: "bg-primary text-primary-foreground",
    closed: "bg-muted text-muted-foreground",
};

/** Who replies in a conversation, as a badge. */
export function StateBadge({
    state,
    className,
}: {
    state: ConversationState;
    className?: string;
}) {
    return (
        <Badge
            variant="outline"
            className={cn("border-transparent", STATE_CLASS[state], className)}
        >
            {STATE_LABEL[state]}
        </Badge>
    );
}
