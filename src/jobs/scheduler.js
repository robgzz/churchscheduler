import { config } from '../config.js';
import { ensureStorage } from '../storage/repository.js';
import { seedIfNeeded } from '../services/seed.js';
import { completePastAssignments, generateThreeWeekSchedule } from '../scheduler/engine.js';
import { enqueueAssignmentNotifications, dispatchQueue } from '../communications/notifications.js';

try{
  await ensureStorage();
  await seedIfNeeded(config.churchId);
  const completed=await completePastAssignments(config.churchId);
  const generated=await generateThreeWeekSchedule(config.churchId,{source:'scheduled-job'});
  const notifications=await enqueueAssignmentNotifications(config.churchId);
  const delivery=await dispatchQueue(config.churchId,{max:500});
  console.log(JSON.stringify({ok:true,completed,generated,notifications,delivery}));
  process.exit(0);
}catch(e){
  console.error(e);
  process.exit(1);
}
