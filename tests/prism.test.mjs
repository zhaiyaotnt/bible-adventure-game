import test from 'node:test';
import assert from 'node:assert/strict';
import { COLOR, DIR, PRISM_SCRATCH_KEY, applyPrismAction, clearPrismScratch, enumerateSolutions, evaluateBoard, initialPrismState, readPrismScratch, restorePrismState, snapshotPrismState, validateLevel, writePrismScratch } from '../src/stories/noah/prism.js';
import { PRISM_LEVELS, PRISM_LEVEL_BY_ID } from '../src/stories/noah/prismLevels.js';

const mirrorTurn={
  '/':[[DIR.N,DIR.E],[DIR.E,DIR.N],[DIR.S,DIR.W],[DIR.W,DIR.S]],
  '\\':[[DIR.N,DIR.W],[DIR.W,DIR.N],[DIR.S,DIR.E],[DIR.E,DIR.S]],
};
function simpleLevel({source={x:0,y:2,dir:DIR.E,color:COLOR.WHITE},pieces=[],fixed=[],prisms=[],receivers=[],cols=7,rows=5}={}){
  return {id:'test',title:'test',grid:{cols,rows},objective:{type:'simultaneous',receiverIds:receivers.map(r=>r.id)},sources:[{id:'s',...source}],pieces,fixed,mounts:[],prisms,receivers,knownSolutions:[]};
}
test('mirror reflection tables route every incoming direction',()=>{
  for(const [orientation,cases] of Object.entries(mirrorTurn))for(const [incoming,outgoing] of cases){
    const x=2,y=2,[dx,dy]=[[0,-1],[1,0],[0,1],[-1,0]][incoming];
    const level=simpleLevel({source:{x:x-dx,y:y-dy,dir:incoming,color:COLOR.WHITE},pieces:[{id:'m',type:'mirror',fixedAt:{x,y},initialOrientation:orientation}]});
    const state=initialPrismState(level);const evaluation=evaluateBoard(level,state);const exit=evaluation.segments.at(-1);
    assert.equal(exit.dir,outgoing,`${orientation} with incoming ${incoming}`);
  }
});
test('white prism input splits into red-left, green-forward, and blue-right',()=>{
  const level=simpleLevel({source:{x:1,y:3,dir:DIR.E,color:COLOR.WHITE},cols:7,rows:7,prisms:[{id:'p',type:'prism',x:3,y:3,inputDir:DIR.E}],receivers:[{id:'r',x:3,y:1,color:COLOR.RED},{id:'g',x:5,y:3,color:COLOR.GREEN},{id:'b',x:3,y:5,color:COLOR.BLUE}]});
  const evaluation=evaluateBoard(level,initialPrismState(level));assert.deepEqual(new Set(evaluation.activeReceivers),new Set(['r','g','b']));
});
test('colored and reverse-face prism contacts terminate as blocked',()=>{
  for(const source of [{x:1,y:3,dir:DIR.E,color:COLOR.RED},{x:5,y:3,dir:DIR.W,color:COLOR.WHITE}]){
    const level=simpleLevel({source,cols:7,rows:7,prisms:[{id:'p',type:'prism',x:3,y:3,inputDir:DIR.E}]});
    assert.ok(evaluateBoard(level,initialPrismState(level)).blocked.some(b=>b.reason==='prism_back'));
  }
});
test('walls, blockers and closed shutters stop rays; open shutters pass',()=>{
  for(const entity of [{type:'wall',x:2,y:2},{type:'blocker',x:2,y:2}]){
    const level=simpleLevel({fixed:[entity]});assert.equal(evaluateBoard(level,initialPrismState(level)).blocked.at(-1).x,2);
  }
  const closed=simpleLevel({pieces:[{id:'gate',type:'shutter',x:2,y:2,manual:true}]});
  assert.equal(evaluateBoard(closed,initialPrismState(closed)).blocked.at(-1).reason,'shutter');
  const state=initialPrismState(closed),opened=applyPrismAction(closed,state,{type:'toggle',pieceId:'gate'}).state;
  assert.equal(evaluateBoard(closed,opened).blocked.at(-1).reason,'bounds');
});
test('receiver accepts required color and rejects the wrong color',()=>{
  const receiver={id:'r',x:3,y:2,color:COLOR.RED};
  const yes=simpleLevel({source:{x:0,y:2,dir:DIR.E,color:COLOR.RED},receivers:[receiver]});
  const no=simpleLevel({source:{x:0,y:2,dir:DIR.E,color:COLOR.BLUE},receivers:[receiver]});
  assert.deepEqual(evaluateBoard(yes,initialPrismState(yes)).activeReceivers,['r']);assert.deepEqual(evaluateBoard(no,initialPrismState(no)).wrongColorReceivers,['r']);
});
test('beam crossings do not mix or block the paths',()=>{
  const level=simpleLevel({cols:5,rows:5,source:{x:0,y:2,dir:DIR.E,color:COLOR.RED}});level.sources.push({id:'vertical',x:2,y:0,dir:DIR.S,color:COLOR.BLUE});
  const evaluation=evaluateBoard(level,initialPrismState(level));assert.equal(evaluation.blocked.length,2);assert.ok(evaluation.segments.some(s=>s.from.y===2&&s.to.y===2&&s.from.x<2&&s.to.x>2));assert.ok(evaluation.segments.some(s=>s.from.x===2&&s.to.x===2&&s.from.y<2&&s.to.y>2));
});
test('mirror loops terminate through visited state detection',()=>{
  const level=simpleLevel({cols:5,rows:5,source:{x:1,y:2,dir:DIR.N,color:COLOR.WHITE},pieces:[{id:'a',type:'mirror',fixedAt:{x:1,y:1},initialOrientation:'/'},{id:'b',type:'mirror',fixedAt:{x:3,y:1},initialOrientation:'\\'},{id:'c',type:'mirror',fixedAt:{x:3,y:3},initialOrientation:'/'},{id:'d',type:'mirror',fixedAt:{x:1,y:3},initialOrientation:'\\'}]});
  const result=evaluateBoard(level,initialPrismState(level));assert.equal(result.loops.length,1);assert.ok(result.segments.length<100);
});
test('authored levels validate, start unsolved, and intended solutions solve',()=>{
  for(const level of PRISM_LEVELS){assert.equal(validateLevel(level),true);assert.equal(evaluateBoard(level,initialPrismState(level)).solved,false);}
  const stage1=PRISM_LEVEL_BY_ID.stage1;assert.equal(enumerateSolutions(stage1).length,1);
  const stage2=PRISM_LEVEL_BY_ID.stage2;let state=initialPrismState(stage2);
  for(const action of [{type:'rotate',pieceId:'sharedMirror'},{type:'move',pieceId:'channelBlocker',mountId:'blueBlockMount'},{type:'move',pieceId:'channelBlocker',mountId:'greenBlockMount'},{type:'move',pieceId:'sharedMirror',mountId:'blueMount'},{type:'rotate',pieceId:'sharedMirror'}]){const result=applyPrismAction(stage2,state,action);assert.equal(result.changed,true);state=result.state;}
  assert.equal(evaluateBoard(stage2,state).solved,true);
  const stage3=PRISM_LEVEL_BY_ID.stage3,solution=stage3.knownSolutions[0],s3={...initialPrismState(stage3),orientations:solution.orientations,placements:solution.placements};
  assert.deepEqual(evaluateBoard(stage3,s3).activeReceivers.sort(),['blueMist','controlReceiver','greenMist','redMist'].sort());assert.equal(evaluateBoard(stage3,s3).solved,true);
});
test('actions are immutable and reject incompatible or occupied mounts',()=>{
  const level=PRISM_LEVEL_BY_ID.stage2,state=initialPrismState(level),before=JSON.stringify(state);
  assert.equal(applyPrismAction(level,state,{type:'move',pieceId:'sharedMirror',mountId:'greenBlockMount'}).reason,'incompatible_mount');
  assert.equal(applyPrismAction(level,state,{type:'move',pieceId:'channelBlocker',mountId:'greenBlockMount'}).reason,'same_mount');
  assert.equal(JSON.stringify(state),before);
});
test('latching receivers remain charged after their beam moves away',()=>{
  const level=PRISM_LEVEL_BY_ID.stage2;let state=initialPrismState(level);
  state=applyPrismAction(level,state,{type:'rotate',pieceId:'sharedMirror'}).state;
  assert.ok(state.chargedReceivers.includes('redReceiver'));
  state=applyPrismAction(level,state,{type:'move',pieceId:'sharedMirror',mountId:'blueMount'}).state;
  assert.ok(state.chargedReceivers.includes('redReceiver'));
});
test('state snapshots restore orientation, placement, and latching charges',()=>{
  const level=PRISM_LEVEL_BY_ID.stage2;let state=initialPrismState(level);
  state=applyPrismAction(level,state,{type:'rotate',pieceId:'sharedMirror'}).state;state=applyPrismAction(level,state,{type:'move',pieceId:'channelBlocker',mountId:'blueBlockMount'}).state;
  const saved=snapshotPrismState(state);state=applyPrismAction(level,state,{type:'move',pieceId:'sharedMirror',mountId:'blueMount'}).state;
  const restored=restorePrismState(level,saved);assert.equal(restored.orientations.sharedMirror,'/');assert.equal(restored.placements.channelBlocker,'blueBlockMount');assert.deepEqual(restored.chargedReceivers,['redReceiver','greenReceiver']);
});
test('controlled shutters reach a stable fixed point and close when relay power is removed',()=>{
  const level=PRISM_LEVEL_BY_ID.stage3,solution=level.knownSolutions[0],state={...initialPrismState(level),orientations:solution.orientations,placements:solution.placements};
  const on=evaluateBoard(level,state);assert.deepEqual(new Set(on.openShutters),new Set(['shutterOne','shutterTwo']));assert.ok(on.activeReceivers.includes('greenMist'));
  const moved=applyPrismAction(level,state,{type:'move',pieceId:'controlMirror',mountId:'controlDecoyMount'}).state;const off=evaluateBoard(level,moved);
  assert.deepEqual(off.openShutters,[]);assert.ok(!off.activeReceivers.includes('greenMist'));assert.deepEqual(moved.chargedReceivers,[]);
});
test('Stage 3 has no receiver latching and requires simultaneous targets',()=>{
  const level=PRISM_LEVEL_BY_ID.stage3,solution=level.knownSolutions[0],state={...initialPrismState(level),orientations:solution.orientations,placements:solution.placements};
  const result=evaluateBoard(level,state);assert.equal(result.solved,true);assert.deepEqual(state.chargedReceivers,[]);
});
test('scratch storage round trips valid state and rejects malformed data',()=>{
  const storage={value:null,getItem(){return this.value;},setItem(k,v){this.value=v;},removeItem(){this.value=null;}};
  const state=initialPrismState(PRISM_LEVEL_BY_ID.stage2);assert.equal(writePrismScratch(storage,{version:1,stageId:'stage2',state}),true);
  assert.equal(readPrismScratch(storage).stageId,'stage2');assert.deepEqual(restorePrismState(PRISM_LEVEL_BY_ID.stage2,state),state);
  const bad={...state,placements:{...state.placements,channelBlocker:'redMount'}};assert.deepEqual(restorePrismState(PRISM_LEVEL_BY_ID.stage2,bad),initialPrismState(PRISM_LEVEL_BY_ID.stage2));
  for(const impossible of [
    {...state,orientations:{...state.orientations,unexpected:'/'}},
    {...state,orientations:{sharedMirror:'?'}},
    {...state,placements:{sharedMirror:'redMount',channelBlocker:'redMount'}},
    {...state,chargedReceivers:['notAReceiver']},
    {...state,chargedReceivers:['redReceiver','redReceiver']},
  ])assert.deepEqual(restorePrismState(PRISM_LEVEL_BY_ID.stage2,impossible),initialPrismState(PRISM_LEVEL_BY_ID.stage2));
  storage.setItem(PRISM_SCRATCH_KEY,JSON.stringify({version:2,stageId:'stage2',state}));assert.equal(readPrismScratch(storage),null);
  storage.value='x'.repeat(20001);assert.equal(readPrismScratch(storage),null);clearPrismScratch(storage);assert.equal(storage.value,null);assert.equal(PRISM_SCRATCH_KEY,'aaron-bible-adventure:rainbow-prism:v1');
});
