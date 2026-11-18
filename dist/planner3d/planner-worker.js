import {plan} from './planner.mjs';
onmessage=e=>{try{postMessage({route:plan(e.data)})}catch(err){postMessage({error:err.message})}};
