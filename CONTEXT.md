# VAssist

Customer support chat that a business embeds on its website, where visitors talk to an AI agent grounded in the business's own knowledge base, or to the business's owner.

## Language

### People

**Visitor**:
An anonymous person using the widget on a workspace's website. Never logs in and is never asked for a name or email.
_Avoid_: Customer, user, end user, lead

**Owner**:
The person who signed up. Exactly one workspace is created for them, and in v1 they are its only member: they manage the knowledge base and the widget, and read, answer and close conversations.
_Avoid_: Admin, operator, staff, human agent

**Member**:
A logged-in person who belongs to a workspace. Stored separately from the workspace so v2 can add teams; in v1 the only member is the owner.
_Avoid_: User, teammate, seat

**Agent**:
The automated responder that answers visitors from the workspace's knowledge base. Shown to visitors as "{Workspace name} Agent" by default. A person is never called an agent.
_Avoid_: Bot, chatbot, assistant

### Tenancy

**Workspace**:
One business's isolated space, holding its members, knowledge base, widget settings and conversations.
_Avoid_: Organization, account, tenant, company

### Visitors

**Visitor token**:
The signed token stored in the visitor's browser that identifies them to one workspace and lets them keep their conversation across reloads.
_Avoid_: Session, cookie, visitor id

**Visitor details**:
The anonymous context captured about a visitor: country and city, timezone and local time, language, device, browser, OS, page, referrer, first seen, last seen and visit count. The raw IP is never stored.
_Avoid_: Profile, contact

### Widget and dashboard

**Widget**:
The visitor's chat UI, loaded in an iframe on the workspace's website. One workspace has one widget.
_Avoid_: Chatbox, messenger

**Snippet**:
The single `<script>` tag the owner pastes into their website to install the widget.

**Embed script**:
The small loader the snippet points at, which injects the launcher bubble and the widget iframe.
_Avoid_: Loader, SDK

**Allowed domain**:
A hostname the owner has listed where the widget may load.
_Avoid_: Whitelist, origin

**Dashboard**:
The owner's UI for conversations, the knowledge base and settings.
_Avoid_: Admin panel, inbox (for the whole app)

**Greeting**:
The first message the widget shows when opened, set by the owner.
_Avoid_: Welcome message

**Suggested questions**:
Up to four questions generated from the knowledge base and shown as chips under the greeting until the visitor's first message.
_Avoid_: Quick replies, prompts, starters

### Conversations

**Conversation**:
One thread of messages between a visitor and a workspace, answered by the agent or the owner. A visitor has at most one open conversation at a time.
_Avoid_: Chat, thread, ticket, session

**State**:
The single field that says who replies in a conversation: `ai` (the agent), `waiting` (nobody yet), `human` (the owner only) or `closed` (resolved). `ai`, `waiting` and `human` are the open states.
_Avoid_: Status (that word belongs to sources)

**Message**:
One entry in a conversation, authored by the visitor, the agent, a member, or the system.

**System message**:
A message authored by neither side: the greeting, and notices such as hand-back and closing.

**Handoff**:
Moving a conversation from the agent to `waiting` because the agent can't answer, the visitor asked for a person, or the agent is off.
_Avoid_: Escalation, transfer

**Handoff reason**:
Why a conversation moved to `waiting`: `low_confidence`, `no_relevant_knowledge`, `visitor_requested` or `agent_off`.

**Take over**:
The owner moving a conversation in `ai` or `waiting` to `human`, explicitly or just by sending a reply.
_Avoid_: Claim, assign

**Hand back**:
The owner returning a `human` conversation to the agent with the "Hand to agent" button.
_Avoid_: Release, unassign

**Close**:
Ending a conversation, by the owner from any open state or automatically after 24 hours without messages. The visitor's next message starts a new conversation.
_Avoid_: Resolve, archive

### Agent behavior

**Classification**:
The label given to every visitor text message in the `ai` state before anything else happens: support question, small talk, off-topic, or request for a human.
_Avoid_: Intent, category

**Support question**:
A message about the business or its product, answered from the knowledge base.

**Small talk**:
A greeting or pleasantry, answered briefly without searching the knowledge base.

**Off-topic**:
A message unrelated to support, including manipulation attempts. It gets a refusal.

**Request for a human**:
A message asking for a person. It triggers a handoff with `visitor_requested`.

**Refusal**:
The agent's short, polite reply to an off-topic message, given without retrieval or the answer model. The message it answers is marked as declined.
_Avoid_: Reject, block

**Agent off**:
The agent's condition while the knowledge base has no ready sources. There is no switch: new conversations start in `waiting`.
_Avoid_: Disabled, paused

**Agent turn**:
The logged record of one agent reply: its classification, retrieved chunk ids and scores, model, token counts and latency.

### Knowledge

**Knowledge base**:
The set of sources a workspace has added for the agent to answer from.
_Avoid_: Docs, corpus

**Source**:
One item in the knowledge base: an uploaded file (PDF, Markdown or TXT) or a text source.
_Avoid_: Document, knowledge file

**Text source**:
A source made of a title plus text written in the dashboard. It can be edited, and saving re-processes it.

**Source status**:
Where a source is in processing: `uploaded`, `processing`, `ready`, or `failed` with a readable reason.
_Avoid_: State (that word belongs to conversations)

**Chunk**:
A passage cut from a source, stored with its embedding. The unit the agent retrieves and answers from.

### Real time

**Room**:
A PartyKit channel that delivers events: one per conversation (to the visitor and the owner viewing it) and one per workspace (inbox updates and notifications to the owner).
_Avoid_: Channel, topic

**Realtime token**:
The 60-second token minted by the web app that is used only to open a socket to a room.
