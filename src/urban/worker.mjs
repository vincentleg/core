import { execute } from './tasks.mjs';
let busy=false;
self.onmessage=async ({data})=>{
  if(busy){self.postMessage({type:'error',message:'Worker busy'});return;}
  busy=true;
  try { const report=await execute(data.catalog,data.request,event=>self.postMessage(event));self.postMessage({type:'complete',report}); }
  catch(e){self.postMessage({type:'error',message:e.message});}
  finally{busy=false;}
};
