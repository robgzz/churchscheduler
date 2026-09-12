const fold=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const SUFFIXES=new Set(['jr','sr','ii','iii','iv']);
export function usernameBase({fullName='',firstName='',lastName=''}){
  const tokens=String(fullName||'').trim().split(/\s+/).filter(Boolean);
  const first=String(firstName||tokens[0]||'').trim();
  let last=String(lastName||'').trim();
  if(!last){let i=tokens.length-1;while(i>0&&SUFFIXES.has(fold(tokens[i])))i--;last=tokens[i]||tokens[0]||'';}
  const initial=fold(first).slice(0,1),surname=fold(last);return `${initial}${surname}`||'member';
}
