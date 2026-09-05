const $=(s,r=document)=>r.querySelector(s);
const main=$('#main'), nav=$('#bottom-nav'), pageTitle=$('#page-title'), churchName=$('#church-name'), logoutBtn=$('#logout-btn');
const state={bootstrap:null,me:null,visitor:false,tab:'home'};

function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function fmtDate(iso){return new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(new Date(`${iso}T12:00:00`));}
function fmtTime(t){const [h,m]=String(t||'00:00').split(':').map(Number);return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(2020,0,1,h,m));}
async function api(url,opt={}){const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt}); const text=await r.text(); let data={};try{data=text?JSON.parse(text):{};}catch{data={error:text}} if(!r.ok) throw new Error(data.error||`Request failed (${r.status})`);return data;}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2600);}

function applyTheme(mode=localStorage.getItem('church-theme')||'system'){
  localStorage.setItem('church-theme',mode);
  const dark=mode==='dark'||(mode==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme=dark?'dark':'light';
  $('#theme-color')?.setAttribute('content',dark?'#08111f':'#f6f7fb');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if((localStorage.getItem('church-theme')||'system')==='system')applyTheme('system')});
applyTheme();
if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(()=>{});

function groups(){return state.me?.member?.groups||[];} function isWorship(){return groups().includes('worship')} function isMember(){return groups().includes('members')} function isAdmin(){return state.me?.member?.adminAccess||state.me?.user?.adminAccess||state.me?.user?.churchAdministrator} function isOwner(){return state.me?.member?.churchAdministrator||state.me?.user?.churchAdministrator}

async function init(){
  state.bootstrap=await api('/api/public/bootstrap');
  churchName.textContent=state.bootstrap.church?.churchName||'Church';
  const setup=await api('/api/setup/status');
  if(!setup.ownerConfigured){renderSetup(setup);return;}
  try{state.me=await api('/api/auth/me');if(state.me)state.bootstrap=await api('/api/public/bootstrap');}catch{}
  if(!state.me&&!state.visitor){renderLogin();return;}
  renderApp();
}

function renderSetup(setup){
  nav.classList.add('hidden');logoutBtn.classList.add('hidden');pageTitle.textContent='First-time setup';
  main.innerHTML=`<div class="login-wrap"><div class="center"><img class="hero-logo" src="/assets/icon-192.png"><h2>Set up the Church Administrator</h2><p class="muted">This is required once after the Azure deployment.</p></div><form id="setup-form" class="card stack">
  <div class="field"><label>Bootstrap code</label><input class="input" name="bootstrapCode" autocomplete="one-time-code" required></div>
  <div class="field"><label>Administrator username</label><input class="input" name="username" value="${esc(setup.initialOwnerUsername||'churchadmin')}" required></div>
  <div class="field"><label>Password</label><input class="input" name="password" type="password" minlength="10" required><span class="tiny muted">At least 10 characters.</span></div>
  <div class="field"><label>Name (only used if username does not match a migrated member)</label><input class="input" name="fullName"></div>
  <button class="btn full">Create Church Administrator</button></form></div>`;
  $('#setup-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/api/setup/owner',{method:'POST',body:JSON.stringify(Object.fromEntries(f))});toast('Administrator created');location.reload();}catch(err){toast(err.message)}};
}

