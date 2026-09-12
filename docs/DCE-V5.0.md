# Deterministic Conversational Engine V5.0

## Design principle

DCE is a compiler, not a chatbot rule pile. It transforms human language into a canonical command frame. Application adapters then map that frame to known capabilities. The execution layer remains deterministic and permission-controlled.

## Core modules

- `src/dce/frame.js` — canonical speech acts and operations
- `src/dce/compiler.js` — compositional frame compiler and context inheritance
- `src/dce/queryPlanner.js` — auditable deterministic query/mutation plan
- `src/chatHub/domainPack.js` — Church Hub ontology, role/service extraction and frame-to-intent adapter
- `src/chatHub/capabilityRegistry.js` — module and risk metadata
- `src/chatHub/engine.js` — authorization, module enforcement, state, clarification and dispatch

## Separation of responsibility

1. Understand the language.
2. Build the frame.
3. Resolve to an application capability.
4. Authorize the actor.
5. Enforce module/data policy.
6. Fill missing slots or clarify ambiguity.
7. Confirm risky mutations.
8. Call existing application services.
9. Return a deterministic response.

## Command frame example

Input: `¿Quién da la clase los próximos 3 miércoles?`

```json
{
  "speechAct": "query",
  "operation": "get",
  "domain": "worship",
  "resource": "program",
  "filters": {
    "role": "class_teacher",
    "serviceType": "wednesday_class"
  },
  "time": {
    "mode": "next_occurrences",
    "count": 3,
    "weekday": 3
  },
  "projection": ["person"],
  "intent": "program.query"
}
```

## Resource profile

DCE performs string/token/regex/map operations and does not require a GPU or model inference. The intended parser budget is milliseconds; storage/API calls remain the dominant latency.

## Future Exonuvia reuse

The reusable boundary is the command frame. A future Exonuvia application can supply its own domain pack and capability registry while retaining the generic compiler, context model, planner, scoring model and safety separation.
