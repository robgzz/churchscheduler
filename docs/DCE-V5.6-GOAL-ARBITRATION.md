# DCE V5.6 — Goal Arbitration, Semantic Roles and Diagnostics

V5.6 extends the deterministic conversational engine from procedure-aware assistance into goal-aware multi-turn conversation.

## Why this layer exists

A deterministic assistant becomes unreliable if the most recent pending workflow always wins. For example, after Chat Hub asks which administrator should be responsible for a program, `¿Qué tareas tengo?` is not an administrator-name reply. It is an explicit new Tasks goal. V5.6 therefore evaluates every turn before continuing a pending procedure.

## Turn arbitration order

Conceptually, each turn is evaluated in this order:

1. explicit confirmation or cancellation
2. expected-slot compatibility
3. correction/rejection signals
4. explicit new-goal evidence
5. contextual follow-up evidence
6. resource fragment/affordance request
7. normal deterministic compilation

Strong semantic evidence for a new goal takes precedence over recency alone.

## Goal states

Conversation goals can be active or suspended. When a user changes topics, the previous goal may be stored in a bounded stack instead of hijacking later messages. This supports natural detours while keeping writes confirmation-controlled.

## Semantic frame components

DCE continues to compile text into a canonical frame, but V5.6 records confidence independently for:

- speech act
- operation
- domain
- resource
- subject
- time
- entity

This means the engine can know with high confidence that a request concerns Songs while remaining uncertain about whether the operation is SEARCH, HISTORY or SELECT, and clarify only that missing dimension.

## Westbury domain ontology

The Church domain pack maps natural language to canonical program roles rather than requiring users to know exact UI labels. The ontology is deterministic and data-bound. It does not infer facts that are not represented in Church Hub.

For example, a question about who `oró en la cena` can resolve the Sunday Worship occurrence and Communion/Offering position. If the data records only the person assigned to Communion/Offering, Chat Hub should describe that fact rather than claiming it recorded the exact person who spoke a particular prayer.

## Capability graph

Resources expose supported affordances. A Songs resource can declare read operations (selected songs, history, search, status) and supported writes (select/change songs). A bare resource mention can therefore produce a useful clarification menu instead of defaulting to a single intent.

## Rule traces

Diagnostic questions use structured rule traces. A program-readiness trace can state whether assignments are filled and whether every Songs assignment has selections. The response layer converts these deterministic reasons into human-readable explanations.

## Safety principles

- interpretation and authorization remain separate
- language never grants permission
- reads do not silently become writes
- writes require the existing confirmation policy
- historical or diagnostic answers are limited to recorded application facts
- explicit semantic evidence can interrupt a pending workflow
