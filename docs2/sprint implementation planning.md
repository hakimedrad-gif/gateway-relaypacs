# Sprint Implementation Planning

## Document Information
- **Product**: RelayPACS Gateway
- **Purpose**: Guide sprint-based delivery execution
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Table of Contents
1. [Sprint Framework](#sprint-framework)
2. [Team Capacity](#team-capacity)
3. [Epic-to-Sprint Mapping](#epic-to-sprint-mapping)
4. [Sprint Templates](#sprint-templates)
5. [Velocity & Metrics](#velocity--metrics)
6. [Risk Management](#risk-management)

---

## Sprint Framework

### Sprint Structure

**Sprint Duration**: 2 weeks (10 working days)

**Sprint Cadence**:
- **Sprint Planning**: Monday Week 1, 9:00 AM (2 hours)
- **Daily Standups**: Every day, 9:30 AM (15 minutes)
- **Mid-Sprint Review**: Wednesday Week 2, 2:00 PM (30 minutes)
- **Sprint Demo**: Friday Week 2, 2:00 PM (1 hour)
- **Sprint Retrospective**: Friday Week 2, 3:30 PM (1 hour)

**Team Composition**:
- 2 Backend Engineers (Python/FastAPI)
- 2 Frontend Engineers (React/TypeScript)
- 1 Full-Stack Engineer (50% backend, 50% frontend)
- 1 QA Engineer
- 1 DevOps Engineer (shared, 50% allocation)
- 1 Product Manager (part-time)

---

## Team Capacity

### Story Point Estimation

**Point Scale** (Fibonacci):
- **1 point**: 1-2 hours (simple fix, config change)
- **2 points**: 2-4 hours (small feature, unit tests)
- **3 points**: 4-8 hours (medium feature with tests)
- **5 points**: 1-2 days (complex feature, integration)
- **8 points**: 2-3 days (epic-level feature, cross-module)
- **13 points**: 3-5 days (needs breakdown)

**Sprint Capacity** (per engineer):
- Available hours: 80 hours (2 weeks × 40 hours/week)
- Minus meetings: 8 hours (planning, demo, retro, standups)
- Minus support/interruptions: 12 hours
- **Effective capacity**: 60 hours per engineer

**Team Velocity**:
- Assumed velocity (initially): 1 point = 4 hours
- Sprint capacity: 60 hours/engineer × 6 engineers = 360 hours
- **Target story points per sprint**: 90 points

### Capacity Allocation by Type

| Work Type | % of Capacity | Story Points | Purpose |
|-----------|---------------|--------------|---------|
| **Planned Features** | 70% | 63 points | Sprint planned stories |
| **Bug Fixes** | 15% | 14 points | Production bugs, tech debt |
| **Unplanned Work** | 10% | 9 points | Buffer for urgent items |
| **Spikes/Research** | 5% | 4 points | Investigation, POCs |

---

## Epic-to-Sprint Mapping

### MVP Delivery Plan (8 Sprints)

Each epic from the product epics document is mapped to specific sprints:

#### Sprint 1-2: Foundation (Authentication & Infrastructure)
**Epic**: User Authentication & Security + Infrastructure & DevOps

**Sprint 1 Goals**:
- [ ] Docker Compose environment setup
- [ ] PostgreSQL schema (Alembic migrations)
- [ ] JWT authentication (login, register endpoints)
- [ ] User model with bcrypt hashing
- [ ] Basic CI pipeline (lint, unit tests)

**Sprint 1 Stories**:
- DEV-INFRA-01: Docker Compose setup (5 points)
- DEV-INFRA-04: Alembic migrations (3 points)
- DEV-BE-01: JWT authentication (8 points)
- DEV-FE-01: Login screen (8 points)
- DEV-TEST-01: Backend unit tests (13 points) → Carry to Sprint 2

**Sprint 2 Goals**:
- [ ] Complete unit test coverage
- [ ] 2FA with TOTP
- [ ] Session management
- [ ] E2E auth tests
- [ ] Production secrets management

**Sprint 2 Stories**:
- DEV-TEST-01: Backend unit tests (remaining 5 points)
- DEV-BE-07: TOTP 2FA (8 points)
- DEV-FE-07: Settings screen (partial, 5 points)
- DEV-TEST-03: E2E auth tests (5 points)
- DEV-INFRA-06: Sentry error tracking (3 points)

---

#### Sprint 3-4: Core Upload Engine
**Epic**: Resilient DICOM Upload Engine

**Sprint 3 Goals**:
- [ ] Chunked upload API (init, chunk, complete)
- [ ] MinIO integration
- [ ] Upload progress UI
- [ ] IndexedDB persistence

**Sprint 3 Stories**:
- DEV-BE-02: Chunked upload engine (13 points)
- DEV-FE-02: Upload Study screen (8 points)
- DEV-FE-03: Upload Progress screen (partial, 8 points)

**Sprint 4 Goals**:
- [ ] Complete upload progress UI
- [ ] Resume functionality
- [ ] Duplicate detection
- [ ] File validation
- [ ] End-to-end upload tests

**Sprint 4 Stories**:
- DEV-FE-03: Upload Progress (remaining 5 points)
- DEV-BE-08: Duplicate detection (3 points)
- DEV-TEST-03: E2E upload tests (8 points)
- US-2.3: Resume failed upload (frontend, 5 points)

---

#### Sprint 5: PACS Integration
**Epic**: PACS Integration & Interoperability

**Sprint 5 Goals**:
- [ ] STOW-RS PACS forwarding
- [ ] Orthanc integration
- [ ] dcm4chee integration
- [ ] Receipt tracking
- [ ] Integration tests with test PACS

**Sprint 5 Stories**:
- DEV-BE-03: PACS forwarding (8 points)
- Integration tests (5 points)
- PACS health checks (3 points)

---

#### Sprint 6: Analytics & Reporting
**Epics**: Upload Analytics + Report Management

**Sprint 6 Goals**:
- [ ] Analytics dashboard UI
- [ ] Statistics API
- [ ] Redis caching
- [ ] Report data model
- [ ] Report CRUD API
- [ ] PDF generation

**Sprint 6 Stories**:
- DEV-BE-04: Analytics engine (8 points)
- DEV-FE-04: Dashboard with charts (8 points)
- DEV-BE-05: Report management (8 points)
- DEV-INFRA-02: Prometheus metrics (3 points)

---

#### Sprint 7: Notifications & Reports UI
**Epic**: Report Management & Notifications

**Sprint 7 Goals**:
- [ ] SSE notification system
- [ ] Notifications UI
- [ ] Reports listing UI
- [ ] PDF download
- [ ] PACS sync service

**Sprint 7 Stories**:
- DEV-BE-06: Notification system (8 points)
- DEV-FE-05: Reports screen (5 points)
- DEV-FE-06: Notifications screen (5 points)
- PACS sync background job (5 points)

---

#### Sprint 8: PWA & Polish
**Epic**: Progressive Web App Features

**Sprint 8 Goals**:
- [ ] Service worker
- [ ] Offline functionality
- [ ] Install prompts
- [ ] Background sync
- [ ] Push notifications
- [ ] Final E2E tests
- [ ] Security audit

**Sprint 8 Stories**:
- DEV-FE-08: PWA features (13 points)
- Final E2E test suite (8 points)
- Security scan and fixes (5 points)
- Documentation updates (3 points)

---

## Sprint Templates

### Sprint Planning Template

**Pre-Planning Prep** (done by PM/Tech Lead before meeting):
1. Prioritized backlog refined
2. Stories have acceptance criteria
3. Dependencies identified
4. Previous sprint velocity reviewed

**Planning Meeting Agenda**:
1. **Sprint Goal Definition** (15 min)
   - What is the single most important outcome of this sprint?
   - Example: "Complete chunked upload API with end-to-end tests"

2. **Backlog Review** (30 min)
   - Present top 15-20 stories
   - Team estimates each story (planning poker)
   - Identify blockers and dependencies

3. **Sprint Commitment** (30 min)
   - Drag stories into sprint until capacity reached
   - Assign owners (not mandatory, but helpful)
   - Identify spike/research needs

4. **Risk Assessment** (15 min)
   - What could derail this sprint?
   - Mitigation plans

**Planning Output**:
- Sprint goal statement
- Committed stories (target 90 points)
- Risk register

---

### Daily Standup Template

**Format**: Each team member answers 3 questions (2 min max each)
1. What did I complete yesterday?
2. What am I working on today?
3. Am I blocked on anything?

**Parking Lot**: Topics needing >2 min discussion go here (addressed after standup)

**Standup Anti-Patterns** (avoid):
- Status reports to manager (speak to the team)
- Solving problems in standup (schedule follow-up)
- Going over 15 minutes

---

### Sprint Demo Template

**Audience**: Product stakeholders, leadership, adjacent teams

**Demo Flow** (1 hour):
1. **Sprint Overview** (5 min - PM)
   - Sprint goal recap
   - Key metrics (velocity, completed points)

2. **Feature Demos** (40 min - Engineers)
   - Show working software (not slides)
   - Demonstrate user-facing value
   - Invite feedback

3. **Code Quality Metrics** (5 min - QA/DevOps)
   - Test coverage
   - Security findings
   - Performance benchmarks

4. **Q&A** (10 min)

**Demo Best Practices**:
- Use production-like staging environment
- Have backup recordings (in case live demo fails)
- Focus on user value, not technical details

---

### Sprint Retrospective Template

**Format**: Facilitated by rotating team member

**Retrospective Activities** (choose one per sprint):

1. **Start/Stop/Continue** (classic):
   - What should we start doing?
   - What should we stop doing?
   - What should we continue doing?

2. **Sailboat Retrospective**:
   - Anchors (what slowed us down?)
   - Wind (what pushed us forward?)
   - Rocks (risks ahead?)
   - Island (where are we headed?)

3. **4Ls**:
   - Liked
   - Learned
   - Lacked
   - Longed for

**Retrospective Output**:
- 2-3 action items (owned, with deadlines)
- Review previous retro actions

---

## Velocity & Metrics

### Sprint Burndown Chart

Track remaining story points daily:

```
Points
  90 |█
     |█ ╲
  70 |█   █
     |█     ╲
  50 |█       █
     |█         ╲
  30 |█           █
     |█             ╲
  10 |█               █
     |█_________________█
   0 +------------------
     M T W T F M T W T F
     Week 1   Week 2
```

**Interpretation**:
- **Ideal burndown**: Linear diagonal
- **Above line**: Behind schedule
- **Below line**: Ahead of schedule
- **Flat line**: No progress (investigate blockers)

### Cumulative Flow Diagram

Track story states over time:

| State | Definition |
|-------|------------|
| **Backlog** | Not started |
| **In Progress** | Active development |
| **In Review** | Code review / QA |
| **Done** | Merged to main, deployed to staging |

**Health Indicators**:
- Minimal work in progress (WIP) → team focused
- Short cycle time (idea → done) → efficient
- Stable flow → predictable delivery

### Velocity Tracking

**Planned vs. Actual Velocity**:
```
Sprint  | Planned | Completed | Carryover |
--------|---------|-----------|-----------|
S1      | 90      | 75        | 15        |
S2      | 90      | 85        | 5         |
S3      | 90      | 92        | 0         |
S4      | 90      | 88        | 2         |
Avg     | 90      | 85        | 5.5       |
```

**Velocity Insights**:
- Consistently hitting 85-95 points → team is well-calibrated
- Large variances → estimation issues or unstable backlog
- Always missing target → capacity overestimated

---

## Risk Management

### Sprint Risks & Mitigations

**Common Risks**:

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Key engineer out sick** | Medium | High | Pair programming, documentation |
| **Scope creep mid-sprint** | High | Medium | Strict change control, MVP focus |
| **External dependency delay** (PACS access) | Medium | High | Mock PACS for development |
| **Underestimated complexity** | High | Medium | Break down large stories, add spike |
| **Production incident** | Low | Critical | On-call rotation, 20% buffer |

### Mid-Sprint Checkpoint

**Wednesday Week 2 Check-In**:
- [ ] Have we completed 60% of committed points?
- [ ] Are any stories at risk of not finishing?
- [ ] Do we need to de-scope or add stretch goals?

**De-Scoping Criteria**:
- Remove nice-to-have enhancements
- Defer non-critical bugs to backlog
- Reduce test coverage scope (keep critical paths)

**Stretch Goals**:
- Pre-groomed stories ready if sprint finishes early
- Tech debt items
- Exploratory testing

---

## Post-MVP Sprint Planning

### Post-Sprint 8 Roadmap

**Hardening Sprints (Sprint 9-10)**:
- Performance optimization
- Security hardening
- Production monitoring setup
- Runbook creation
- User acceptance testing (UAT)

**Feature Enhancement Sprints (Sprint 11+)**:
- Batch folder upload wizard
- Advanced analytics (facility-level dashboards)
- Report comments/collaboration
- Mobile app (React Native)
- Third-party PACS integrations

---

**Document Status**: ✅ COMPLETE
**Maintained By**: Engineering Manager & Scrum Master
**Review Frequency**: End of each sprint (update velocity, adjust capacity)
