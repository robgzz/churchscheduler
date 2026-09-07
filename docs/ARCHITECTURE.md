# V2 Architecture

## Runtime

```text
Internet / iOS / Android / Desktop
             |
             | HTTPS
             v
    Azure Container Apps
    --------------------
    Express API + PWA
             |
             | Managed Identity
             v
      Azure StorageV2
      /             \
 Azure Tables     Azure Blobs
 app records      private files

Container Apps Scheduled Job
             |
             +--> complete past assignments
             +--> maintain rolling 3-week schedule
```

No VNet is required for V2. The Container App uses external HTTPS ingress so users can reach it from any normal network. Azure Storage networking remains publicly reachable at the service endpoint, but anonymous Blob access and Shared Key access are disabled; the application authenticates with its managed identity.

## Authorization model

Membership and capabilities are deliberately separate.

A member can have additive groups:

- `members` — bulletin/news and petitions
- `worship` — worship program, assignments, availability, replacements, songs

Capabilities:

- `adminAccess` — Admin Console
- `churchAdministrator` — owner-level Advanced settings and authority to grant/revoke admin access

A worship participant is normally both `members` and `worship`. An administrator does not automatically become a worship participant.

Visitors can use the public bulletin/news experience and the Visitor Connect form without being exposed to Admin/Worship functionality.

## Azure Table layout

All rows use the Westbury church identifier as `PartitionKey`. This deployment is intentionally dedicated to Westbury.

| Table | Purpose |
| --- | --- |
| Settings | Church profile, timezone, scheduler settings, seed marker |
| Users | Login records and password hashes |
| Sessions | Opaque server-side login sessions |
| Members | Member profile, groups, ministries and availability |
| Ministries | Canonical ministry definitions |
| Services | Recurring church services |
| ProgramTemplates | Ordered visible program items and linked assignment units |
| Programs | One occurrence of one service |
| Assignments | Volunteer commitment records |
| HistoryEvents | Append-only operational/history/audit events |
| Content | News, bulletin and other content metadata |
| Songs | Song library |
| VisitorContacts | Visitor Connect submissions |
| Petitions | Member prayer petitions |
| PushSubscriptions | Reserved for PWA push notifications |

Complex documents are serialized into a `data` JSON column. Frequently queried fields are duplicated as typed Table properties so Azure Table filters can work without parsing JSON.

## Blob containers

- `attachments` — bulletin/news/content attachments
- `imports` — migration/import staging
- `backups` — application-generated backup/export artifacts

Blob references are stored in Table metadata rather than embedding Base64 files inside large JSON documents.

## Service Template model

A **Program Item** is a line people see. An **Assignment Unit** is a volunteer responsibility. Multiple program items can point to the same assignment unit.

Example:

```text
Cantos                  -> songs_a -> Roberto
Canto de invitación     -> songs_a -> Roberto

Cantos                  -> songs_b -> Rubén
Canto de la cena        -> songs_b -> Rubén
Canto de la ofrenda     -> songs_b -> Rubén
```

The names can appear several times on the program, while fairness counts each assignment unit only once.

`Vigilancia` uses two independent assignment units, so two distinct eligible members are selected.

## History vs future schedule

Completed work and future workload are separate concepts:

- `scheduled` assignments affect future-spacing/load decisions.
- Only `completed` assignments become actual service history.
- `replaced` members do not receive completed-service credit.
- The final member on the assignment at completion receives that historical service.

This avoids the legacy behavior where generating a future program could incorrectly update `lastServed` as though the person had already served.
