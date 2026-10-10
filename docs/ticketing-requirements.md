# Chak as an IT ticketing system: requirements

Status: requirements only (output of `/sc:brainstorm`, 2026-10-06). Next step: `/sc:design`. Where the
dashboard lives, data storage, and API contracts are design decisions and are not settled here.

Covers both repos (`ada-agent`, the Worker, and `ada-agent-fe`, this front end), plus whatever new surface the
dashboard needs.

---

## 1. Goals

**Turn Chak from a chat demo into an IT ticketing system with its own dashboard.** Employees still report problems
by talking to Chak. IT staff work those tickets in a dashboard: they triage, assign, reply, and resolve.

**Demo first, real later.** The first release is a public demo with seeded data. No decision may block running it
for real inside a company later: real sign-in, real employees, and real ticket data.

**Scope stays IT only** (decided 2026-10-06). There are no HR, Docs, or other departments.

**Principles carried over from the current build:**

- **Chak shows his work.** Every action Chak takes on a ticket is visible, and attributed to Chak and the person he
  acted for.
- **Code owns policy.** Jev and the model give judgments. Code decides who may do what, and code sets the priority.
- **Permissions are enforced in code, never by the model.** This is how `filedBy` works today: the router sets it,
  not the model.
- **Fail open on Jev, never on permissions.** A TypeSafe outage still lets tickets through. A permission check never
  fails open.

## 2. Users and roles

| Role | Who | Can |
| --- | --- | --- |
| Employee | Anyone who files tickets | See and follow **their own** tickets only. File, add details, and close by chat. Rate a resolved ticket. |
| IT agent | Technicians | Work tickets in their teams' queues: claim, reply, write internal notes, change status, override triage. |
| IT lead | Runs one or more teams | Everything an agent can do, plus assign and reassign, and see their teams' workload. |
| Admin | Configures the system | Users and roles, teams, category-to-queue mapping, response targets, canned replies, the knowledge base. |

One person can hold more than one role. An agent is also an employee when their own laptop breaks.

## 3. Scope

### In the first release

| Area | Summary |
| --- | --- |
| Identity | Company SSO for real users. Demo mode with a role switcher for public visitors. |
| Tickets | Thread (replies and internal notes), full status lifecycle, history log |
| Queues | One queue per triage category. Agents pull from the queue; leads can assign. |
| Employee view | "My tickets": status, thread, reply, close, rate |
| Chak, intake | Files tickets under the signed-in employee. Offers the knowledge base before filing. |
| Chak, chat actions | Add details to, and close, the employee's own tickets |
| Chak, agent assist | Summarize a ticket. Suggest a reply for the agent to edit. |
| Response targets | First-response and resolution targets per priority, with countdowns and warnings |
| Knowledge base | Articles Chak and agents use |
| Canned replies | Saved templates agents insert |
| Satisfaction rating | Employee rates a resolved ticket |
| Triage overrides | Agents change category or priority. Every change is logged against Jev's original answer. |

### Later, not in the first release

- Notifications (email and in-app alerts for assignments, replies, and target breaches)
- Reports (volume, backlog, response and resolution times, triage accuracy)
- Asset inventory (devices linked to people and tickets)
- Email intake (email creates a ticket, and email replies join its thread)
- Agent assist: similar past tickets, and drafting a KB article from a resolved ticket
- By chat: reopening a ticket, and asking for a higher priority

### Out of scope

- HR, Docs, or any non-IT department (§1)
- Chak sending anything to an employee on an agent's behalf without the agent sending it
- Chak doing the IT work itself (resetting passwords, unlocking accounts). He files and tracks; people fix.

## 4. Functional requirements

### 4.1 Identity and access

- **ID.1** Real users sign in with company SSO. The provider is open question Q1.
- **ID.2** A ticket belongs to a **person**, not a conversation. `filedBy` becomes the signed-in user, and Chak's
  `list_my_tickets` lists that person's tickets in every conversation.
- **ID.3** Roles (§2) are checked on the server for every read and every write. Hiding something in the UI doesn't
  count as a check.
- **ID.4** An employee can never see, or have Chak reveal, another person's ticket. This includes `lookup_ticket`: an
  employee looking up a ticket they did not file gets "not found or not yours", never its contents.
