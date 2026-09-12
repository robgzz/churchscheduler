# Service-aware ministry eligibility

The scheduler uses three independent gates:
1. member is active and belongs to the ministry (compatibility summary),
2. service is enabled in overall service availability,
3. exact `serviceId::assignmentKey` token is present when `assignmentEligibilityMode=explicit`.

The People editor now treats #3 as the authoritative ministry/service matrix. A ministry checkbox for a service toggles every assignment key for that ministry in that service template. For example, Cantos in Sunday Worship toggles both `songs_a` and `songs_b`.

New services are discovered dynamically. They appear under every ministry. If the new service template has a position using that ministry, the checkbox is enabled; otherwise it is shown as not part of that service program until the template is configured.
