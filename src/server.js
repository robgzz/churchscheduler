import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { config } from './config.js';
import { ensureStorage } from './storage/repository.js';
import { seedIfNeeded } from './services/seed.js';
import { attachIdentity } from './auth/middleware.js';
import { localizationMiddleware, localizeError } from './i18n.js';
import { setupRouter } from './routes/setup.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { memberRouter } from './routes/member.js';
import { adminRouter } from './routes/admin.js';
import { ownerRouter } from './routes/owner.js';
import { requireCsrf, sameOriginWrite } from './security/csrf.js';

const app=express();
app.set('trust proxy',1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy:{directives:{
    defaultSrc:["'self'"],
    scriptSrc:["'self'"],
    styleSrc:["'self'","'unsafe-inline'"],
    imgSrc:["'self'",'data:','blob:'],
    connectSrc:["'self'"],
    fontSrc:["'self'",'data:'],
    objectSrc:["'none'"],
    baseUri:["'self'"],
    frameAncestors:["'none'"],
    formAction:["'self'"]
  }},
  crossOriginEmbedderPolicy:false,
  referrerPolicy:{policy:'no-referrer'},
  hsts: config.nodeEnv==='production' ? {maxAge:31536000,includeSubDomains:true,preload:true} : false
}));
app.use((_req,res,next)=>{res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');next();});
app.use(compression({threshold:1024}));
app.use(express.json({limit:'12mb'}));
app.use(cookieParser());
app.use(localizationMiddleware);
app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
app.use(sameOriginWrite);
app.use(attachIdentity);
app.use(requireCsrf);
app.get('/healthz',(req,res)=>res.json({ok:true,version:'3.5.1'}));
app.get('/readyz',async(req,res)=>{try{await ensureStorage();res.json({ok:true,version:'3.5.1'});}catch(e){res.status(503).json({ok:false,error:'storage_unavailable'});}});
app.use('/api/setup',setupRouter);
app.use('/api/auth',authRouter);
app.use('/api/public',publicRouter);
app.use('/api/member',memberRouter);
app.use('/api/admin',adminRouter);
app.use('/api/owner',ownerRouter);

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
app.use(express.static(root,{maxAge:config.nodeEnv==='production'?'1h':0,index:false}));
app.get('/admin',(_req,res)=>res.sendFile(path.join(root,'admin','index.html')));
app.get('/admin/',(_req,res)=>res.sendFile(path.join(root,'admin','index.html')));
app.use((req,res,next)=>{
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(root,'index.html'));
});

app.use((err,req,res,next)=>{
  console.error(err);
  if(res.headersSent) return next(err);
  res.status(err.statusCode||500).json({error:localizeError(err.message||'Server error',req.locale)});
});

await ensureStorage();
await seedIfNeeded(config.churchId);
app.listen(config.port,()=>console.log(`Westbury Church Hub V3.5.1 listening on ${config.port}`));
