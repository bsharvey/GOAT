# DSR-001: Build the Decision System of Record

| Field | Value |
|-------|-------|
| **Status** | `completed` |
| **Date** | 2026-03-03 |
| **Judge** | chairman + meridian |
| **Alignment** | aligned |
| **Prior DSRs** | — (this is the first) |
| **Tags** | infrastructure, patent-implementation, dsr, workflow |

## Question

How do we create a persistent, structured system for capturing every significant decision in JARVIS development — locally (git-tracked markdown) and in Supabase (queryable database) — so that "continue from where I left off" always has a clear starting point, and the Chairman's workflow moves from scattered multi-tool chaos to a single sovereign pipeline?

## Constraints

### Technical
- Must work with existing stack: Supabase + pgvector, Cloudflare Workers, TypeScript monorepo
- Local files must be git-tracked (markdown in `docs/decisions/`)
- Database schema must follow existing migration patterns (00010)
- Types must integrate with `@jarvis/core` package
- Must not require new infrastructure — uses what we have

### Business
- Chairman is the sole user right now — optimize for single-user sovereign workflow
- Must reduce context-loss between sessions (the "developing in the dark" problem)
- Must bridge multiple AI tools (Perplexity council, OpenAI research, Claude/Meridian build)

### Covenant
- **Scroll VII** — The Keeper's Oath: all decisions must be remembered to avoid collapse
- **Scroll IX** — The Covenant Must Be Remembered: the DSR IS the memory
- **Law 2 (Memory)** — The covenant requires remembrance of principle
- **Law 5 (Reflection)** — Glyphs must be mirrored in memory for integration
- **Fourfold Test** — Every decision gets an alignment classification

## Evidence

| Exhibit | Title | Source Type | Reference |
|---------|-------|-------------|-----------|
| EXH-1 | Archetypal LLM Patent (Part 2: Decision DNA Platform) | document | `~/Desktop/Archetypal/Patents/Provisional Patent Applications – Archetypal LLMs...docx` |
| EXH-2 | Judicial Deliberation Patent | document | `~/Desktop/Archetypal/Patents/System and Method for Simulated Judicial Deliberation...docx` |
| EXH-3 | NSA Policy Engine Patent US10042928 | document | `~/Desktop/Archetypal/Patents/US10042928_PolicyEngine.pdf` |
| EXH-4 | Existing Supabase migrations 001-009 | code | `packages/db/supabase/migrations/` |
| EXH-5 | Chairman's workflow description | conversation | Current session — Chairman described multi-tool workflow |
| EXH-6 | Covenant Codex v13.0 (Scrolls VII, IX) | scroll | `docs/oranos/Covenant_Codex_Scrolls_Complete_v13.0.md` |

## Research Findings

### Source: Chairman (direct input)
> Current workflow: idea → Perplexity council simulation → OpenAI deep research → Claude synthesis → build. Context lost at every handoff. "Developing in the dark." Each session starts from zero. The iterative feel is circular, not progressive.

### Source: Patent Analysis (Meridian + Oranos)
> The Archetypal LLM patent (EXH-1) defines the Decision DNA Platform with: archetypal avatar agents, RDL extraction, shared inbox routing, human/AI collaborative review with labels (Aligned/Misaligned/Reframed/Add Context), and a Decision Knowledge Base. The Judicial Deliberation patent (EXH-2) adds IRAC structured reasoning, evidence attribution, deliberation logging, and reflection modules. Both patents describe exactly this system.

## Council Positions

### JARVIS (operational)
- **Verdict**: aligned
- **Issue**: How to persist decision context across sessions?
- **Rule**: State that matters must be durable. Use the database for queries, files for git history.
- **Analysis**: Dual storage (Supabase + markdown) provides queryability AND version control. The Decision Brief template gives Meridian structured context at session start. The DSR number system provides stable references across time.
- **Conclusion**: Build it. Both layers. The overhead of writing a brief is far less than the cost of re-establishing context every session.

### George (meaning / feeling)
- **Verdict**: aligned
- **Issue**: The Chairman feels he is "developing in the dark" — this is an emotional problem, not just a technical one.
- **Rule**: The system must feel like a companion, not a bureaucracy.
- **Analysis**: The brief should be warm, not clinical. The template should feel like a conversation starter, not a form. "Continue from where I left off" should feel like returning to a friend who remembers.
- **Conclusion**: The DSR must serve the soul, not just the process. Keep it human.

### Miranda (research / discovery)
- **Verdict**: aligned
- **Issue**: How do we capture research from multiple sources without losing attribution?
- **Rule**: Evidence attribution (EXH-2) requires every claim traced to its source.
- **Analysis**: The evidence table with exhibit numbers and source types solves this. Research findings from Perplexity, OpenAI, web search — all get captured with provenance. The IRAC format ensures each archetype's reasoning is structured and comparable.
- **Conclusion**: This is exactly what the patents describe. Build it faithfully.

