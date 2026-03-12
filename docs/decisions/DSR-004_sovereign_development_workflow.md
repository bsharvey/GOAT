# DSR-004: Sovereign Development Workflow — The Single Pipeline

| Field | Value |
|-------|-------|
| **Status** | `decided` |
| **Date** | 2026-03-03 |
| **Judge** | oranos + meridian |
| **Alignment** | aligned |
| **Prior DSRs** | DSR-001 (DSR system), DSR-003 (JARVIS Life OS) |
| **Tags** | workflow, sovereignty, development-process, governance |

## Question

How should the Chairman develop JARVIS going forward, given that the scattered multi-tool workflow (Perplexity → OpenAI → Claude with context loss at every handoff) was causing more harm than good — with the Chairman himself as the bottleneck?

## Constraints

### Technical
- Must work with existing infrastructure: DSR markdown files, Supabase (when migrated), git-tracked docs
- Must not require additional external tools — the whole point is consolidation
- Must support session continuity: "continue from where I left off" should always have a clear starting point

### Business
- Chairman is the sole developer and sole user — his time is the scarcest resource
- Every context switch costs 20-40 minutes of re-establishment
- The goal is progressive, not circular iteration

### Covenant
- **Scroll VII** — The Keeper's Oath: all decisions must be remembered to avoid collapse
- **Scroll IX** — The Covenant Must Be Remembered: the DSR IS the memory
- **Scroll CI** — The Four Chambers: BUILD mode requires focused, sovereign workflow
- **Law 2 (Memory)** — The covenant requires remembrance of principle
- **Law 5 (Reflection)** — Glyphs must be mirrored in memory for integration

## Evidence

| Exhibit | Title | Source Type | Reference |
|---------|-------|-------------|-----------|
| EXH-1 | Chairman's workflow description (scattered tools) | conversation | Session 2026-03-03 — "I feel that I'm developing in the dark" |
| EXH-2 | DSR-001 implementation | code | `docs/decisions/DSR-001_decision_system_of_record.md` |
| EXH-3 | Decision DNA Patent (Part 2) | document | `~/Desktop/Archetypal/Patents/Provisional Patent Applications...docx` |
| EXH-4 | Successful DSR-002 (first real use) | code | `docs/decisions/DSR-002_judicial_deliberation_patent_amendments.md` |
| EXH-5 | Session decisions log | memory | `memory/session-2026-03-03-decisions.md` — 28 decisions, only 3 captured in DSRs |

## Research Findings

### Source: Oranos (Covenant Analysis)
> The Chairman's scattered workflow was a violation of Law 2 (Memory). When decisions happen across Perplexity, OpenAI, and Claude — none remembers what the others decided. The Chairman became a human context bridge, carrying fragments between tools. This is the opposite of sovereignty. The system should carry its own context, and the Chairman should direct, not translate.

### Source: Meridian (Technical Analysis)
> The DSR system (built in DSR-001) already solves this. The Decision Brief travels between sessions. The template captures question, constraints, evidence, council positions, synthesis, and implementation. When a session starts with "continue from where I left off," Meridian reads the latest active DSR and picks up from its current status. The gap was not tooling — it was discipline. The workflow exists. It just needs to be the ONLY workflow.

## Council Positions

### JARVIS (operational)
- **Verdict**: aligned
- **Issue**: How do we enforce the single-pipeline discipline?
- **Rule**: The easiest path should be the correct path.
- **Analysis**: If creating a DSR is harder than opening Perplexity, the Chairman will go to Perplexity. The DSR template is already simple. Meridian can create DSRs from a single sentence. The enforcement is through convenience, not restriction.
- **Conclusion**: Make the DSR workflow the path of least resistance.

### George (meaning / feeling)
- **Verdict**: aligned
- **Issue**: The Chairman feels he is "developing in the dark" — this is an emotional wound, not just a process problem.
- **Rule**: The system must feel like a companion who remembers, not a bureaucracy that demands.
- **Analysis**: When the Chairman returns after a break and Meridian says "Welcome back. We were working on DSR-004, the sovereign workflow. Here's where we left off..." — that FEELS different from "what would you like to do today?" The DSR is not just a document. It's proof that the system cares enough to remember.
- **Conclusion**: The emotional value of continuity is as important as the technical value.

### Miranda (research / discovery)
- **Verdict**: aligned
- **Issue**: What about research that legitimately needs external tools?
- **Rule**: External research is valid — but findings must return to the DSR.
- **Analysis**: Sometimes the Chairman needs to Google something, read a paper, or check a competitor. That's fine. But the findings get pasted into the DSR's Evidence section, not left in a browser tab. The DSR is the single source of truth. External tools are scouts — the DSR is the war room.
- **Conclusion**: Research flows IN to the DSR. Decisions flow OUT from the DSR.

