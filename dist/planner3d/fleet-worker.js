import {plan} from './planner.mjs';
import {scheduleFleet,reverseRoute} from './fleet.mjs';
onmessage=e=>{try{
 const {tasks,scene,settings}=e.data;
 const prepared=[];
 for(const t of tasks){const prior=t.reverseOf&&prepared.find(p=>p.id===t.reverseOf);prepared.push({...t,route:t.route||(prior?reverseRoute(prior.route):plan({...scene,start:t.start,end:t.end,params:t.params}))});}
 postMessage({result:scheduleFleet(prepared,settings)});
}catch(error){postMessage({error:error.message});}};
