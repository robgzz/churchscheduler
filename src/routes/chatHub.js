import express from 'express';
import { requireLogin } from '../auth/middleware.js';
import { requireModule } from '../modules/registry.js';
import { chatRateLimiter } from '../security/rateLimit.js';
import { processChat } from '../chatHub/engine.js';

export const chatHubRouter=express.Router();
chatHubRouter.use(requireLogin,requireModule('chatHub'),chatRateLimiter);
chatHubRouter.post('/message',async(req,res,next)=>{try{
  const message=String(req.body?.message||'').slice(0,2000),action=String(req.body?.action||'').slice(0,160),attachment=req.body?.attachment||null,screenContext=req.body?.screenContext&&typeof req.body.screenContext==='object'?req.body.screenContext:{};
  if(!message&&!action&&!attachment)return res.status(400).json({error:'Message, action, or attachment is required.',code:'CHAT_INPUT_REQUIRED'});
  res.json(await processChat(req,{message,action,attachment,screenContext}));
}catch(e){next(e);}});
