// Fills one workspace with example conversations, for building and checking
// the inbox before the widget exists. Development only.
//
//   pnpm --filter @vassist/db db:seed -- owner@example.com
//
// Re-runnable: it first removes the visitors it created before (the ones
// without a visitor token, which no real visitor is) together with their
// conversations and messages, and touches nothing else.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getDb } from "../src/client.ts";
import type {
    ConversationState,
    HandoffReason,
    MessageAuthor,
    MessageClassification,
    MessageNotice,
} from "../src/conversations.ts";
import {
    CLOSED_NOTICE,
    HAND_BACK_NOTICE,
    joinedNotice,
} from "../src/notices.ts";

const envFile = fileURLToPath(new URL("../../../.env.local", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

type SeedMessage = {
    author: MessageAuthor;
    body: string;
    notice?: MessageNotice;
    classification?: MessageClassification;
    declined?: boolean;
    /** Minutes since the message before it. Defaults to one. */
    after?: number;
};

type SeedConversation = {
    state: ConversationState;
    handoffReason?: HandoffReason;
    /** How long ago the last message was sent. */
    lastMessageMinutesAgo: number;
    visitor: {
        country?: string;
        city?: string;
        timezone?: string;
        language?: string;
        device?: string;
        browser?: string;
        os?: string;
        page?: string;
        referrer?: string;
        visitCount?: number;
        firstSeenDaysAgo?: number;
    };
    messages: SeedMessage[];
};

const visitor = (
    body: string,
    options: Partial<SeedMessage> = {},
): SeedMessage => ({
    author: "visitor",
    body,
    classification: "support_question",
    ...options,
});
const agent = (body: string, after = 0.2): SeedMessage => ({
    author: "agent",
    body,
    after,
});
const owner = (body: string, after = 2): SeedMessage => ({
    author: "member",
    body,
    after,
});
const notice = (
    kind: MessageNotice,
    body: string,
    after = 0.1,
): SeedMessage => ({ author: "system", notice: kind, body, after });

const HANDOFF_NOTICE = "A person will join shortly. Replies will appear here.";
const AGENT_OFF_NOTICE =
    "You'll be connected to a person shortly. It can take a little while, so please hang on.";

function conversations(ownerName: string | null): SeedConversation[] {
    const joined = notice("take_over", joinedNotice(ownerName), 4);
    return [
        {
            state: "waiting",
            handoffReason: "visitor_requested",
            lastMessageMinutesAgo: 4,
            visitor: {
                country: "Germany",
                city: "Berlin",
                timezone: "Europe/Berlin",
                language: "en-GB",
                device: "Desktop",
                browser: "Firefox 143",
                os: "Windows 11",
                page: "https://demo.vassist.app/pricing",
                referrer: "https://www.google.com/",
                visitCount: 3,
                firstSeenDaysAgo: 6,
            },
            messages: [
                visitor("What's the difference between Starter and Pro?"),
                agent(
                    "**Starter** covers one website and 1,000 conversations a month. **Pro** adds unlimited websites, priority support and custom branding.\n\nWould you like the prices too?",
                ),
                visitor(
                    "We have a slightly unusual setup. Can I talk to a real person?",
                    { classification: "human_request", after: 2 },
                ),
                notice("handoff", HANDOFF_NOTICE),
            ],
        },
        {
            state: "waiting",
            handoffReason: "no_relevant_knowledge",
            lastMessageMinutesAgo: 21,
            visitor: {
                country: "Canada",
                city: "Toronto",
                timezone: "America/Toronto",
                language: "en-CA",
                device: "Desktop",
                browser: "Chrome 141",
                os: "macOS 15",
                page: "https://demo.vassist.app/integrations",
                referrer: "https://www.producthunt.com/",
                visitCount: 1,
                firstSeenDaysAgo: 0,
            },
            messages: [
                visitor("Do you integrate with Salesforce?"),
                agent(
                    "I couldn't find that in our documentation, so I'm bringing in a person who can tell you for sure.",
                ),
                notice("handoff", HANDOFF_NOTICE),
                visitor("Thanks. We'd need two-way contact sync.", {
                    after: 1,
                }),
            ],
        },
        {
            state: "waiting",
            handoffReason: "low_confidence",
            lastMessageMinutesAgo: 58,
            visitor: {
                country: "Brazil",
                city: "São Paulo",
                timezone: "America/Sao_Paulo",
                language: "pt-BR",
                device: "Desktop",
                browser: "Edge 141",
                os: "Windows 11",
                page: "https://demo.vassist.app/account/billing",
                visitCount: 12,
                firstSeenDaysAgo: 48,
            },
            messages: [
                visitor(
                    "Se eu mudar do plano mensal para o anual no meio do ciclo, o valor já pago é descontado?",
                ),
                agent(
                    "Não tenho certeza de como isso é calculado no seu caso, então vou chamar uma pessoa da equipe para confirmar.",
                ),
                notice("handoff", HANDOFF_NOTICE),
            ],
        },
        {
            state: "waiting",
            handoffReason: "agent_off",
            lastMessageMinutesAgo: 190,
            visitor: {
                country: "Nigeria",
                city: "Lagos",
                timezone: "Africa/Lagos",
                language: "en-NG",
                device: "Mobile",
                browser: "Chrome 141",
                os: "Android 16",
                page: "https://demo.vassist.app/",
                referrer: "https://www.instagram.com/",
                visitCount: 1,
                firstSeenDaysAgo: 0,
            },
            messages: [
                visitor("Hi, my order hasn't arrived yet. Order #48213."),
                notice("handoff", AGENT_OFF_NOTICE),
            ],
        },
        {
            state: "ai",
            lastMessageMinutesAgo: 2,
            visitor: {
                country: "United Kingdom",
                city: "London",
                timezone: "Europe/London",
                language: "en-GB",
                device: "Desktop",
                browser: "Safari 19",
                os: "macOS 15",
                page: "https://demo.vassist.app/login",
                visitCount: 5,
                firstSeenDaysAgo: 20,
            },
            messages: [
                visitor("How do I reset my password?"),
                agent(
                    "You can reset it from the log-in page:\n\n1. Choose **Forgot password?**\n2. Enter the email you signed up with\n3. Type the 6-digit code we email you, then pick a new password\n\nThe code expires after 10 minutes.",
                ),
                visitor("And if I don't get the email?", { after: 3 }),
                agent(
                    "Check your spam folder first. If it isn't there after a couple of minutes, choose **Resend code** on the same screen.",
                ),
            ],
        },
        {
            state: "ai",
            lastMessageMinutesAgo: 9,
            visitor: {
                country: "Germany",
                city: "München",
                timezone: "Europe/Berlin",
                language: "de-DE",
                device: "Tablet",
                browser: "Safari 19",
                os: "iPadOS 19",
                page: "https://demo.vassist.app/de/hilfe",
                referrer: "https://www.bing.com/",
                visitCount: 2,
                firstSeenDaysAgo: 1,
            },
            messages: [
                visitor("Wie setze ich mein Passwort zurück?"),
                agent(
                    "Das geht über die Anmeldeseite: Wählen Sie **Passwort vergessen?**, geben Sie Ihre E-Mail-Adresse ein und tragen Sie den 6-stelligen Code ein, den wir Ihnen schicken. Danach können Sie ein neues Passwort festlegen.",
                ),
                visitor("Super, danke!", {
                    classification: "small_talk",
                    after: 2,
                }),
                agent("Gern geschehen! Melden Sie sich, wenn noch etwas ist."),
            ],
        },
        {
            state: "ai",
            lastMessageMinutesAgo: 34,
            visitor: {
                country: "United States",
                city: "Austin",
                timezone: "America/Chicago",
                language: "en-US",
                device: "Mobile",
                browser: "Safari 19",
                os: "iOS 19",
                page: "https://demo.vassist.app/shipping",
                referrer: "https://t.co/",
                visitCount: 1,
                firstSeenDaysAgo: 0,
            },
            messages: [
                visitor("What's 5 × 5?", {
                    classification: "off_topic",
                    declined: true,
                }),
                agent(
                    "I can only help with questions about our product and your orders. Is there something there I can help with?",
                ),
                visitor("Fair enough. Do you ship to Canada?", { after: 1 }),
                agent(
                    "Yes. Orders to Canada ship from our Ohio warehouse and usually arrive in 5 to 8 business days. Duties are included at checkout.",
                ),
            ],
        },
        {
            state: "ai",
            lastMessageMinutesAgo: 75,
            visitor: {
                country: "Australia",
                city: "Sydney",
                timezone: "Australia/Sydney",
                language: "en-AU",
                device: "Desktop",
                browser: "Chrome 141",
                os: "Windows 11",
                page: "https://demo.vassist.app/refunds",
                visitCount: 4,
                firstSeenDaysAgo: 9,
            },
            messages: [
                visitor("hi", { classification: "small_talk" }),
                agent("Hi! What can I help you with today?"),
                visitor("What's your refund policy?", { after: 1 }),
                agent(
                    "You can ask for a full refund within 30 days of buying. After that, refunds are only given for unused annual plans, pro rata.",
                ),
            ],
        },
        {
            // Handed back: the agent carries on with what the owner promised.
            state: "ai",
            handoffReason: "visitor_requested",
            lastMessageMinutesAgo: 140,
            visitor: {
                country: "Ireland",
                city: "Dublin",
                timezone: "Europe/Dublin",
                language: "en-IE",
                device: "Desktop",
                browser: "Chrome 141",
                os: "Linux",
                page: "https://demo.vassist.app/account/orders",
                visitCount: 8,
                firstSeenDaysAgo: 31,
            },
            messages: [
                visitor("My last invoice charged me twice. I need a person.", {
                    classification: "human_request",
                }),
                notice("handoff", HANDOFF_NOTICE),
                joined,
                owner(
                    "Sorry about that. I can see the duplicate charge and I've refunded **$20** to your card. It should show within 3 business days.",
                    0.5,
                ),
                visitor("Great, thank you.", { after: 3 }),
                notice("hand_back", HAND_BACK_NOTICE, 1),
                visitor("One more thing: where do I download the invoice?", {
                    after: 6,
                }),
                agent(
                    "Open **Account → Orders**, choose the order and select **Download invoice**. The corrected invoice will show the $20 refund you were promised.",
                ),
            ],
        },
        {
            state: "human",
            handoffReason: "visitor_requested",
            lastMessageMinutesAgo: 12,
            visitor: {
                country: "France",
                city: "Paris",
                timezone: "Europe/Paris",
                language: "fr-FR",
                device: "Desktop",
                browser: "Firefox 143",
                os: "macOS 15",
                page: "https://demo.vassist.app/account/billing",
                referrer: "https://www.google.fr/",
                visitCount: 7,
                firstSeenDaysAgo: 15,
            },
            messages: [
                visitor("Can I get a refund for last month?"),
                agent(
                    "Refunds are available within 30 days of buying. When was the payment taken?",
                ),
                visitor("I'd rather talk to a human about this please.", {
                    classification: "human_request",
                    after: 1,
                }),
                notice("handoff", HANDOFF_NOTICE),
                joined,
                owner(
                    "Hi! Happy to look into it. Could you give me the email on the account?",
                    0.5,
                ),
                visitor("It's under claire@example.com.", { after: 2 }),
                visitor("The charge was on the 3rd.", { after: 1 }),
            ],
        },
        {
            // The owner stepped in while the agent was handling it.
            state: "human",
            lastMessageMinutesAgo: 45,
            visitor: {
                country: "Netherlands",
                city: "Amsterdam",
                timezone: "Europe/Amsterdam",
                language: "nl-NL",
                device: "Desktop",
                browser: "Chrome 141",
                os: "macOS 15",
                page: "https://demo.vassist.app/pricing",
                visitCount: 2,
                firstSeenDaysAgo: 3,
            },
            messages: [
                visitor("Is there a discount for non-profits?"),
                agent(
                    "Registered non-profits get 30% off any plan. You can apply from the billing page.",
                ),
                joined,
                owner(
                    "Jumping in here: if you email us your registration number today, I can apply it before your trial ends.",
                    0.5,
                ),
            ],
        },
        {
            state: "closed",
            lastMessageMinutesAgo: 60 * 26,
            visitor: {
                country: "Spain",
                city: "Madrid",
                timezone: "Europe/Madrid",
                language: "es-ES",
                device: "Mobile",
                browser: "Chrome 141",
                os: "Android 16",
                page: "https://demo.vassist.app/es/envios",
                visitCount: 1,
                firstSeenDaysAgo: 1,
            },
            messages: [
                visitor("¿Cuánto tarda el envío a España?"),
                agent(
                    "Los pedidos a España suelen llegar en 3 a 5 días laborables.",
                ),
                visitor("Perfecto, gracias.", {
                    classification: "small_talk",
                    after: 1,
                }),
                agent("¡De nada! Que tengas un buen día."),
                notice("closed", CLOSED_NOTICE, 60 * 24),
            ],
        },
        {
            state: "closed",
            handoffReason: "low_confidence",
            lastMessageMinutesAgo: 60 * 24 * 3,
            visitor: {
                country: "Japan",
                city: "Tokyo",
                timezone: "Asia/Tokyo",
                language: "ja-JP",
                device: "Desktop",
                browser: "Chrome 141",
                os: "Windows 11",
                page: "https://demo.vassist.app/docs/api",
                referrer: "https://github.com/",
                visitCount: 6,
                firstSeenDaysAgo: 40,
            },
            messages: [
                visitor("Does the export API have a rate limit?"),
                agent(
                    "I'm not certain about the limit for exports, so I'm asking a person to confirm.",
                ),
                notice("handoff", HANDOFF_NOTICE),
                joined,
                owner(
                    "Exports are limited to 10 requests a minute per workspace. Let me know if you need more and we can raise it.",
                    0.5,
                ),
                visitor("That's plenty. Thanks!", { after: 5 }),
                notice("closed", CLOSED_NOTICE, 12),
            ],
        },
        {
            // A visitor whose details could not be read.
            state: "ai",
            lastMessageMinutesAgo: 60 * 5,
            visitor: { visitCount: 1, firstSeenDaysAgo: 0 },
            messages: [
                visitor("do you have a student plan"),
                agent(
                    "Yes. Students get the Starter plan free for a year with a valid university email address.",
                ),
            ],
        },
    ];
}

const MINUTE = 60_000;
const iso = (time: number) => new Date(time).toISOString();

async function main() {
    const branch = (process.env["NEON_BRANCH"] ?? "").trim().toLowerCase();
    if (branch === "production" || process.env["NODE_ENV"] === "production") {
        throw new Error("The seed script never runs against production.");
    }
    const email = process.argv.slice(2).find((arg) => arg !== "--");
    if (!email) {
        throw new Error(
            "Pass the owner's email: pnpm --filter @vassist/db db:seed -- owner@example.com",
        );
    }

    const db = getDb();
    // `neon_auth` is Neon's schema: read here, never written.
    const users = (await db.runtime().query(
        db.raw.sql`
            select id, name from neon_auth."user"
            where lower(email) = lower(${email})`
            .returnsRow({ id: "pg/uuid@1", name: "pg/text@1" })
            .build(),
    )) as unknown as { id: string; name: string }[];
    const user = users[0];
    if (!user) throw new Error(`No account has the email ${email}.`);

    const member = await db.orm.public.Member.where({ userId: user.id })
        .select("id", "workspaceId")
        .include("workspace", (workspace) =>
            workspace.select("name", "greeting"),
        )
        .first();
    if (!member?.workspace) {
        throw new Error(`${email} has not created a workspace yet.`);
    }
    const { workspaceId } = member;

    const removed = await db.orm.public.Visitor.where({ workspaceId })
        .where((row) => row.tokenHash.isNull())
        .deleteAndCount();

    const now = Date.now();
    const seeds = conversations(user.name);
    for (const seed of seeds) {
        const lastMessageAt = now - seed.lastMessageMinutesAgo * MINUTE;
        // Work backwards from the last message to place the others.
        const times: number[] = [];
        let cursor = lastMessageAt;
        for (let index = seed.messages.length - 1; index >= 0; index--) {
            times[index] = cursor;
            cursor -= (seed.messages[index]?.after ?? 1) * MINUTE;
        }
        const createdAt = cursor - 0.2 * MINUTE;
        const firstSeenAt = Math.min(
            createdAt - MINUTE,
            now - (seed.visitor.firstSeenDaysAgo ?? 0) * 24 * 60 * MINUTE,
        );

        const createdVisitor = await db.orm.public.Visitor.create({
            workspaceId,
            country: seed.visitor.country ?? null,
            city: seed.visitor.city ?? null,
            timezone: seed.visitor.timezone ?? null,
            language: seed.visitor.language ?? null,
            device: seed.visitor.device ?? null,
            browser: seed.visitor.browser ?? null,
            os: seed.visitor.os ?? null,
            page: seed.visitor.page ?? null,
            referrer: seed.visitor.referrer ?? null,
            visitCount: seed.visitor.visitCount ?? 1,
            firstSeenAt: iso(firstSeenAt),
            lastSeenAt: iso(lastMessageAt),
        });
        const conversation = await db.orm.public.Conversation.create({
            workspaceId,
            visitorId: createdVisitor.id,
            state: seed.state,
            handoffReason: seed.handoffReason ?? null,
            lastMessageAt: iso(lastMessageAt),
            createdAt: iso(createdAt),
            closedAt: seed.state === "closed" ? iso(lastMessageAt) : null,
        });
        await db.orm.public.Message.createAndCount([
            {
                workspaceId,
                conversationId: conversation.id,
                author: "system" as const,
                notice: "greeting" as const,
                body: member.workspace.greeting,
                createdAt: iso(createdAt),
            },
            ...seed.messages.map((message, index) => ({
                workspaceId,
                conversationId: conversation.id,
                author: message.author,
                memberId: message.author === "member" ? member.id : null,
                notice: message.notice ?? null,
                body: message.body,
                classification: message.classification ?? null,
                declined: message.declined ?? false,
                createdAt: iso(times[index] ?? lastMessageAt),
            })),
        ]);
    }

    console.log(
        `Seeded ${seeds.length} conversations into "${member.workspace.name}" (removed ${removed} seeded visitors from before).`,
    );
}

main().then(
    () => process.exit(0),
    (error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    },
);
