import { SchemaRegistry } from '../../dce/core/schemaRegistry.js';
export const churchSchema=new SchemaRegistry();
[
 ['entity.church','Church'],['entity.member','Member'],['entity.account','Account'],['entity.service','Service'],['entity.service_occurrence','Service occurrence'],['entity.ministry','Ministry'],['entity.program','Program'],['entity.assignment','Assignment'],['entity.song','Song'],['entity.task','Task'],['entity.event','Event'],['entity.prayer_request','Prayer request'],['entity.child','Child'],['entity.publication','Publication'],['entity.module','Module'],['entity.notification','Notification'],['entity.visitor','Visitor']
].forEach(([id,label])=>churchSchema.registerEntity({id,label}));
[
 ['rel.has_service','entity.church','entity.service'],['rel.has_member','entity.church','entity.member'],['rel.assigned_to','entity.member','entity.assignment'],['rel.assignment_program','entity.assignment','entity.program'],['rel.assignment_ministry','entity.assignment','entity.ministry'],['rel.eligible_for','entity.member','entity.ministry'],['rel.available_for','entity.member','entity.service'],['rel.selected_for','entity.song','entity.assignment'],['rel.responsible_for','entity.member','entity.program'],['rel.registered_for','entity.member','entity.event'],['rel.has_task','entity.member','entity.task'],['rel.parent_of','entity.member','entity.child'],['rel.authored_by','entity.prayer_request','entity.member']
].forEach(([id,from,to])=>churchSchema.registerRelation({id,from,to}));
[
 ['entity.member','name','string'],['entity.member','active','boolean'],['entity.member','admin','boolean'],['entity.service','name','string'],['entity.service','startTime','time'],['entity.program','date','date'],['entity.program','ready','boolean'],['entity.song','number','number'],['entity.song','title','string'],['entity.event','date','date'],['entity.event','location','string'],['entity.task','status','string'],['entity.module','enabled','boolean']
].forEach(([entity,id,type])=>churchSchema.registerProperty(entity,{id,type}));
export const churchRelationships=churchSchema.snapshot();
