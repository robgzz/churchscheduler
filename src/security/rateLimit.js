const buckets = new Map();

function now(){ return Date.now(); }
function cleanup(){
  const t=now();
  for(const [k,v] of buckets) if(v.resetAt<=t) buckets.delete(k);
}
setInterval(cleanup, 10*60*1000).unref?.();

export function rateLimit({windowMs=15*60*1000,max=10,keyFn,message='Too many requests. Please try again later.'}={}){
  return (req,res,next)=>{
    const key=String(keyFn?keyFn(req):(req.ip||req.socket?.remoteAddress||'unknown')).toLowerCase();
    const t=now();
    let hit=buckets.get(key);
    if(!hit||hit.resetAt<=t) hit={count:0,resetAt:t+windowMs};
    hit.count++;
    buckets.set(key,hit);
    res.setHeader('RateLimit-Limit',String(max));
    res.setHeader('RateLimit-Remaining',String(Math.max(0,max-hit.count)));
    res.setHeader('RateLimit-Reset',String(Math.ceil(hit.resetAt/1000)));
    if(hit.count>max){
      res.setHeader('Retry-After',String(Math.max(1,Math.ceil((hit.resetAt-t)/1000))));
      return res.status(429).json({error:message,code:'RATE_LIMITED'});
    }
    next();
  };
}

export const loginIpLimiter=rateLimit({windowMs:15*60*1000,max:30,keyFn:req=>`login-ip:${req.ip||'unknown'}`});
export const loginAccountLimiter=rateLimit({windowMs:15*60*1000,max:10,keyFn:req=>`login-user:${String(req.body?.username||'').trim().toLowerCase()}:${req.ip||'unknown'}`});
export const setupLimiter=rateLimit({windowMs:60*60*1000,max:8,keyFn:req=>`setup:${req.ip||'unknown'}`});
export const publicWriteLimiter=rateLimit({windowMs:15*60*1000,max:20,keyFn:req=>`public-write:${req.ip||'unknown'}`});

export const chatRateLimiter=rateLimit({windowMs:60*1000,max:45,keyFn:req=>`chat:${req.identity?.member?.id||req.identity?.user?.username||req.ip||'unknown'}`,message:'Chat Hub is receiving too many requests. Please wait a moment.'});