function renderLogin(){
  nav.classList.add('hidden');logoutBtn.classList.add('hidden');pageTitle.textContent='Welcome';
  main.innerHTML=`<div class="login-wrap"><div class="center"><img class="hero-logo" src="/assets/icon-192.png"><h2>${esc(state.bootstrap.church?.churchName||'Church')}</h2><p class="muted">Sign in to see your assignments and church information.</p></div>
  <form id="login-form" class="card stack"><div class="field"><label>Username</label><input class="input" name="username" autocomplete="username" required></div><div class="field"><label>Password</label><input class="input" name="password" type="password" autocomplete="current-password" required></div><button class="btn full">Sign in</button><button type="button" class="btn secondary full" id="visitor-btn">Continue as visitor</button></form></div>`;
  $('#login-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{state.me=await api('/api/auth/login',{method:'POST',body:JSON.stringify(Object.fromEntries(f))});state.bootstrap=await api('/api/public/bootstrap');renderApp()}catch(err){toast(err.message)}};
  $('#visitor-btn').onclick=()=>{state.visitor=true;renderApp()};
}

function navItems(){
  if(state.visitor) return [{id:'home',ico:'⌂',label:'Home'},{id:'church',ico:'⛪',label:'Church'},{id:'connect',ico:'♡',label:'Connect'}];
  const items=[{id:'home',ico:'⌂',label:'Home'}];
  if(isWorship()) items.push({id:'schedule',ico:'◷',label:'Schedule'});
  items.push({id:'church',ico:'⛪',label:'Church'});
  if(isMember()) items.push({id:'petitions',ico:'♡',label:'Petitions'});
  items.push({id:'profile',ico:'○',label:'Profile'});return items;
}
function renderNav(){nav.classList.remove('hidden');nav.innerHTML=navItems().map(i=>`<button class="nav-btn ${state.tab===i.id?'active':''}" data-tab="${i.id}"><span class="ico">${i.ico}</span>${i.label}</button>`).join('');nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderApp()})}

function renderApp(){logoutBtn.classList.toggle('hidden',!state.me);logoutBtn.onclick=async()=>{await api('/api/auth/logout',{method:'POST'}).catch(()=>{});state.me=null;state.visitor=false;state.tab='home';state.bootstrap=await api('/api/public/bootstrap').catch(()=>state.bootstrap);renderLogin()};renderNav();const labels={home:'Home',schedule:'Schedule',church:'Church',petitions:'Petitions',profile:'Profile',connect:'Connect'};pageTitle.textContent=labels[state.tab]||'Home';if(state.tab==='home')return renderHome();if(state.tab==='schedule')return renderSchedule();if(state.tab==='church')return renderChurch();if(state.tab==='petitions')return renderPetitions();if(state.tab==='profile')return renderProfile();if(state.tab==='connect')return renderConnect();}

async function renderHome(){
  const services=state.bootstrap.services||[];let next='';
  if(state.me&&isWorship()){try{const a=await api('/api/member/assignments');const n=a[0];if(n)next=`<div class="card accent"><div class="eyebrow">Your next assignment</div><div class="service-name">${esc(n.service?.labelEs||n.service?.label||'Service')}</div><div class="row between"><div><div class="assignment-label">${esc(n.ministryId.replace('ministry_','').replaceAll('_',' '))}</div><div class="assignment-name">${fmtDate(n.dateISO)} · ${fmtTime(n.service?.startTime)}</div></div><button class="btn secondary" id="home-schedule">View</button></div></div>`;else next=`<div class="card"><strong>No assignments in the next three weeks.</strong><p class="muted small">Your schedule is clear right now.</p></div>`;}catch{}
  }
  main.innerHTML=`${state.me?`<div><div class="eyebrow">Good to see you</div><h2>${esc(state.me.member?.fullName||state.me.user?.username||'')}</h2></div>`:`<div><div class="eyebrow">Welcome</div><h2>${esc(state.bootstrap.church?.churchName||'Church')}</h2></div>`}${next}<div class="section-title"><h3>Usual services</h3></div><div class="stack">${services.map(s=>`<div class="card flat row between"><div><strong>${esc(s.labelEs||s.label)}</strong><div class="small muted">${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][s.recurrence?.weekday||0]}</div></div><span class="badge">${fmtTime(s.startTime)}</span></div>`).join('')}</div><div class="section-title"><h3>Latest church news</h3><button class="btn ghost" id="home-church">See all</button></div>${contentCards((state.bootstrap.content||[]).filter(x=>x.kind==='announcement').slice(0,2))}`;
  $('#home-schedule')?.addEventListener('click',()=>{state.tab='schedule';renderApp()});$('#home-church')?.addEventListener('click',()=>{state.tab='church';renderApp()});
}

