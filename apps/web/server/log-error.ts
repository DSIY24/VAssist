import "server-only";
import { COMMON_ERROR_STATUS_MAP } from "@orpc/client";
import { ORPCError } from "@orpc/server";

const statusByCode: Record<string, number | undefined> =
    COMMON_ERROR_STATUS_MAP;

/**
 * Handler interceptor: logs failures that need attention. Client errors (401,
 * 403, validation and other 4xx) are expected and stay out of the logs.
 */
export function logUnexpectedError(error: unknown) {
    if (error instanceof ORPCError && (statusByCode[error.code] ?? 500) < 500) {
        return;
    }
    console.error(error);
}
