export const Risk=Object.freeze({READ:'read',SENSITIVE_READ:'sensitive-read',SELF_WRITE:'self-write',ADMIN_WRITE:'admin-write',PRIVILEGED_WRITE:'privileged-write',CRITICAL_WRITE:'critical-write'});
export class CapabilityRegistry{
  constructor(){this.items=new Map();}
  register(def){if(!def?.id)throw new Error('Capability requires id');this.items.set(def.id,Object.freeze({risk:Risk.READ,confirm:false,required:[],optional:[],...def}));return this;}
  get(id){return this.items.get(id)||null;}
  list({domain,actor}={}){return [...this.items.values()].filter(x=>(!domain||x.domain===domain)&&(!actor||!x.visibleWhen||x.visibleWhen(actor)));}
  related(entityType){return [...this.items.values()].filter(x=>x.entity===entityType);}
}
