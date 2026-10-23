export const DIR = Object.freeze({ N: 0, E: 1, S: 2, W: 3 });
export const COLOR = Object.freeze({ RED: 1, GREEN: 2, BLUE: 4, WHITE: 7 });
export const PRISM_SCRATCH_KEY = 'aaron-bible-adventure:rainbow-prism:v1';
const mirrorTurn = { '/': [DIR.E, DIR.N, DIR.W, DIR.S], '\\': [DIR.W, DIR.S, DIR.E, DIR.N] };
const delta = [[0,-1],[1,0],[0,1],[-1,0]];
const posKey = (x,y) => `${x},${y}`;

export function initialPrismState(level) {
  return { levelId: level.id, orientations: Object.fromEntries(level.pieces.filter(p=>p.type==='mirror').map(p=>[p.id,p.initialOrientation])), placements: Object.fromEntries(level.pieces.filter(p=>p.mountIds).map(p=>[p.id,p.initialMount])), chargedReceivers: [], selectedPieceId: null, moveMode: null, actionCount: 0 };
}
export function snapshotPrismState(state) { return JSON.parse(JSON.stringify(state)); }
export function restorePrismState(level, value) {
  const candidate = { ...initialPrismState(level), ...value, selectedPieceId:null, moveMode:null };
  if (candidate.levelId !== level.id || !validateState(level,candidate)) return initialPrismState(level);
  return candidate;
}
function validateState(level,state) {
  const ids=new Set(level.pieces.map(p=>p.id)), mounts=new Map(level.mounts.map(m=>[m.id,m]));
  if(!state.orientations||!state.placements||!Array.isArray(state.chargedReceivers)||!Number.isSafeInteger(state.actionCount)||state.actionCount<0)return false;
  if(Object.keys(state).some(key=>!['levelId','orientations','placements','chargedReceivers','selectedPieceId','moveMode','actionCount','openShutters'].includes(key)))return false;
  const mirrors=new Set(level.pieces.filter(p=>p.type==='mirror').map(p=>p.id)),movable=new Set(level.pieces.filter(p=>p.mountIds).map(p=>p.id));
  if(Object.keys(state.orientations).length!==mirrors.size||Object.keys(state.placements).length!==movable.size)return false;
  for(const [id,o] of Object.entries(state.orientations))if(!ids.has(id)||!['/','\\'].includes(o))return false;
  const occupied=new Set();
  for(const [id,mountId] of Object.entries(state.placements)){const p=level.pieces.find(x=>x.id===id),m=mounts.get(mountId);if(!p?.mountIds?.includes(mountId)||!m||occupied.has(mountId))return false;occupied.add(mountId);}
  const latchIds=new Set(level.receivers.filter(r=>r.latch).map(r=>r.id));
  if(!state.chargedReceivers.every(id=>latchIds.has(id))||new Set(state.chargedReceivers).size!==state.chargedReceivers.length)return false;
  const manualShutters=new Set(level.pieces.filter(p=>p.type==='shutter'&&p.manual).map(p=>p.id));
  if(state.openShutters&&Object.entries(state.openShutters).some(([id,open])=>!manualShutters.has(id)||typeof open!=='boolean'))return false;
  for(const id of mirrors)if(!Object.hasOwn(state.orientations,id))return false;
  for(const id of movable)if(!Object.hasOwn(state.placements,id))return false;
  return true;
}
export function applyPrismAction(level,state,action) {
  const piece=level.pieces.find(p=>p.id===action?.pieceId); if(!piece)return {state,changed:false,reason:'unknown_piece'};
  const next=snapshotPrismState(state);
  if(action.type==='rotate'){
    if(piece.type!=='mirror'||piece.locked)return {state,changed:false,reason:'locked'};
    next.orientations[piece.id]=next.orientations[piece.id]==='/'?'\\':'/';
  } else if(action.type==='move'){
    if(!piece.mountIds)return {state,changed:false,reason:'locked'};
    if(!piece.mountIds.includes(action.mountId))return {state,changed:false,reason:'incompatible_mount'};
    if(level.pieces.some(p=>p.id!==piece.id&&next.placements[p.id]===action.mountId))return {state,changed:false,reason:'occupied'};
    if(next.placements[piece.id]===action.mountId)return {state,changed:false,reason:'same_mount'};
    next.placements[piece.id]=action.mountId;
  } else if(action.type==='toggle'){
    if(piece.type!=='shutter'||!piece.manual)return {state,changed:false,reason:'locked'};
    next.openShutters??={};next.openShutters[piece.id]=!next.openShutters[piece.id];
  } else return {state,changed:false,reason:'unknown_action'};
  const before=evaluateBoard(level,next), latching=level.receivers.filter(r=>r.latch&&before.activeReceivers.includes(r.id)).map(r=>r.id);
  next.chargedReceivers=[...new Set([...next.chargedReceivers,...latching])];next.actionCount++;
  return {state:next,changed:true,reason:null};
}
function at(list,x,y){return list.find(e=>e.x===x&&e.y===y);}
function mergeSegments(segments){const merged=[];for(const segment of segments){const last=merged.at(-1);if(last&&last.dir===segment.dir&&last.color===segment.color&&last.to.x===segment.from.x&&last.to.y===segment.from.y)last.to={...segment.to};else merged.push({...segment,from:{...segment.from},to:{...segment.to}});}return merged;}
export function evaluateBoard(level,state) {
  let open=new Set(level.pieces.filter(p=>p.type==='shutter'&&p.manual&&state.openShutters?.[p.id]).map(p=>p.id));
  const controlled=level.pieces.filter(p=>p.type==='shutter'&&!p.manual);
  let result;
  for(let pass=0;pass<=controlled.length;pass++){
    result=trace(level,state,open);
    let changed=false;
    for(const shutter of controlled){if(open.has(shutter.id))continue;const controllers=level.receivers.filter(r=>r.relayFor?.includes(shutter.id));if(controllers.some(r=>result.activeReceivers.includes(r.id)||state.chargedReceivers.includes(r.id))){open.add(shutter.id);changed=true;}}
    if(!changed)break;
  }
  result.openShutters=[...open];result.solved=isStageSolved(level,state,result);return result;
}
function trace(level,state,open){
  const segments=[],blocked=[],loops=[],active=new Set(state.chargedReceivers||[]),wrong=new Set();let work=0;
  const walls=level.fixed.filter(x=>x.type==='wall'), receiverMap=new Map(level.receivers.map(r=>[posKey(r.x,r.y),r]));
  const pieceAt=(x,y)=>level.pieces.find(p=>{if(p.mountIds){const m=level.mounts.find(m=>m.id===state.placements[p.id]);return m?.x===x&&m?.y===y;}return p.fixedAt?.x===x&&p.fixedAt?.y===y||p.x===x&&p.y===y;})||level.prisms.find(p=>p.x===x&&p.y===y);
  const max=level.grid.cols*level.grid.rows*4*4*Math.max(1,level.sources.length);
  const queue=level.sources.filter(s=>s.enabled!==false).map(s=>({x:s.x,y:s.y,dir:s.dir,color:s.color,visited:new Set()}));
  while(queue.length){const ray=queue.shift();let {x,y,dir,color}=ray;
    while(true){if(++work>max)throw new Error(`Ray work exceeded for ${level.id}`);const [dx,dy]=delta[dir],nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=level.grid.cols||ny>=level.grid.rows){blocked.push({x,y,reason:'bounds',color});break;}
      const key=`${nx},${ny},${dir},${color}`;if(ray.visited.has(key)){loops.push({x:nx,y:ny,dir,color});break;}ray.visited.add(key);
      segments.push({from:{x,y},to:{x:nx,y:ny},dir,color,termination:null});x=nx;y=ny;
      if(at(walls,x,y)){blocked.push({x,y,reason:'wall',color});break;}
      const fixed=level.fixed.find(f=>f.type==='blocker'&&f.x===x&&f.y===y);if(fixed){blocked.push({x,y,reason:'blocker',color});break;}
      const p=pieceAt(x,y);if(p){
        if(p.type==='mirror'){dir=mirrorTurn[state.orientations[p.id]][dir];continue;}
        if(p.type==='blocker'){blocked.push({x,y,reason:'blocker',color});break;}
        if(p.type==='prism'){
          if(color!==COLOR.WHITE||dir!==p.inputDir){blocked.push({x,y,reason:'prism_back',color});break;}
          const left=(dir+3)%4,right=(dir+1)%4;queue.push({x,y,dir:left,color:COLOR.RED,visited:new Set(ray.visited)},{x,y,dir,color:COLOR.GREEN,visited:new Set(ray.visited)},{x,y,dir:right,color:COLOR.BLUE,visited:new Set(ray.visited)});break;
        }
        if(p.type==='shutter'&&!open.has(p.id)){blocked.push({x,y,reason:'shutter',color});break;}
      }
      const r=receiverMap.get(posKey(x,y));if(r){if((color&r.color)===r.color)active.add(r.id);else wrong.add(r.id);break;}
    }
  }
  return {segments:mergeSegments(segments),activeReceivers:[...active],wrongColorReceivers:[...wrong],openShutters:[...open],blocked,loops,solved:false};
}
export function isStageSolved(level,state,evaluation=evaluateBoard(level,state)) {
  const required=level.objective.receiverIds||[];
  return level.objective.type==='simultaneous'?required.every(id=>evaluation.activeReceivers.includes(id)):required.every(id=>evaluation.activeReceivers.includes(id)||state.chargedReceivers.includes(id));
}
export function validateLevel(level){
  if(!level?.id||!Number.isInteger(level.grid?.cols)||!Number.isInteger(level.grid?.rows))throw new Error('Invalid grid');
  const inBounds=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<level.grid.cols&&y<level.grid.rows;
  const ids=new Set();for(const p of [...level.pieces,...level.receivers,...(level.prisms||[]),...(level.sources||[])]){if(!p.id||ids.has(p.id))throw new Error(`Duplicate id ${p.id}`);ids.add(p.id);}
  const mounts=new Map();for(const m of level.mounts){if(mounts.has(m.id)||!inBounds(m.x,m.y))throw new Error(`Invalid mount ${m.id}`);mounts.set(m.id,m);}
  for(const src of level.sources){if(!inBounds(src.x,src.y)||!Number.isInteger(src.dir)||src.dir<0||src.dir>3||![COLOR.RED,COLOR.GREEN,COLOR.BLUE,COLOR.WHITE].includes(src.color))throw new Error(`Invalid source ${src.id}`);}
  for(const f of level.fixed){if(!['wall','blocker'].includes(f.type)||!inBounds(f.x,f.y))throw new Error(`Invalid fixed object ${f.type}`);}
  for(const prism of level.prisms){if(prism.type!=='prism'||!inBounds(prism.x,prism.y)||!Number.isInteger(prism.inputDir)||prism.inputDir<0||prism.inputDir>3)throw new Error(`Invalid prism ${prism.id}`);}
  for(const p of level.pieces){if(!['mirror','blocker','shutter'].includes(p.type))throw new Error(`Unknown piece type ${p.type}`);if(p.mountIds&&(!p.mountIds.length||p.mountIds.some(id=>!mounts.has(id))))throw new Error(`Invalid mounts for ${p.id}`);if(p.mountIds&&!p.mountIds.includes(p.initialMount))throw new Error(`Invalid initial mount for ${p.id}`);if(p.type==='mirror'&&!['/','\\'].includes(p.initialOrientation))throw new Error(`Invalid mirror ${p.id}`);if(!p.mountIds&&!inBounds(p.fixedAt?.x??p.x,p.fixedAt?.y??p.y))throw new Error(`Invalid position for ${p.id}`);}
  for(const r of level.receivers)if(!inBounds(r.x,r.y)||![COLOR.RED,COLOR.GREEN,COLOR.BLUE,COLOR.WHITE].includes(r.color))throw new Error(`Invalid receiver ${r.id}`);
  const occupied=new Set(),blocked=new Set([...level.fixed,...level.receivers,...level.prisms].map(e=>posKey(e.x,e.y)));
  for(const src of level.sources)blocked.add(posKey(src.x,src.y));
  for(const p of level.pieces){const mount=p.mountIds?mounts.get(p.initialMount):p.fixedAt??p;const key=posKey(mount.x,mount.y);if(blocked.has(key)||occupied.has(key))throw new Error(`Overlapping initial piece ${p.id}`);occupied.add(key);}
  const shutterIds=new Set(level.pieces.filter(p=>p.type==='shutter'&&!p.manual).map(p=>p.id));
  for(const r of level.receivers)for(const id of r.relayFor||[]){if(!shutterIds.has(id))throw new Error(`Unknown controlled shutter ${id}`);const sh=level.pieces.find(p=>p.id===id);if(sh.x===r.x&&sh.y===r.y)throw new Error(`Relay ${id} controls itself`);}
  for(const id of level.objective.receiverIds)if(!level.receivers.some(r=>r.id===id))throw new Error(`Invalid objective ${id}`);
  for(const sol of level.knownSolutions||[]){const state={...initialPrismState(level),...sol};const ev=evaluateBoard(level,state);if(!isStageSolved(level,state,ev))throw new Error(`Known solution does not solve ${level.id}`);}
  return true;
}
export function enumerateSolutions(level,{limit=100000}={}){const found=[];const mirrorPieces=level.pieces.filter(p=>p.type==='mirror'), mountPieces=level.pieces.filter(p=>p.mountIds);let tries=0;
  const recur=(i,state)=>{if(tries++>limit)return;if(i===mirrorPieces.length+mountPieces.length){const ev=evaluateBoard(level,state);if(isStageSolved(level,state,ev))found.push(snapshotPrismState(state));return;}
    if(i<mirrorPieces.length){const p=mirrorPieces[i];for(const o of ['/','\\'])recur(i+1,{...state,orientations:{...state.orientations,[p.id]:o}});return;}
    const p=mountPieces[i-mirrorPieces.length];for(const m of p.mountIds)if(!Object.entries(state.placements).some(([id,v])=>id!==p.id&&v===m))recur(i+1,{...state,placements:{...state.placements,[p.id]:m}});
  };recur(0,initialPrismState(level));return found;}
export function readPrismScratch(storage){try{const raw=storage?.getItem(PRISM_SCRATCH_KEY);if(!raw||raw.length>20000)return null;const v=JSON.parse(raw);return v?.version===1&&typeof v.stageId==='string'&&v.state? v:null;}catch{return null;}}
export function writePrismScratch(storage,scratch){try{if(!storage)return false;const raw=JSON.stringify(scratch);if(raw.length>20000)return false;storage.setItem(PRISM_SCRATCH_KEY,raw);return true;}catch{return false;}}
export function clearPrismScratch(storage){try{storage?.removeItem(PRISM_SCRATCH_KEY);}catch{}}
