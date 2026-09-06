import { config } from '../config.js';
import { ensureStorage } from '../storage/repository.js';
import { seedIfNeeded } from '../services/seed.js';
import { completePastAssignments, generateThreeWeekSchedule } from '../scheduler/engine.js';
import { enqueueAssignmentNotifications, dispatchQueue } from '../communications/notifications.js';
import { syncProgramStatus } from '../communications/programAdmin.js';

try{
  await ensureStorage();
  await seedIfNeeded(config.churchId);
  const completed=await completePastAssignments(config.churchId);
  const generated=await generateThreeWeekSchedule(config.churchId,{source:'scheduled-job'});
  const programStatus=await syncProgramStatus(config.churchId);
  const notifications=await enqueueAssignmentNotifications(config.churchId);
  const delivery=await dispatchQueue(config.churchId,{max:500});
  console.log(JSON.stringify({ok:true,completed,generated,programStatus,notifications,delivery}));
  process.exit(0);
}catch(e){
  console.error(e);
  process.exit(1);
}
