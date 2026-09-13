import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V6.1 published announcements and bulletins are editable with attachment replacement/removal',()=>{
  const routes=read('src/routes/admin.js'),admin=read('public/assets/admin.js');
  assert.match(routes,/adminRouter\.put\('\/content\/:id'/);
  assert.match(routes,/contentDocFromRequest/);
  assert.match(routes,/removeAttachment===true/);
  assert.match(routes,/content\.updated/);
  assert.match(admin,/data-edit-content/);
  assert.match(admin,/Edit published content|Editar contenido publicado/);
  assert.match(admin,/notifyMembers/);
});

test('V6.1 member deletion is a guarded admin operation and keeps historical records',()=>{
  const routes=read('src/routes/admin.js'),svc=read('src/services/memberDeletion.js'),ui=read('public/assets/admin.js');
  assert.match(routes,/adminRouter\.delete\('\/people\/:id'/);
  assert.match(svc,/OWNER_DELETE_FORBIDDEN/);
  assert.match(svc,/SELF_DELETE_FORBIDDEN/);
  assert.match(svc,/PROGRAM_ADMIN_DELETE_FORBIDDEN/);
  assert.match(svc,/ACTIVE_CHILD_HANDOFF/);
  assert.match(svc,/String\(a\.dateISO\|\|''\)<today/);
  assert.match(svc,/assignment\.unfilled/);
  assert.match(svc,/member\.deleted/);
  assert.match(ui,/id="delete-member"/);
});

test('V6.1 event and follow-up records can be edited and deleted by administrators',()=>{
  const routes=read('src/routes/hubModules.js'),ui=read('public/assets/admin.js');
  assert.match(routes,/hubModulesRouter\.put\('\/admin\/events\/:id'/);
  assert.match(routes,/hubModulesRouter\.delete\('\/admin\/events\/:id'/);
  assert.match(routes,/hubModulesRouter\.put\('\/admin\/followups\/:id'/);
  assert.match(routes,/hubModulesRouter\.delete\('\/admin\/followups\/:id'/);
  assert.match(ui,/class="btn ghost event-edit"/);
  assert.match(ui,/class="btn secondary follow-edit"/);
});

test('V6.1 deploy restores ACS email configuration from the existing Westbury resource',()=>{
  const workflow=read('.github/workflows/deploy.yml');
  assert.match(workflow,/Discover Westbury ACS email configuration/);
  assert.match(workflow,/Microsoft\.Communication\/communicationServices/);
  assert.match(workflow,/ACS_EMAIL_ENABLED=true/);
  assert.match(workflow,/WestburyChurchofChrist@exonuvia\.com/);
  assert.match(workflow,/ACS_ENDPOINT=\$ACS_ENDPOINT/);
  assert.match(workflow,/ACS_EMAIL_SENDER=\$ACS_EMAIL_SENDER/);
});

test('V6.1 admin alerts can use email and communications UI exposes disabled configuration',()=>{
  const notifications=read('src/communications/notifications.js'),ui=read('public/assets/admin.js');
  assert.match(notifications,/eventKey:`admin:\$\{type\}:\$\{id\}`,channel:'email'/);
  assert.match(ui,/status\.email\?\.enabled&&status\.endpointConfigured/);
  assert.match(ui,/Email delivery is not configured in this app revision/);
});

test('V6.1 content administration only loads data for the selected tab',()=>{
  const ui=read('public/assets/admin.js');
  assert.match(ui,/if\(tab==='news'\)items=await api\('\/api\/admin\/content'\)/);
  assert.match(ui,/else if\(tab==='songs'\)\{songs=await api\('\/api\/admin\/songs'\)/);
  assert.match(ui,/else if\(tab==='inbox'\)\{\[visitors,petitions\]=await Promise\.all/);
});

test('V6.1 member notification and task home lookups use short-lived client cache',()=>{
  const app=read('public/assets/app.js');
  assert.match(app,/cachedApi\('\/api\/member\/notifications',15000\)/);
  assert.match(app,/cachedApi\('\/api\/modules\/followups\/mine',20000\)/);
});

test('V6.1 DCE exposes guarded member profile deletion',()=>{
  const catalog=read('src/chatHub/catalog.js'),handlers=read('src/chatHub/handlers.js'),caps=read('src/chatHub/domain/capabilities.js');
  assert.match(catalog,/I\('admin\.memberDelete'/);
  assert.match(handlers,/memberDeleteStart/);
  assert.match(handlers,/member-delete:confirm/);
  assert.match(handlers,/deleteMemberProfile/);
  assert.match(caps,/\['admin\.memberDelete','members','entity\.member',Risk\.PRIVILEGED_WRITE,true\]/);
});

test('V6.1 Azure readiness probe checks dependencies while startup/liveness remain process probes',()=>{
  const bicep=read('infra/main.bicep');
  assert.match(bicep,/type: 'Readiness', httpGet: \{ path: '\/readyz'/);
  assert.match(bicep,/type: 'Liveness', httpGet: \{ path: '\/healthz'/);
});