- **ID.5** Every Chak action on a ticket runs with the signed-in employee's permissions, and is enforced in code.
  The model cannot widen them, whatever the message says.

### 4.2 Demo mode

- **DM.1** A public visitor can try every role without signing in: a role switcher offers employee, agent, lead, and admin.
- **DM.2** Demo data is seeded: employees, agents, teams, tickets in every status, knowledge base articles, and
  canned replies. The existing fixtures, tickets 42 and 77, stay.
- **DM.3** Demo data and real data never mix. A demo visitor cannot reach a real ticket, and a real user never sees
  demo data.
- **DM.4** The demo states that it is a demo, on every screen.
- **DM.5** How visitors' changes are isolated (one shared sandbox reset on a schedule, or one sandbox per visitor)
  is open question Q2.

### 4.3 Tickets

- **TK.1 Lifecycle.** New (unassigned) → In progress → Waiting on employee → Resolved → Closed. An agent can move a
  ticket back from Resolved to In progress.
- **TK.2** An agent replying with "waiting on employee" moves the ticket to that status. The employee replying moves
  it back to In progress.
- **TK.3** A Resolved ticket closes on its own after a set time if the employee does nothing. They can also close it
  themselves or rate it. The time is open question Q8.
- **TK.4 Thread.** Two kinds of message: a **reply**, which the employee sees, and an **internal note**, which only IT
  staff see. Each message shows its author, its time, and whether it came through Chak.
- **TK.5 History.** Every change is recorded with who made it, when, and the old and new values: status, assignee,
  queue, category, priority. Changes Chak makes for an employee read "Chak, for {employee}".
- **TK.6** Existing tickets, and tickets filed before this release, still open and look up correctly, as triage
  required before them (F3.6 in `ada-agent/docs/jev-requirements.md`).

### 4.4 Queues and assignment

- **QA.1** Each triage category (hardware, network, access, software, security, other) maps to a team queue. `other`
  maps to a general service-desk queue. Admins can change the mapping.
- **QA.2** A new ticket lands **unassigned** in its queue. Agents claim tickets from their teams' queues.
- **QA.3** Leads can assign or reassign any ticket in their teams. Every assignment is recorded in the history (TK.5).
- **QA.4** An untriaged ticket (`priority: null`) goes to the service-desk queue and is marked untriaged, so a person
  can set its category and priority.
- **QA.5** Agent views: unassigned in my teams, assigned to me, my teams, and all. Each can be filtered by status,
  priority, category, and time left on the target (§4.7), and searched by id, title, and employee.
- **QA.6** Who can see security-category tickets is open question Q6.

### 4.5 Triage overrides

- **TR.1** An agent can change a ticket's category or priority.
- **TR.2** Every override records Jev's original answer and its confidence, the new value, who changed it, and when.
  These records are the real-traffic data needed to tune the Jev thresholds (requirements §6 in
  `ada-agent/docs/jev-requirements.md`).
- **TR.3** After an override, the ticket uses the human value everywhere: queue, response target, and display. Jev's
  original value stays visible in the history.
- **TR.4** Jev triage still runs on every new ticket, as it does today, including the hold rule.

### 4.6 Chak in chat (employee side)

- **CH.1 Intake.** As today: Chak files, triages, and holds tickets, with the ticket now owned by the signed-in
  employee (ID.2).
- **CH.2 Knowledge base first.** When a published article covers the problem, Chak gives its fix and asks whether it
  worked. If it didn't, or if the employee asks for a ticket, he files one, and the ticket records which article was
  tried. He never refuses to file because an article exists.
