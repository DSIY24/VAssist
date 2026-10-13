import "server-only";
import { conversationsRouter } from "./conversations";
import { knowledgeRouter } from "./knowledge";
import { os } from "./orpc";
import { widgetRouter } from "./widget";
import { createWorkspace, getWorkspace } from "./workspace";

export const router = os.router({
    workspace: {
        get: getWorkspace,
        create: createWorkspace,
    },
    conversations: conversationsRouter,
    widget: widgetRouter,
    knowledge: knowledgeRouter,
});
