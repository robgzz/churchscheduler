# DCE 4.0 — Domain Intelligence Architecture

## Design objective

DCE 4 treats language as an interface to a typed domain rather than as a list of intents. The core is domain-agnostic; Church Hub provides the first domain pack.

## Canonical processing model

1. Normalize language without changing domain meaning.
2. Classify conversational act.
3. Compile a typed semantic frame.
4. Resolve subject/ownership, requested projection, time, entities and semantic roles.
5. Resolve domain capability from the registry.
6. Arbitrate against typed dialogue state and any expected response.
7. Build a deterministic query/action plan.
8. Authorize independently from interpretation.
9. Validate domain constraints.
10. Explain, query, guide, preview or execute through canonical services.
11. Verify writes from authoritative state.
12. Record safe audit/diagnostic metadata.

## Stable identifiers

DCE core uses canonical identifiers such as:

- `entity.member`
- `entity.program`
- `entity.assignment`
- `entity.song`
- `rel.eligible_for`
- `rel.assigned_to`
- `rel.selected_for`
- `rel.responsible_for`

Natural-language aliases belong to the Church domain lexicon, not to business-service identifiers.

## Semantic model

A sentence can carry:

- act
- predicate
- subject
- object
- semantic roles
- scope
- temporal expression
- projection
- quantifier
- polarity
- desired state
- result type

This allows query, explanation and mutation to share one representation. For example, checking a member's eligibility and changing that eligibility are two acts over the same `eligible_for` relation.

## Typed dialogue state

Conversation state is separate from application state. DCE stores focus, salient discourse entities, active/suspended goals and a typed expected response. Application facts are always reloaded from authoritative repositories/services.

## Capability model

Capabilities declare domain, entity and risk class. The engine distinguishes understanding from authority. A sentence may be fully understood while the action is unsupported, unauthorized, invalid in the current state or awaiting confirmation.

Risk classes:

- read
- sensitive-read
- self-write
- admin-write
- privileged-write
- critical-write

## Reasoning and explanation

Business rules return structured proof traces. Human-readable explanations are rendered from rule outcomes instead of invented prose. This supports deterministic `why`, `why not`, `what is missing`, and `what blocks this` behavior.

## Reuse beyond Church Hub

The DCE core contains no Church-specific entity names. A future Azure domain pack can register Azure users, groups, subscriptions, resources, role assignments and policies over the same schema, relationship, query, reasoning, dialogue and capability infrastructure.
