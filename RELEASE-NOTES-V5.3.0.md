# Westbury Church Hub V5.3.0

## Service-aware ministry eligibility
- Member ministry eligibility is now configured per service.
- Every active service appears under every ministry in the People editor.
- A service is selectable when that ministry exists in the service program template; otherwise it remains visible with a clear not-applicable message.
- New services automatically appear under every ministry because the editor is driven by live Services + Program Templates, not hard-coded service names.
- Saving converts the member to authoritative `assignmentEligibilityMode=explicit` and keeps the legacy `ministries` field synchronized for compatibility.
- Overall service availability remains a separate master switch.
- Member exports now include `AssignmentEligibilityMode` so exact service-level eligibility round-trips cleanly through export/import.
- Fixed scheduler semantics so explicit eligibility with an empty list means no eligible assignments instead of falling back to global ministry flags.

## Church News refresh
- Redesigned the member-facing Bulletin and News view with a softer weekly-news hero, clearer Sunday bulletin feature, and friendlier announcement cards.
- The latest bulletin remains the only bulletin shown at the top.

## Soft Light theme
- Replaced the high-brightness light palette with warm stone/sage surfaces, softer borders, and a muted blue-teal accent.
- Dark theme is unchanged.

## Infrastructure
No new Azure resources or tables are required.