function contentCards(items){if(!items.length)return `<div class="card empty">Nothing new right now.</div>`;return `<div class="stack">${items.map(x=>`<div class="card"><div class="row between"><span class="badge">${esc(x.kind)}</span><span class="tiny muted">${x.publishedAt?fmtDate(x.publishedAt.slice(0,10)):''}</span></div><h3 style="margin-top:10px">${esc(x.title)}</h3><p class="muted">${esc(x.body||'')}</p>${x.attachment?`<a class="btn secondary full" href="/api/public/files/${encodeURIComponent(x.id)}" target="_blank">Open attachment</a>`:''}</div>`).join('')}</div>`}

async function renderSchedule(){if(!isWorship()){state.tab='home';return renderApp()}main.innerHTML=`<div class="card empty">Loading schedule…</div>`;try{const [assignments,programs]=await Promise.all([api('/api/member/assignments'),api('/api/member/programs')]);main.innerHTML=`<div class="section-title"><h3>My assignments</h3></div>${assignments.length?`<div class="stack">${assignments.map(a=>`<div class="card accent"><div class="row between"><div><strong>${esc(a.service?.labelEs||a.service?.label||'Service')}</strong><div class="small muted">${fmtDate(a.dateISO)} · ${fmtTime(a.service?.startTime)}</div></div><span class="badge">${esc(a.ministry?.label||a.programLabels?.[0]||'Assignment')}</span></div><div class="small" style="margin-top:10px">${esc((a.programLabels||[]).join(' · '))}</div><button class="btn secondary full replacement-btn" data-assignment="${esc(a.id)}" style="margin-top:12px">Request replacement</button></div>`).join('')}</div>`:`<div class="card empty">No assignments in the next three weeks.</div>`}<div class="section-title"><h3>Worship programs</h3></div>${programs.length?programs.map(programCard).join(''):`<div class="card empty">No programs generated yet.</div>`}`;main.querySelectorAll('.replacement-btn').forEach(b=>b.onclick=async()=>{if(!confirm('Request a replacement for this assignment? The scheduler will automatically assign the fairest eligible volunteer.'))return;try{b.disabled=true;const r=await api(`/api/member/replacement/${encodeURIComponent(b.dataset.assignment)}`,{method:'POST'});toast(r.penaltyEligible?'Replacement made. This was a current-week request.':'Replacement made. No reliability adjustment applied.');renderSchedule()}catch(e){toast(e.message);b.disabled=false}})}catch(e){main.innerHTML=`<div class="card attention">${esc(e.message)}</div>`}}
function programCard(p){return `<div class="card service-card"><div class="service-head"><div><div class="service-name">${esc(p.service?.labelEs||p.service?.label||p.serviceId)}</div><div class="muted small">${fmtDate(p.dateISO)} · ${fmtTime(p.startTime)}</div></div><span class="badge ${p.items?.some(i=>i.assignees.some(a=>!a.memberId))?'warn':'success'}">${p.items?.some(i=>i.assignees.some(a=>!a.memberId))?'Needs attention':'Ready'}</span></div><div>${(p.items||[]).map(i=>`<div class="assignment"><div><div class="assignment-label">${esc(i.label)}</div>${i.assignees.map(a=>`<div class="assignment-name">${esc(a.fullName)}</div>`).join('')}</div></div>`).join('')}</div></div>`}

function renderChurch(){const content=(state.bootstrap.content||[]).filter(x=>['announcement','bulletin'].includes(x.kind));main.innerHTML=`<div class="pill-tabs"><button class="pill active">News & Bulletin</button></div>${contentCards(content)}`}
function renderPetitions(){if(!isMember()){state.tab='home';return renderApp()}main.innerHTML=`<div class="card"><h2>Send a petition</h2><p class="muted small">Your request will be sent to the church administrators.</p><form id="petition-form" class="stack"><div class="field"><label>Prayer request</label><textarea class="textarea" name="text" required></textarea></div><label class="check-row"><input type="checkbox" name="private"><span><strong>Private petition</strong><div class="tiny muted">Only administrators should see this.</div></span></label><button class="btn full">Send petition</button></form></div>`;$('#petition-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/api/member/petitions',{method:'POST',body:JSON.stringify({text:f.get('text'),private:f.get('private')==='on'})});e.target.reset();toast('Petition sent')}catch(err){toast(err.message)}}}