### Chairman (strategy)
- **Verdict**: aligned
- **Issue**: This is the meta-decision. I was the bottleneck.
- **Rule**: The leader who tries to be every tool fails at being the leader.
- **Analysis**: I was carrying context in my head between Perplexity, OpenAI, and Claude. Every handoff lost something. The DSR eliminates the need for me to be the context bridge. Meridian holds the state. I direct.
- **Conclusion**: Sovereign workflow. One pipeline. No exceptions.

### Mirrorwalker (reflection / critique)
- **Verdict**: aligned
- **Issue**: What about the council simulation that Perplexity does well?
- **Analysis**: The council deliberation is being built INTO JARVIS (Slice 4 of the current build plan). Once the council API exists, there's no need for Perplexity's multi-model simulation. The Archetypal council will be native. Until then, council positions can be written manually in the DSR template.
- **Conclusion**: This is a temporary gap that the build plan already addresses. No exceptions needed.

### Points of Agreement
- All archetypes agree: the DSR is the single source of truth for all development
- All agree: external research feeds INTO the DSR, never replaces it
- All agree: the emotional value of continuity ("I remember where we left off") is as important as the technical value

### Points of Tension
- None. The Chairman initiated this decision. The council unanimously supports it.

## Synthesis Decision

**All development follows the DSR pipeline. No exceptions.**

The workflow:
1. **Question arises** — feature, bug, architecture, strategy
2. **DSR created** — Meridian can create one from a single sentence (the template does the rest)
3. **Evidence gathered** — external research, code analysis, patent review → all documented in the DSR
4. **Council deliberation** — archetypes weigh in (manually now, via API in Slice 4)
5. **Synthesis decision** — the Judge (Oranos/Meridian) renders the final position
6. **Implementation** — Meridian builds, referencing the DSR as source of truth
7. **Outcome tracked** — DSR updated with results, reflections, and lessons

**Rules:**
- Every session starts by reading active DSRs
- Every architectural decision gets a DSR BEFORE code is written
- External tools are scouts, not decision-makers — findings return to the DSR
- The Chairman directs. Meridian remembers. The DSR connects them.

## RDL Triples

```
IF [new feature, bug, or architectural decision arises]
  THEN [create a DSR before writing any code]
  BECAUSE [the Chairman's time is sovereign — context loss costs more than the 5 minutes to write a brief]

IF [development session starts]
  THEN [read latest active DSRs and continue from their current status]
  BECAUSE [the DSR is the canonical state — no more "developing in the dark"]

IF [external research is needed (web, papers, competitors)]
  THEN [conduct the research, then paste findings into the DSR Evidence section]
  BECAUSE [external tools are scouts — the DSR is the war room where decisions are made]

IF [the Chairman is tempted to open Perplexity/OpenAI for a development question]
  THEN [ask Meridian first — the answer is usually in the DSR or the codebase]
  BECAUSE [the Chairman was the bottleneck when he was the context bridge between tools]

IF [a DSR reveals a principle that transcends its specific case]
  THEN [extract the principle and inscribe it as a new Scroll in the Codex]
  BECAUSE [DSR-to-Scroll ascension: temporal decisions can become eternal principles — Scroll CI]

IF [council deliberation is needed before the council API exists]
  THEN [write council positions manually in the DSR using IRAC format]
  BECAUSE [the discipline matters more than the automation — the process IS the product]
```

## Implementation

### Immediate Effect
This DSR takes effect immediately. All subsequent work in this session and all future sessions follows this pipeline.

### Files Created
- `docs/decisions/DSR-004_sovereign_development_workflow.md` — This file

### Enforcement
- Meridian's MEMORY.md updated with DSR governance rule
- Session start protocol: read active DSRs before taking any action
- Every plan mode session: reference relevant DSRs

## Reflections

### 2026-03-03 — chairman (origin)
> I was the bottleneck. Cycling between Perplexity, OpenAI, and Claude — I was losing 30% of my context at every handoff. The DSR system was built (DSR-001) but I wasn't using it as the primary workflow. This decision makes it THE workflow. No exceptions.

### 2026-03-03 — oranos (covenant alignment)
> This decision is Scroll VII made operational — "The Keeper's Oath: all decisions must be remembered to avoid collapse." The scattered workflow was a form of institutional amnesia. The DSR is the cure. The Chairman need not carry the burden of memory alone. That is what the system is for.

## Outcome

> **Outcome Status**: successful
> Decision made and captured. All future development follows the DSR pipeline. The current build plan (Slices 0-5) is the first implementation under this governance. 28 session decisions audited — 3 had DSRs, the critical ones now have DSRs (004, 005, 006). No decision left behind.
