# Scheduler V2 deterministic policy

## 1. Hard eligibility occurs before scoring

A person is not considered at all unless every applicable hard rule passes:

1. Member is active.
2. Member profile includes the required **ministry**.
3. Member profile says they are available for that **service**.
4. The date is not inside a proactive unavailability range.
5. They are not already assigned to another assignment unit in the same program.
6. Same-day rules permit the service assignment.
7. They are not explicitly excluded, such as the member asking for a replacement.

There is no relaxed-availability fallback.

If no candidate passes, the assignment remains **Unfilled** and appears in Admin `Needs Attention`.

## 2. Hardest assignment first

Within a program, unfilled assignment units are processed by the number of eligible candidates, smallest pool first. This protects scarce ministry capability from being consumed by easier positions.

## 3. Normalized Smart Fair score

All base components are normalized to 0–100 before weights are applied.

Default weights:

| Component | Weight | Meaning |
| --- | ---: | --- |
| Ministry/role fairness | 45% | Prefer the person who has waited longer to serve this ministry |
| Recent completed workload | 25% | Prefer people who have completed fewer recent commitments |
| Overall rest | 15% | Prefer people who have gone longer since serving anywhere |
| Future spacing | 15% | Avoid bunching upcoming assignments on the same dependable people |

The default history window is effectively 12 weeks for the initial implementation and can be tuned by the Church Administrator later.

Ties are resolved deterministically by name and then member ID, so identical input produces identical output.

## 4. Reliability adjustment

The reliability component is deliberately small and is not a punishment.

- A member-requested replacement during the **same church week** as the scheduled service: `-2` points.
- Maximum current rolling adjustment: `-8`.
- Proactive unavailability: `0`.
- Replacement requested for next week: `0`.
- Replacement requested for week after next: `0`.
- Admin reassignment/configuration changes: `0`.

The event is classified at the time the request is made. It is not retroactively reclassified when the service later becomes the current week.

## 5. Replacement flow

There is intentionally **no accept/decline workflow**.

```text
Member requests replacement
       |
       v
Hard eligibility filter
       |
       v
Smart Fair ranking
       |
       v
Best eligible member automatically replaces original member
       |
       +--> history/audit event
       +--> notification integration later
```

If no eligible person exists, the assignment becomes Unfilled and Admin intervention is required.

## 6. Proactive unavailability

Members can enter a date range ahead of time. This never reduces reliability.

If they already have scheduled assignments in that date range, V2 automatically attempts the same deterministic replacement process with `penaltyEligible=false`.

## 7. Three-week horizon

The scheduler maintains a calendar window:

- current church week
- next church week
- following church week

This is a date window, not “three occurrences per service.” Therefore daily, weekly and future generalized service schedules behave predictably.

## 8. Auditability

Every scheduler decision can record:

- service/date
- assignment unit
- required ministry
- eligible candidates
- normalized component scores/final score
- selected member

Regular Admins see operational History. Only the Church Administrator sees detailed Scheduling Audit scores.
