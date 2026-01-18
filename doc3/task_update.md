# Dependency Modernization & Compatibility Review Task

## Phase 1: Dependency Inventory & Classification
- [x] Scan frontend package.json and package-lock.json
- [x] Scan backend requirements.txt
- [x] TypeScript Type Consolidation <!-- id: 4 -->
    - [x] Create centralized `src/types/` directory
    - [x] Extract `database.ts` types
    - [x] Extract `api.ts` types
    - [x] Update imports in `db.ts` and `api.ts`
    - [x] Update imports in components (`ReportList`, `ReportCard`, etc.)
- [x] Identify pyproject.toml configuration
- [x] Review pre-commit-config.yaml dependencies
- [x] Examine Docker base images
- [ ] Classify dependencies by runtime criticality
- [ ] Identify direct vs transitive dependencies
- [ ] Map dev vs production dependencies

## Phase 2: Modernity & Support Status Analysis
- [x] Analyze frontend dependencies (React 19, Vite 7, etc.)
- [x] Analyze backend dependencies (FastAPI, SQLAlchemy, etc.)
- [x] Check for CVEs and security advisories
- [x] Identify deprecated packages
- [x] Determine EOL status for each dependency
- [x] Categorize dependencies (Modern/Outdated/Deprecated/Security Critical)

## Phase 3: Dependency Usage Impact Mapping
- [x] Trace React 19 usage patterns in frontend
- [x] Trace FastAPI usage patterns in backend
- [x] Map DICOM library usage (pydicom, dicomweb-client, cornerstone-core)
- [x] Identify critical business logic dependencies
- [x] Classify usage by layer (infrastructure/business/UI/utility)

## Phase 4: Codebase Compatibility Analysis
- [x] Review Python 3.11 language compatibility
- [x] Review TypeScript 5.9 compatibility
- [x] Analyze React 19 breaking changes impact
- [x] Review Vite 7 build system compatibility
- [x] Assess pre-commit hook compatibility

## Phase 5: Non-Breaking Modernization Strategy Design
- [x] Design upgrade paths for outdated dependencies
- [x] Identify breaking API changes
- [x] Propose adapter/wrapper layers if needed
- [x] Define version pinning strategy
- [x] Recommend compatibility shims

## Phase 6: Refactoring Impact Analysis
- [x] Estimate refactoring scope per dependency
- [x] Identify high-risk change zones
- [x] Recommend phased rollout strategy
- [x] Assess complexity ratings

## Phase 7: Testing Strategy Alignment
- [x] Review existing test coverage (Vitest, Playwright, Pytest)
- [x] Identify testing gaps for upgrade validation
- [x] Recommend regression test automation
- [x] Define contract tests for APIs
- [x] Propose snapshot testing where appropriate

## Phase 8: Upgrade Execution Blueprint
- [x] Create dependency upgrade order
- [x] Define lockfile regeneration steps
- [x] Design rollback plan
- [x] Establish validation checkpoints

## Phase 9: Output Deliverables
- [x] Generate Dependency Audit Report
- [x] Create Compatibility Impact Matrix
- [x] Write Non-Breaking Upgrade Plan
- [x] Document Refactoring Recommendations
- [x] Produce Regression Risk Checklist
- [x] Create Prioritized Implementation Plan (Tier 1 & 2 Quick Wins)
