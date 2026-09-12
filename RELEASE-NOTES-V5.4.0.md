# Westbury Church Hub V5.4.0

## Chat Hub administrator ministry management

Chat Hub can now change a member's service-aware ministry eligibility from natural-language administrator requests.

Examples:
- Quita a Antonio Mendoza de Cantos en Servicio de Adoración.
- Agrega a Antonio Mendoza a Cantos los miércoles.
- Antonio puede servir en todo en Adoración excepto Cantos.
- Change Antonio Mendoza's ministries.
- Make Antonio Mendoza eligible for Songs on Wednesday Class.
- Remove Songs from Antonio Mendoza for Sunday Worship.

The flow resolves the member, ministry, and live service configuration, asks only for missing information, summarizes the exact change, requires confirmation, writes explicit assignment eligibility, updates derived ministry/service membership, and writes an audit-history event. New services added to the church configuration automatically participate because the chat reads live services and templates rather than hard-coded service lists.

No new Azure infrastructure is required.
