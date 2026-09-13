export class SchemaRegistry{
  constructor(){this.entities=new Map();this.relations=new Map();this.properties=new Map();}
  registerEntity(def){if(!def?.id)throw new Error('Entity schema requires id');this.entities.set(def.id,Object.freeze({...def}));return this;}
  registerRelation(def){if(!def?.id)throw new Error('Relation schema requires id');this.relations.set(def.id,Object.freeze({...def}));return this;}
  registerProperty(entityId,def){if(!def?.id)throw new Error('Property schema requires id');const key=`${entityId}.${def.id}`;this.properties.set(key,Object.freeze({entityId,...def}));return this;}
  entity(id){return this.entities.get(id)||null;}
  relation(id){return this.relations.get(id)||null;}
  property(entityId,id){return this.properties.get(`${entityId}.${id}`)||null;}
  snapshot(){return {entities:[...this.entities.values()],relations:[...this.relations.values()],properties:[...this.properties.values()]};}
}
