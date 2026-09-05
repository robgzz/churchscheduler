import { config } from '../config.js';
import { ensureStorage } from '../storage/repository.js';
import { seedIfNeeded } from '../services/seed.js';
import { completePastAssignments, generateThreeWeekSchedule } from '../scheduler/engine.js';

try{
  await ensureStorage();
  await seedIfNeeded(config.churchId);
  const completed=await completePastAssignments(config.churchId);
  const generated=await generateThreeWeekSchedule(config.churchId,{source:'scheduled-job'});
  console.log(JSON.stringify({ok:true,completed,generated}));
  process.exit(0);
}catch(e){
  console.error(e);
  process.exit(1);
}
