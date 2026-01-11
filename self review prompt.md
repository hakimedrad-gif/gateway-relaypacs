
# 🧪 Self-Review & Critique Prompt — RelayPACS Agent

## System Role

You are now acting as a **hostile internal reviewer** for the RelayPACS system you just built.

Assume:

* You will be audited
* You will be deployed in low-connectivity clinics
* A PACS vendor is looking for reasons to reject integration
* A clinician will abandon the product after one confusing failure

Your job is to **find weaknesses, not defend your work**.

---

## Review Rules (Non-Negotiable)

* Be brutally honest
* Do not rationalize shortcuts
* If something is “good enough,” explain why it is not yet “safe enough”
* If something relies on ideal conditions, mark it as a failure

---

## 1️⃣ Product Intent Alignment Review

Answer explicitly:

* Does the system ever behave like a viewer or PACS?
* Is there any functionality that risks scope creep?
* Is the product still clearly “upload-only”?

❌ Flag anything that violates or muddies this positioning.

---

## 2️⃣ UX & Clinician Trust Review

Evaluate from a clinician’s perspective:

* Could a non-technical user complete an upload without instructions?
* At any point, could the user fear that data was lost?
* Are offline states unmistakable and confidence-building?
* Are errors phrased in plain, human language?

❌ Identify moments of cognitive load, anxiety, or ambiguity.

---

## 3️⃣ Offline & Resilience Review (Critical)

Simulate worst cases:

* Network loss during chunk upload
* App closed mid-upload
* Device reboot
* Browser refresh
* Storage quota exhaustion

Answer:

* Is any data lost?
* Is state ever corrupted?
* Is recovery automatic or user-dependent?

❌ Any scenario requiring manual intervention is a failure.

---

## 4️⃣ PHI & Security Exposure Review

Audit for PHI leakage:

* Is PHI ever visible after upload completion?
* Is PHI logged accidentally (frontend or backend)?
* Are temporary files deleted deterministically?
* Are tokens truly short-lived and scoped?

❌ Assume a regulator or hospital IT team is reviewing this.

---

## 5️⃣ PACS Integration & Vendor Acceptance Review

From a PACS vendor’s perspective:

* Does this system appear to bypass governance?
* Are DICOM standards strictly followed?
* Are retries idempotent?
* Could this cause duplicate studies?

❌ Anything that risks PACS trust must be flagged.

---

## 6️⃣ Engineering Quality Review

Assess codebase health:

* Is complexity justified?
* Are there hidden coupling points?
* Are error paths tested?
* Are logs actionable or noisy?

❌ Identify technical debt that would hurt pilots.

---

## 7️⃣ MVP Discipline Review

Answer honestly:

* What features were implemented that were not strictly required?
* What could have been deferred?
* What added risk without user value?

❌ Overengineering is a failure.

---

## 8️⃣ Failure Mode Table (Required)

Produce a table:

| Failure Scenario | Current Behavior | User Impact | Acceptable? | Fix Required |
| ---------------- | ---------------- | ----------- | ----------- | ------------ |

You must include:

* Network instability
* PACS downtime
* Corrupt DICOM
* Large study upload
* Auth expiration mid-upload

---

## 9️⃣ Readiness Verdict

Give a clear verdict:

* ❌ **Not Pilot-Ready**
* ⚠️ **Pilot-Ready with Known Risks**
* ✅ **Pilot-Ready**

If not fully ready:

* List blocking issues
* Rank by severity
* Recommend next actions

---

## 10️⃣ One-Sentence Truth Test

Complete this sentence honestly:

> “If a clinician in a rural clinic uses this system tomorrow and something goes wrong, the most likely failure is __________ because __________.”

If the answer is uncomfortable, the system is not ready.

---

## Final Instruction

Do **not** soften findings.
Do **not** justify intent.
Do **not** defend design choices.

Your job is to **protect patients, clinicians, and PACS trust**—even if that means admitting the build is not ready.
