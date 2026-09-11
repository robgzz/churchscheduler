import { config } from '../config.js';
import { ensureStorage } from '../storage/repository.js';
import { seedIfNeeded } from '../services/seed.js';
import { completePastAssignments, generateThreeWeekSchedule } from '../scheduler/engine.js';
import { enqueueAssignmentNotifications, dispatchQueue } from '../communications/notifications.js';
import { syncProgramStatus } from '../communications/programAdmin.js';
import { moduleState } from '../modules/registry.js';

try{
  await ensureStorage();
  await seedIfNeeded(config.churchId);
  const modules=await moduleState(config.churchId);
  const completed=modules.worship?await completePastAssignments(config.churchId):0;
  const generated=modules.worship?await generateThreeWeekSchedule(config.churchId,{source:'scheduled-job'}):{skipped:'worship module disabled'};
  const programStatus=modules.worship?await syncProgramStatus(config.churchId):{skipped:'worship module disabled'};
  const notifications=modules.worship?await enqueueAssignmentNotifications(config.churchId):{queued:0,skipped:'worship module disabled'};
  const delivery=await dispatchQueue(config.churchId,{max:500});
  console.log(JSON.stringify({ok:true,completed,generated,programStatus,notifications,delivery}));
  process.exit(0);
}catch(e){
  console.error(e);
  process.exit(1);
}