- **CH.3 Add details.** An employee can add information to one of their own open tickets ("it happens on Wi-Fi
  too"). It is added to the thread as a reply from the employee, through Chak.
- **CH.4 Close.** An employee can close one of their own tickets ("never mind, it works now"). Chak confirms which
  ticket before closing it.
- **CH.5 What Chak declines:**
  - Changing priority: agents set it.
  - Reopening: the default is to file a new ticket linked as related to the old one. See Q5.
  - Assigning, or acting on someone else's ticket.
- **CH.6** Everything the employee asks for is checked against the tool results by `jev.verify_answer` as today. A
  claim that a ticket was closed or updated must be backed by a tool result (`unconfirmed_action`).
- **CH.7** Chak can tell an employee what changed on their tickets since they last asked: a new reply, a status
  change, or a resolution. This stands in for notifications until those exist (Q11).

### 4.7 Response targets

- **SLA.1** Each priority (P1–P4) has two targets: time to first response and time to resolution. Admins set them.
  The values are open question Q7.
- **SLA.2** The first-response clock stops at the first agent **reply**. An internal note doesn't stop it.
- **SLA.3** The resolution clock pauses while a ticket is Waiting on employee.
- **SLA.4** Queues and tickets show time left. A ticket nearing its target, and a ticket past it, are marked
  differently, and both can be filtered (QA.5).
- **SLA.5** A priority override (TR.3) recalculates the targets from the ticket's creation time.

### 4.8 Agent assist

- **AA.1 Summary.** On any ticket, an agent can ask Chak for a short summary: the problem, what has been tried, and
  what is still needed.
- **AA.2 Suggested reply.** An agent can ask for a draft reply that draws on knowledge base articles and canned
  replies. The draft goes into the agent's editor. **It is never sent automatically.** The agent edits it and sends
  it as themselves.
- **AA.3** Both show their sources: which thread messages, articles, and canned replies they used. This applies the
  "shows his work" principle to the dashboard.
- **AA.4** Assist runs only when an agent asks for it. Nothing generates in the background on every ticket.
- **AA.5** Assist never sees tickets the agent can't see.

### 4.9 Knowledge base

- **KB.1** Articles have a title, a body, a category, and a status: draft or published. Only published articles reach
  Chak or employees.
- **KB.2** Who writes articles and who publishes them is open question Q9.
- **KB.3** Chak uses published articles for CH.2 and AA.2. When Chak answers from an article, the answer check must
  treat that article as a source, so the advice isn't flagged as unsupported.
- **KB.4** A ticket records any article Chak suggested before filing it.

### 4.10 Canned replies

- **CR.1** Saved reply templates, each with a title, a body, and an optional category. Leads and admins manage them.
- **CR.2** An agent inserts one into the reply editor and edits it before sending. Placeholders such as the
  employee's first name and the ticket id are filled in.
- **CR.3** Suggested replies (AA.2) can draw on them.

### 4.11 Satisfaction rating

- **CS.1** When a ticket is resolved, the employee is asked to rate the fix on a single scale (Q10 decides which),
  with an optional comment. They can answer in the dashboard or to Chak.
- **CS.2** The rating is shown on the ticket and recorded in its history.
- **CS.3** Where leads see ratings before reports exist is open question Q10.

## 5. User stories and acceptance criteria

**Employee files through chat.** "As an employee, I tell Chak what's wrong and get a ticket I can follow."

- Signed in as Dana: "My VPN keeps dropping every few minutes, please file a ticket." A ticket is filed under Dana,
  with category network, in the network queue, unassigned, and with a priority and a response-target countdown. It
  appears in Dana's "My tickets". The trace shows triage above `create_ticket`, as today.
- "Create me a ticket," with no problem described, is still held (Phase 3's hold rule).

**Knowledge base first.**

- Dana: "How do I connect to the VPN from home?" A published VPN article exists, so Chak gives its steps and asks
  if they worked. Dana: "No, it still fails." Chak files a ticket, and the ticket records the article.
- Dana: "Just file a ticket, I already tried the guide." Chak files without repeating the article.

**Only your own tickets.**

- Dana asks Chak to close ticket 42, which Sam filed. Nothing changes. Chak says it isn't Dana's ticket, and the
  trace shows the refusal.
- Dana: "Look up ticket 42." Chak gives no contents. He says it was not found or is not hers.

**Priority stays with IT.**

- Dana: "Make my ticket P1, it's urgent." Chak declines, explains that IT sets priority, and offers to add her reason
  to the ticket.

**Agent works the queue.**

- An agent on the network team sees Dana's ticket under "unassigned in my teams", claims it, writes an internal
  note, then sends a reply. Dana sees only the reply. The first-response clock stops at the reply, not the note.
- The agent sets the ticket to Waiting on employee, and the resolution clock pauses until Dana replies.

**Triage override.**

- The agent changes priority from P3 to P1. The queue and target update. The history shows P3 → P1, the agent's
  name, and Jev's original urgency and its confidence.

**Agent assist.**

- On a ticket with a twelve-message thread, the agent clicks Summarize and gets the problem, what has been tried,
  and what is still needed, with the messages it drew on.
- The agent clicks Suggest reply. A draft citing the VPN article appears in the editor, unsent. The agent edits it
  and sends it, and the thread shows the agent as the author.

**Resolution.**

- The agent resolves Dana's ticket. Dana is asked to rate it, in the dashboard or by Chak the next time she chats.
  If she does nothing for the set time (Q8), the ticket closes.

**Demo mode.**

- A visitor with no account opens the demo, switches to "agent", works a seeded ticket, then switches to "employee"
  and sees that ticket's reply. No real ticket can be reached.

## 6. Non-functional requirements

- **Security.**
  - Permissions are checked on the server on every request (ID.3).
  - Chak's tools take the acting user from the session, never from model arguments (ID.5).
  - Demo and real data are isolated (DM.3).
  - The history log is append-only.
- **Privacy.** For real use, real employee data goes to Workers AI and TypeSafe. TypeSafe offers zero data retention
  on enterprise plans only. Before going live this needs a decision (Q12). In demo mode, everything is seeded data.
- **Reliability.**
  - The dashboard works when the model or TypeSafe is down: agents can still work tickets.
  - Jev keeps failing open, so a TypeSafe outage files tickets untriaged (QA.4).
  - If Chak can't file, the employee has another way to file (Q4).
- **Accessibility.** WCAG 2.2 AA, matching this page. The queue and ticket views can be used entirely by keyboard.
- **Devices.** Employees use chat and "My tickets" on phones, so the mobile rules in `docs/design/mobile.md` apply.
  Agents and leads mainly use desktop. Their views must work at tablet width, but phone optimization can wait.
- **Time.** Response targets are calculated on the server, in one configured time zone. Business hours are part of
  Q7.
- **Scale.** Plan for a mid-sized company, which is what Chak's system prompt says. Exact figures are Q13.
- **Design system.** The dashboard follows the existing look (Q14).

## 7. Suggested release order

A recommendation for `/sc:design` to confirm or change. Each step is usable on its own.

1. **Foundation:** identity (SSO and demo mode), roles, the ticket lifecycle, the thread, the history, queues and
   claiming, "My tickets", and Chak filing under a person and closing and adding details by chat.
2. **Working the queue well:** response targets, triage overrides, and canned replies.
3. **Chak helps more:** the knowledge base, knowledge base first in chat, and agent assist (summary and suggested
   reply).
4. **Closing the loop:** the satisfaction rating, and what changed since you last asked (CH.7).

## 8. Open questions

1. **SSO provider.** Google Workspace, Microsoft 365, or both?
2. **Demo isolation.** One shared sandbox reset on a schedule, or a private sandbox per visitor?
3. **Where the dashboard lives.** Part of this page, a separate app, or both sharing a backend? The current page is a
   single route by design. Decide in `/sc:design`.
4. **A form for filing.** Should employees have a plain "new ticket" form for when Chak is unavailable or they prefer
   it? Recommended, at least as a fallback.
5. **Reopening.** Reopening by chat wasn't chosen. When a problem comes back, should Chak file a new ticket linked as
   related to the old one (the current default), or should employees be able to reopen in the dashboard?
6. **Security tickets.** Visible to every agent, or only to the security team?
7. **Target values.** First-response and resolution targets for P1–P4, and whether they count business hours or run
   24/7.
8. **Auto-close.** How long a Resolved ticket waits before it closes on its own.
9. **Knowledge base roles.** Who writes articles and who publishes them: agents, leads, or admins? How many seeded
   articles does the demo need?
10. **Ratings.** Which scale (thumbs or 1–5)? Where do leads see ratings, and triage overrides, before reports exist?
    The ticket only, or a simple list?
11. **Without notifications.** Is it acceptable that people learn about replies only in the dashboard or from Chak
    (CH.7)?
12. **Privacy for real use.** Is sending real employee data to Workers AI and TypeSafe acceptable, and on which
    TypeSafe plan?
13. **Scale.** Roughly how many employees, agents, and tickets per month to plan for?
14. **Design system.** Does the dashboard use the locked theme as is? The accent color has exactly four jobs, and a
    dashboard needs status and target colors, which would mean extending the token set.
15. **Conversation history.** With sign-in, should chat history follow the person across devices instead of living
    in the browser's localStorage?