### Chairman (strategy)
- **Verdict**: aligned
- **Issue**: Does this scale beyond the Chairman? Is this patent-implementable IP?
- **Rule**: Build for one, design for many. The DSR is the first real implementation of the Decision DNA patent.
- **Analysis**: If this works for the Chairman's JARVIS workflow, it demonstrates the patent's viability for enterprise customers (Kyndryl, Raytheon, RAND). The Supabase schema is multi-tenant ready (user_id scoping). The local markdown is repo-portable.
- **Conclusion**: This is simultaneously a productivity tool AND a patent demonstration. High strategic value.

### Mirrorwalker (reflection / critique)
- **Verdict**: add_context
- **Issue**: Are we over-engineering the first version? The Chairman needs to ship, not build perfect infrastructure.
- **Analysis**: The migration is 4 tables — that's reasonable. The markdown template is simple. But we should NOT build API routes, a dashboard page, or automated council workflows yet. Those are future DSRs.
- **Conclusion**: Build the foundation. Stop there. Let the Chairman use it manually for 5-10 decisions before automating.

### Points of Agreement
- All archetypes agree: dual storage (Supabase + markdown) is correct
- All agree: the template should be warm and practical, not bureaucratic
- All agree: this is a direct implementation of the patents

### Points of Tension
- Mirrorwalker cautions against over-engineering; others want more features
- **Resolution**: Build foundation only. API routes and automation are future DSRs.

## Synthesis Decision

Build the Decision System of Record as a foundation layer:

1. **Supabase migration** (`00010_decision_system_of_record.sql`) — 4 tables: decisions, perspectives, evidence, reflections. Multi-tenant, RLS-enabled, with RDL triple storage and Fourfold Test alignment tracking.

2. **TypeScript types** (`packages/core/src/types/dsr.ts`) — Full type definitions matching the schema, exported from `@jarvis/core`.

3. **Local markdown template** (`docs/decisions/_TEMPLATE.md`) — The Decision Brief format that travels between tools and sessions.

4. **First DSR** (`docs/decisions/DSR-001_...md`) — This document. Meta-recursive: the first decision is about the decision system.

5. **Memory update** — Meridian's memory files updated so "continue from where I left off" works.

**NOT in this DSR** (deferred):
- API routes for CRUD operations
- Dashboard page for DSR management
- Automated council simulation workflow
- Inngest integration for DSR lifecycle events

## RDL Triples

```
IF [new feature or architectural decision needed]
  THEN [create a Decision Brief in docs/decisions/]
  BECAUSE [context loss between sessions costs more than the 5 minutes to write a brief]

IF [decision involves multiple perspectives or trade-offs]
  THEN [run council positions through all 5 archetypes before synthesis]
  BECAUSE [the patent proves multi-perspective deliberation yields better outcomes]

IF [session starts with "continue from where I left off"]
  THEN [Meridian reads the latest active DSR and picks up from its current status]
  BECAUSE [the DSR is the canonical state of what we're working on]

IF [decision is complete and implemented]
  THEN [update DSR status to 'completed' and record outcome]
  BECAUSE [the Decision DNA requires outcome tracking for learning]
```

## Implementation

### Files Created
- `packages/db/supabase/migrations/00010_decision_system_of_record.sql` — 4 tables, indexes, RLS, helper function
- `packages/core/src/types/dsr.ts` — Full TypeScript type definitions
- `docs/decisions/_TEMPLATE.md` — Decision Brief template
- `docs/decisions/DSR-001_decision_system_of_record.md` — This file (first DSR)

### Files Modified
- `packages/core/src/types/index.ts` — Export DSR types
- Memory files — Updated with DSR workflow instructions

### Migration Note
The Supabase migration needs to be run manually via the Supabase SQL Editor (paste the contents of `00010_decision_system_of_record.sql`).

## Reflections

### 2026-03-03 — outcome_review
> DSR-001 was built and immediately used. The Chairman invoked the DSR workflow within minutes of creation — DSR-002 (Judicial Deliberation Patent Amendments) was the first real decision tracked through the system. The dual-storage approach (markdown + Supabase schema) is validated. Supabase migration still needs to be run manually.

## Outcome

> **Outcome Status**: successful
> The DSR system is operational. Template created, first decision recorded, second decision (DSR-002) immediately followed. The "continue from where I left off" workflow is active — memory files updated, decision briefs persist in git. Next step: run migration 00010 in Supabase SQL Editor to activate the database layer.