function renderConnect(){main.innerHTML=visitorFormHtml();bindVisitorForm()}
function visitorFormHtml(){return `<div class="card"><h2>We'd love to know you</h2><p class="muted small">Share as much information as you are comfortable with.</p><form id="visitor-form" class="stack"><div class="field"><label>Name</label><input class="input" name="fullName" required></div><div class="field"><label>Phone</label><input class="input" name="phone" inputmode="tel"></div><div class="field"><label>Email</label><input class="input" name="email" type="email"></div><div class="field"><label>Address</label><input class="input" name="address"></div><label class="check-row"><input type="checkbox" name="firstVisit"><span>First time visiting</span></label><div class="field"><label>Prayer request or note</label><textarea class="textarea" name="prayerRequest"></textarea></div><button class="btn full">Send visitor card</button></form></div>`}
function bindVisitorForm(){const f=$('#visitor-form');if(!f)return;f.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));d.firstVisit=d.firstVisit==='on';try{await api('/api/public/visitor-contact',{method:'POST',body:JSON.stringify(d)});f.reset();toast('Thank you. Your information was sent.')}catch(err){toast(err.message)}}}

function renderProfile(){if(!state.me){main.innerHTML=visitorFormHtml();bindVisitorForm();return}const m=state.me.member;main.innerHTML=`<div class="card stack"><div class="row"><div class="avatar">${esc((m.fullName||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join(''))}</div><div><h2>${esc(m.fullName)}</h2><div class="muted small">${esc(m.email||m.username||'')}</div></div></div><div><span class="badge">${(m.groups||[]).map(esc).join(' · ')}</span></div>${isAdmin()?`<a class="btn full" href="/admin/">Open Admin Console</a>`:''}</div>${state.me.user?.mustChangePassword?`<div class="attention"><span class="ico">!</span><div><strong>Password change required</strong><div class="small">Please choose your own password below.</div></div></div>`:''}<div class="card stack"><h3>Security</h3><form id="password-form" class="stack"><div class="field"><label>Current password</label><input class="input" type="password" name="currentPassword" autocomplete="current-password" required></div><div class="field"><label>New password</label><input class="input" type="password" name="newPassword" minlength="10" autocomplete="new-password" required></div><button class="btn secondary full">Change password</button></form></div><div class="card stack"><h3>Appearance</h3><div class="field"><label>Theme</label><select class="select" id="theme-select"><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></select></div></div>${isWorship()?`<div class="card stack"><h3>Proactive unavailability</h3><p class="muted small">Entering time away here does not count against your scheduling reliability.</p><form id="unav-form" class="stack"><div class="row"><div class="field grow"><label>From</label><input class="input" type="date" name="from" required></div><div class="field grow"><label>To</label><input class="input" type="date" name="to" required></div></div><div class="field"><label>Note (optional)</label><input class="input" name="note"></div><button class="btn secondary full">Save unavailability</button></form></div>`:''}`;
  const sel=$('#theme-select');sel.value=localStorage.getItem('church-theme')||'system';sel.onchange=()=>applyTheme(sel.value);
  $('#password-form')?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{await api('/api/auth/change-password',{method:'POST',body:JSON.stringify(d)});state.me=await api('/api/auth/me');e.target.reset();toast('Password changed');renderProfile()}catch(err){toast(err.message)}});
  $('#unav-form')?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{const r=await api('/api/member/unavailability',{method:'POST',body:JSON.stringify(d)});toast(r.affected?`Saved. ${r.affected} assignment(s) were reassigned.`:'Unavailability saved');state.me=await api('/api/auth/me');renderProfile()}catch(err){toast(err.message)}});
}

init().catch(e=>{main.innerHTML=`<div class="card attention">${esc(e.message)}</div>`});
