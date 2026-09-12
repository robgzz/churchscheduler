// Church Hub adapter for the generic Deterministic Conversational Engine (DCE).
// Execution authority remains in server-side authorization/business services.
const C=(module,risk='read')=>({module,risk});
export const chatCapabilityRegistry=Object.freeze({
  'help':C(null),'navigation.open':C(null),'hub.upcomingSummary':C(null),'services.query':C('worship'),'profile.mine':C(null),'notifications.mine':C(null),
  'assignments.mine':C('worship'),'program.query':C('worship'),'program.participation':C('worship'),'replacement.request':C('worship','self-write'),'availability.add':C('worship','self-write'),'songs.search':C('worship'),'songs.history':C('worship'),
  'bulletins.latest':C('publications'),'announcements.count':C('publications'),'announcements.list':C('publications'),'announcements.query':C('publications'),
  'events.query':C('events'),'events.myRsvp':C('events'),'events.register':C('events','self-write'),'events.cancelRsvp':C('events','self-write'),'events.dismiss':C('events','self-write'),
  'tasks.mine':C('followups'),'tasks.complete':C('followups','self-write'),'tasks.cancel':C('followups','self-write'),'tasks.dismiss':C('followups','self-write'),
  'prayer.list':C('prayer'),'prayer.mine':C('prayer'),'prayer.create':C('prayer','self-write'),'prayer.delete':C('prayer','self-write'),'prayer.deleteExpired':C('prayer','self-write'),
  'children.pickupCode':C('children','sensitive-read'),'children.parentVerification':C('children','sensitive-read'),'children.status':C('children','sensitive-read'),'children.pickupRequest':C('children','self-write'),'children.workerStatus':C('children','sensitive-read'),
  'admin.console':C(null),'admin.programStatus':C('worship'),'admin.scheduleGenerate':C('worship','admin-write'),'admin.pendingSongs':C('worship'),'admin.memberSearch':C(null),'admin.memberCreate':C(null,'admin-write'),'admin.memberEligibilityQuery':C('worship'),'admin.memberEligibilityUpdate':C('worship','admin-write'),
  'admin.visitors.query':C('visitors'),'admin.eventRsvpList':C('events'),'admin.bulletinUpload':C('publications','admin-write'),'admin.announcementCreate':C('publications','admin-write'),'admin.eventCreate':C('events','admin-write'),'admin.taskCreate':C('followups','admin-write'),'admin.tasks.query':C('followups'),'admin.prayer.list':C('prayer','sensitive-read'),'admin.childrenStatus':C('children','sensitive-read'),
  'admin.reports.query':C('reports'),'admin.communications.query':C(null),'admin.audit.query':C('reports'),'admin.modules.query':C(null),'admin.moduleToggle':C(null,'owner-write')
});
export function capabilityForIntent(id){return chatCapabilityRegistry[id]||C(null);}
