// Presentation only: adjacent mapped pedestrian edges, walking speed, never straight-line fallback.
export function createWalkers(net, agents) {
  if (!net?.nodes?.length || !net.adj?.length) throw Error('Pedestrian graph unavailable');
  const walkers=agents.map((a,i)=>{const near=net.nearest(a.assignment);const start=Number.isInteger(a.startNode)&&net.adj[a.startNode]?.length?a.startNode:near.i>=0 && near.d<200?net.nearest(net.spread(a.assignment,i%13)).i:Math.floor(i*net.nodes.length/agents.length);return{id:a.id,node:start,previous:-1,next:null,distance:0,pause:i%4};});
  function step(dt,still=false) {
    if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('Invalid animation step');
    return walkers.map((w,i)=>{
      if(!still){
        if(w.pause>0)w.pause=Math.max(0,w.pause-dt);
        else {
          if(w.next===null){const options=net.adj[w.node].filter(e=>e[0]!==w.previous),choices=options.length?options:net.adj[w.node];if(choices.length)w.next=choices[(i+w.node)%choices.length];}
          if(w.next){w.distance+=dt*1.3;if(w.distance>=w.next[1]){w.previous=w.node;w.node=w.next[0];w.next=null;w.distance=0;w.pause=(i%3===0)?1.2:0;}}
        }
      }
      const a=net.nodes[w.node],b=w.next?net.nodes[w.next[0]]:a,k=w.next?Math.min(1,w.distance/Math.max(1e-9,w.next[1])):0;
      return {id:w.id,coordinates:[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k],node:w.node,next:w.next?.[0]??w.node,moving:!still&&w.pause===0&&!!w.next};
    });
  }
  return {step,walkers};
}
