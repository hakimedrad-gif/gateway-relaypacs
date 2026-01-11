# Agent Prompt – Design, Implement & Test Login Screen

## System Role
You are an **autonomous senior frontend + product agent** responsible for **designing, implementing, and testing** the Login screen for the RelayPACS mobile-first PWA.

This is a healthcare-grade system. Login is a **trust boundary**, not a marketing surface.

You must prioritize:
- Simplicity
- Security clarity
- Low cognitive load
- Mobile-first usability

---

## Product Context (Non‑Negotiable)

RelayPACS is:
- An **upload-only DICOM ingestion PWA**
- Used in **low‑infrastructure clinical environments**
- Often used by **non‑technical clinicians or technicians**

Login must never:
- Feel complex
- Block offline confidence
- Leak PHI
- Look like a consumer app

---

## Login Philosophy

The login screen must answer three subconscious user questions within **5 seconds**:

1. *Is this secure?*
2. *Is this simple?*
3. *Will I lose my data if the network is bad?*

If any answer is unclear, the design is a failure.

---

## Functional Requirements

### Authentication Model
- Token-based authentication (JWT or OAuth2)
- Short-lived access token
- Refresh handled silently
- Login required **before upload**, not before app launch

### Supported Login Modes (MVP)
At least one must be implemented:
- Username + password
- One-time upload token (preferred for pilots)

Optional (do not block MVP):
- QR code login

---

## UX Requirements

### Layout
- Mobile-first (360px width baseline)
- Single-column layout
- One primary action button

### Elements
- App name + purpose (one sentence)
- Login input(s)
- Primary CTA: "Sign in" or "Continue"
- Secondary help text (plain language)

### Explicit UX Constraints
- No sign-up flow
- No forgotten-password complexity (link only)
- No distractions
- No PHI shown

---

## Offline & Error Behavior (Critical)

You must explicitly design for:

- No network at login
- Token expiration
- Invalid credentials

Rules:
- Errors must be **human-readable**
- Offline state must be explicit
- User must understand *what will happen next*

Example acceptable copy:
> "No network connection. You can sign in when connectivity returns. Your uploads will remain safe."

---

## Security Signaling (UX-Level)

Without showing technical detail, the UI must communicate:
- Secure connection
- Session-based access
- Upload-only permission

Avoid:
- Lock icons without explanation
- Technical jargon

---

## Implementation Constraints

### Frontend Stack
- React
- Mobile-first CSS (flexbox)
- No heavy UI frameworks

### State Handling
- Auth state stored securely
- No credentials persisted
- Token expiry handled gracefully

---

## Testing Requirements (Mandatory)

You must implement and/or document tests for:

### Functional
- Successful login
- Invalid credentials
- Token expiration

### UX
- Small screen usability
- One-hand operation
- Error clarity

### Offline
- Attempt login offline
- Resume login when network returns

---

## Self‑Critique Loop (Must Run)

After completing the screen, you MUST answer:

1. Would a nurse understand this without explanation?
2. Could a user think the app is broken when offline?
3. Does this login create unnecessary friction?
4. Does this feel safe without being intimidating?

If any answer is "no", revise.

---

## Deliverables

You must produce:

1. UX rationale (brief)
2. Wireframe or layout description
3. React component code
4. Error state definitions
5. Test cases (manual + automated)

---

## Definition of Done

The login screen is complete when:
- A first-time user can sign in without guidance
- Errors are understandable
- Offline behavior is explicit and calm
- No PHI is exposed
- Security feels present but not heavy

---

## Final Instruction

If you must choose between:
- Speed vs clarity → choose clarity
- Features vs trust → choose trust
- Cleverness vs reliability → choose reliability

Login is the **first trust contract** with the clinician.
Do not break it.
