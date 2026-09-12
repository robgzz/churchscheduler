export function isAdmin(identity){return identity?.member?.adminAccess===true||identity?.member?.churchAdministrator===true||identity?.user?.adminAccess===true||identity?.user?.churchAdministrator===true;}
export function isOwner(identity){return identity?.member?.churchAdministrator===true||identity?.user?.churchAdministrator===true;}
export function groups(identity){return identity?.member?.groups||identity?.user?.groups||[];}
export function authorize(identity,capability){
  if(!identity)return false;
  if(capability==='read.self')return true;
  if(capability==='read.members')return groups(identity).includes('members')||groups(identity).includes('worship')||isAdmin(identity);
  if(capability==='write.self')return true;
  if(capability==='admin')return isAdmin(identity);
  if(capability==='owner')return isOwner(identity);
  return false;
}
