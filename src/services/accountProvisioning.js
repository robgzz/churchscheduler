import { tableNames } from '../config.js';
import { getDoc, listDocs, putDoc, nowIso } from '../storage/repository.js';
import { hashInitialPassword } from '../auth/password.js';
import { sendEmail } from '../communications/service.js';

import { usernameBase } from './accountIdentity.js';
export { usernameBase } from './accountIdentity.js';
export async function nextAvailableUsername(churchId,person,{reserved=new Set()}={}){
  const [users,members]=await Promise.all([listDocs(tableNames.users,churchId,{max:10000}),listDocs(tableNames.members,churchId,{max:10000})]);
  const used=new Set([...users.map(x=>String(x.username||x.id||'').toLowerCase()),...members.map(x=>String(x.username||'').toLowerCase()),...reserved].filter(Boolean));
  const base=usernameBase(person);let u=base,n=2;while(used.has(u)){u=`${base}${n++}`;}return u;
}
export async function provisionMemberAccount(churchId,member,{firstName='',lastName='',initialPassword='welcome',reserved=new Set()}={}){
  if(member.username){const existing=await getDoc(tableNames.users,churchId,member.username);if(existing)return {created:false,username:member.username,member,user:existing};}
  const username=await nextAvailableUsername(churchId,{fullName:member.fullName,firstName,lastName},{reserved});
  const user={id:username,username,memberId:member.id,active:member.active!==false,groups:member.groups||['members'],adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true,password:await hashInitialPassword(initialPassword),mustChangePassword:true,createdAt:nowIso()};
  member.username=username;member.updatedAt=nowIso();
  await putDoc(tableNames.members,churchId,member.id,member,{username,active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
  await putDoc(tableNames.users,churchId,username,user,{memberId:member.id,active:user.active,adminAccess:user.adminAccess,churchAdministrator:user.churchAdministrator});
  reserved.add(username);return {created:true,username,member,user,initialPassword};
}

export async function provisionAccountsBatch(churchId,entries,{initialPassword='welcome'}={}){
  const [users,members]=await Promise.all([listDocs(tableNames.users,churchId,{max:10000}),listDocs(tableNames.members,churchId,{max:10000})]);
  const usersByName=new Map(users.map(u=>[String(u.username||u.id||'').toLowerCase(),u]));
  const used=new Set([...usersByName.keys(),...members.map(m=>String(m.username||'').toLowerCase()).filter(Boolean)]);
  let created=0,preserved=0;const results=[];
  for(const entry of entries){const member=entry.member;const current=String(member.username||'').toLowerCase();if(current&&usersByName.has(current)){preserved++;results.push({created:false,username:current,member,user:usersByName.get(current)});continue;}
    const base=usernameBase({fullName:member.fullName,firstName:entry.firstName,lastName:entry.lastName});let username=base,n=2;while(used.has(username))username=`${base}${n++}`;used.add(username);
    const user={id:username,username,memberId:member.id,active:member.active!==false,groups:member.groups||['members'],adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true,password:await hashInitialPassword(initialPassword),mustChangePassword:true,createdAt:nowIso()};
    member.username=username;member.updatedAt=nowIso();await putDoc(tableNames.members,churchId,member.id,member,{username,active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});await putDoc(tableNames.users,churchId,username,user,{memberId:member.id,active:user.active,adminAccess:user.adminAccess,churchAdministrator:user.churchAdministrator});usersByName.set(username,user);created++;results.push({created:true,username,member,user,initialPassword});
  }
  return {created,preserved,results};
}

export async function emailInitialCredentials(churchId,member,{username,password='welcome',churchName='Westbury Church of Christ'}={}){
  if(!member.email)return {sent:false,reason:'no_email'};
  try{await sendEmail({churchId,to:member.email,displayName:member.fullName||'',subject:`${churchName} Church Hub access`,text:`Hello ${member.fullName||''},\n\nYour Church Hub account is ready.\nUsername: ${username}\nInitial password: ${password}\n\nYou will be required to create a new password of at least 10 characters after signing in.\n`,eventKey:`account-created:${member.id}`,memberId:member.id,metadata:{type:'account.credentials'}});return {sent:true};}catch(error){return {sent:false,reason:String(error.message||error)};}
}
