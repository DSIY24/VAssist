import { cookies } from "next/headers";
import { requireOwner } from "@/lib/auth/guards";
import { DashboardFrame } from "./dashboard-frame";

/**
 * Gates the dashboard and fills the frame with the owner. It reads the
 * session and a cookie, so it must render inside a `<Suspense>` boundary.
 */
export async function DashboardShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = await requireOwner();
    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

    return (
        <DashboardFrame
            defaultOpen={defaultOpen}
            user={{ name: user.name, email: user.email, image: user.image }}
        >
            {children}
        </DashboardFrame>
    );
}
