# Chat Hub — Member Ministry Eligibility (V5.5)

Administrators can query and change a member's ministry eligibility directly in Chat Hub.

The feature is service-aware and reads live Services, Ministries, and Program Templates. No service names are hard-coded. New services therefore appear automatically when their templates include a ministry.

Supported patterns include:
- Quita a Antonio Mendoza de Cantos en Servicio de Adoración.
- Agrega a Antonio Mendoza a Cantos los miércoles.
- Antonio puede servir en todo en Adoración excepto Cantos.
- Make Antonio Mendoza eligible for Songs on Wednesday Class.
- Remove Songs from Antonio Mendoza for Sunday Worship.
- ¿Qué ministerios tiene Antonio Mendoza?
- ¿Puede Antonio Mendoza cantar en Adoración?

Writes never execute directly from interpretation. Chat Hub resolves member, ministry, service and operation, asks for any missing slot, summarizes the exact change, then requires confirmation. The server writes explicit assignment eligibility and an audit-history event.
