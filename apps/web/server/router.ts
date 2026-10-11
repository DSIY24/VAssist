import "server-only";
import { os } from "./orpc";
import { createWorkspace, getWorkspace } from "./workspace";

export const router = os.router({
    workspace: {
        get: getWorkspace,
        create: createWorkspace,
    },
});
