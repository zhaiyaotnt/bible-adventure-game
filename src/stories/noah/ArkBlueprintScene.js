import Phaser from 'phaser';
import { text, renderScale } from '../../scenes/art.js';
import { BUILD_SCRATCH_KEY, rollStageSetup, normalizeStageSetup } from './buildSetup.js';

const ink = '#273e38';
const wood = 0xb98453;
const darkWood = 0x8a5a34;

// Building the ark happens on the ark itself, in three stages:
// 1) fit the keel and turn the ribs upright, 2) support posts, then the
// three decks (a deck with no post under it sags back), 3) pitch the
// seams, set the door and window, and pass the rain test.
// Stage progress lives in boolean questFlags (the save validator only
// allows booleans) and the meadow background swaps as stages complete.
export class ArkBlueprintScene extends Phaser.Scene {
  constructor(){super('ArkBlueprint');}
  init({story}){this.story=story;}
  flags(){return this.app.save.stories[this.story.id].questFlags;}
  create(){
    this.app=this.game.registry.get('app');
    this.phonePortrait=window.innerHeight>window.innerWidth;
    document.body.classList.add('blueprint-mode');
    this.events.once('shutdown',()=>document.body.classList.remove('blueprint-mode'));
    this.app.setPrompt('');
    this.app.save.current.x=undefined;this.app.save.current.y=undefined;this.app.persist();
    // Side-view build site: CX is the ark centre, BASE the ground line.
    this.CX=480;this.BASE=this.phonePortrait?430:452;this.S=this.phonePortrait?.56:.9;
    const f=this.flags();
    this.stage=f.blueprint_complete?0:(f.ark_decks_done?3:(f.ark_ribs_done||f.blueprint_stage_one)?2:1);
    this.visualStage=f.blueprint_complete?3:this.stage;
    this.selected=null;this.dragging=null;this.raining=false;
    this.input.on('pointerdown',p=>this.pickAt(p));
    this.input.on('pointermove',p=>this.pointerMove(p));
    this.input.on('pointerup',p=>this.pointerUp(p));
    this.input.keyboard.on('keydown-R',()=>this.rotateSelected());
    this.input.keyboard.on('keydown-ESC',()=>this.leave());
    this.drawSky();
    // Frame the whole stage by default: under ENVELOP the browser shows
    // only the centre slice of the canvas, so without this the ark's ends
    // and the piece trays fall off-screen on portrait phones. Players can
    // pinch (or mouse-wheel) in up to 3x from the fit level.
    this.fitZoom=this.computeFitZoom();this.userZoom=1;
    const cam=this.cameras.main;cam.setZoom(this.fitZoom*renderScale(this));cam.centerOn(480,320);
    this.setupZoomGestures();
    this.board=this.add.container(0,0);this.pieces=[];this.slots=[];
    if(this.stage===0)this.drawCompletion();
    else{this.drawStage();this.updateHUD();}
  }
  computeFitZoom(){
    const parent=this.scale.parentSize,game=this.scale.gameSize;
    const parentAspect=parent.width/Math.max(1,parent.height),gameAspect=game.width/game.height;
    return Math.min(parentAspect,gameAspect)/Math.max(parentAspect,gameAspect);
  }
  applyZoom(){
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.fitZoom*this.userZoom,this.fitZoom,this.fitZoom*3)*renderScale(this));
  }
  setupZoomGestures(){
    this.input.addPointer(1);
    const active=new Map();let lastDist=0;
    const track=p=>active.set(p.id,{x:p.x,y:p.y});
    this.input.on('pointerdown',p=>{
      track(p);
      if(active.size===2){this.dragging=null;const [a,b]=[...active.values()];lastDist=Math.hypot(a.x-b.x,a.y-b.y);}
    });
    this.input.on('pointermove',p=>{
      if(!active.has(p.id))return;
      track(p);
      if(active.size===2){
        const [a,b]=[...active.values()],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(lastDist>0&&d>0){this.userZoom=Phaser.Math.Clamp(this.userZoom*d/lastDist,1,3);this.applyZoom();}
        lastDist=d;
      }
    });
    const release=p=>{active.delete(p.id);lastDist=0;};
    this.input.on('pointerup',release);
    this.input.on('pointerupoutside',release);
    this.input.on('pointercancel',release);
    this.input.on('wheel',(pointer,currentlyOver,deltaX,deltaY)=>{
      if(deltaY)this.userZoom=Phaser.Math.Clamp(this.userZoom*(deltaY<0?1.12:.89),1,3),this.applyZoom();
    });
  }
  updateHUD(){
    const objectives={1:'Fit the keel and turn the ribs upright.',2:'Set the support posts, then lay the three decks.',3:'Pitch the seams, set the door and window, then test with rain.'};
    this.app.showHUD('Build the Ark',objectives[this.stage]||'The ark is finished!','GENESIS 6:14–16 · BUILDING WITH NOAH');
  }
  drawSky(){
    this.add.rectangle(480,320,960,640,0x8fb8d8);
    this.add.ellipse(480,120,1200,420,0xa8cbe4,.8);
    this.add.ellipse(150,90,300,80,0xffffff,.85);this.add.ellipse(790,70,340,90,0xffffff,.8);this.add.ellipse(480,660,1300,360,0x77a05e);
    this.add.rectangle(480,this.BASE+64,960,150,0xcbb27f);
    this.add.rectangle(480,this.BASE+2,960,6,0xa68d5c);
  }
  X(x){return this.CX+x*this.S;}
  Y(y){return this.BASE+y*this.S;}
  drawStage(){
    this.board.removeAll(true);this.pieces=[];this.slots=[];this.rainButton=null;this.rotateBtn=null;this.zones=[];
    this.addTopButton();
    this.drawArkBase();
    if(this.stage===1)this.drawRibStage();
    else if(this.stage===2)this.drawDeckStage();
    else this.drawSealStage();
  }
  addTopButton(){
    // Portrait: pin to the top-left corner — centred, it overlaps the title.
    const b=text(this,this.phonePortrait?118:876,this.phonePortrait?16:64,'← Meadow',{fontFamily:'Arial',fontSize:this.phonePortrait?'19px':'15px',color:ink,backgroundColor:'#e2d1a7',padding:{x:13,y:10}}).setOrigin(this.phonePortrait?0:1,0).setInteractive({useHandCursor:true});
    b.on('pointerdown',()=>this.leave());
    this.board.add(b);this.addZone(b,()=>this.leave());
    if(this.stage>0){
      const reset=text(this,this.phonePortrait?842:690,this.phonePortrait?16:64,'↺ Reset stage',{fontFamily:'Arial',fontSize:this.phonePortrait?'18px':'14px',color:ink,backgroundColor:'#e2d1a7',padding:{x:12,y:10}}).setOrigin(1,0).setInteractive({useHandCursor:true});
      reset.on('pointerdown',()=>this.resetStage());this.board.add(reset);this.addZone(reset,()=>this.resetStage());
    }
  }
  stageTitle(title,sub){
    // Portrait now frames the whole stage at fit zoom (~0.31), which
    // shrinks canvas text to a few pixels — so portrait fonts are much
    // larger than they were in the old cropped view.
    this.board.add(text(this,480,this.phonePortrait?74:96,title,{fontFamily:'Georgia',fontSize:this.phonePortrait?'31px':'24px',fontStyle:'bold',color:ink,align:'center',wordWrap:{width:this.phonePortrait?620:820}}).setOrigin(.5));
    this.board.add(text(this,480,this.phonePortrait?126:130,sub,{fontFamily:'Georgia',fontSize:this.phonePortrait?'22px':'16px',color:'#42503f',align:'center',wordWrap:{width:this.phonePortrait?600:760}}).setOrigin(.5));
  }
  // The ark side view grows with progress: bare ribs first, planked lower
  // hull next, then the full hull with its roof house for sealing.
  drawArkBase(){
    const g=this.add.graphics();this.board.add(g);const S=this.S,v=this.visualStage??this.stage;
    // Scaffolding poles at both ends while building is underway.
    if(v<3||!this.flags().ark_sealed_done){
      g.lineStyle(5,0x9a7a52,.9);
      for(const px of [-330,330]){g.lineBetween(this.X(px),this.Y(6),this.X(px),this.Y(-235));g.lineBetween(this.X(px-26),this.Y(-120),this.X(px+26),this.Y(-120));}
    }
    // Keel.
    g.fillStyle(0x6e4c2e).fillRect(this.X(-315),this.Y(-4),630*S,10*S);
    // Ribs: stations along the hull, always visible as the frame.
    g.lineStyle(Math.max(4,7*S),0xa9743f);
    for(const rx of [-270,-180,-90,0,90,180,270]){
      g.beginPath();g.arc(this.X(rx),this.Y(-8),86*S,Math.PI,2*Math.PI);g.strokePath();
    }
    if(v>=2){
      // Lower hull planks below the waterline of the frame.
      g.fillStyle(0xb0824f);
      g.fillPoints([{x:this.X(-300),y:this.Y(-88)},{x:this.X(300),y:this.Y(-88)},{x:this.X(262),y:this.Y(-4)},{x:this.X(-262),y:this.Y(-4)}],true);
      g.lineStyle(2,0x7d5a38);
      for(const py of [-66,-44,-22])g.lineBetween(this.X(-292+ (py+88)*.2),this.Y(py),this.X(292-(py+88)*.2),this.Y(py));
    }
    if(v>=3){
      // Full hull + roof house, ready for pitch, door and window.
      g.fillStyle(0xba8b57);
      g.fillPoints([{x:this.X(-308),y:this.Y(-196)},{x:this.X(308),y:this.Y(-196)},{x:this.X(266),y:this.Y(-4)},{x:this.X(-266),y:this.Y(-4)}],true);
      g.lineStyle(2,0x7d5a38);
      for(const py of [-160,-120,-80,-40])g.lineBetween(this.X(-300),this.Y(py),this.X(300),this.Y(py));
      // Roof house.
      g.fillStyle(0xa87c4c).fillRect(this.X(-150),this.Y(-252),300*S,56*S);
      g.fillStyle(0x8a5f36);g.fillPoints([{x:this.X(-168),y:this.Y(-252)},{x:this.X(0),y:this.Y(-292)},{x:this.X(168),y:this.Y(-252)}],true);
      g.lineStyle(3,0x6e4c2e);g.strokeRect(this.X(-150),this.Y(-252),300*S,56*S);
    }
  }
  // Per-stage randomized setup (buildSetup.js): rolled while nothing is
  // placed, locked the moment a piece lands, discarded on completion.
  stageSetup(stage, placedCount){
    const doneKey={1:'ark_ribs_done',2:'ark_decks_done',3:'ark_sealed_done'}[stage];
    let all={};
    try{all=JSON.parse(localStorage.getItem(BUILD_SCRATCH_KEY)||'{}');}catch{all={};}
    if(this.flags()[doneKey]){if(all[stage]){delete all[stage];this.saveBuildScratch(all);}return null;}
    let setup=normalizeStageSetup(stage,all[stage]);
    if(!setup){
      setup=rollStageSetup(stage);
      all[stage]={...setup,locked:placedCount>0};
      this.saveBuildScratch(all);
    }else if(placedCount>0&&!all[stage].locked){
      all[stage].locked=true;this.saveBuildScratch(all);
    }
    return setup;
  }
  saveBuildScratch(all){try{localStorage.setItem(BUILD_SCRATCH_KEY,JSON.stringify(all));}catch{/* storage unavailable */}}

  // ---- Stage 1: keel and ribs (rotate + fit) ----
  drawRibStage(){
    this.stageTitle('1 · Fit the keel and ribs','Turn the two ribs upright with ↻, then fit every piece onto the frame. Strong ribs give the ark its shape.');
    const f=this.flags(),S=this.S;
    // Slot guides.
    const guide=this.add.graphics();this.board.add(guide);
    guide.lineStyle(3,0x51604c,.75);
    guide.strokeRect(this.X(-300),this.Y(-16),600*S,20*S);
    for(const rx of [-180,180]){guide.beginPath();guide.arc(this.X(rx),this.Y(-8),92*S,Math.PI,2*Math.PI);guide.strokePath();}
    this.ribTargets={keel:{x:this.X(0),y:this.Y(-6),rotation:0},'rib-a':{x:this.X(-180),y:this.Y(-8),rotation:0},'rib-b':{x:this.X(180),y:this.Y(-8),rotation:0}};
    const starts=this.phonePortrait?[[330,518],[480,533],[630,518]]:[[215,545],[480,560],[745,545]];
    const rows=[['keel','beam_keel_placed'],['rib-a','beam_a_placed'],['rib-b','beam_b_placed']];
    const setup=this.stageSetup(1,rows.filter(([,flag])=>f[flag]).length)??rollStageSetup(1);
    rows.forEach(([id,flag])=>{
      const placed=!!f[flag],target=this.ribTargets[id];
      const start=starts[setup.slots[id]];
      const rotation=id==='keel'?0:(f[id==='rib-a'?'beam_a_rotated':'beam_b_rotated']?0:setup.angles[id]);
      const piece=id==='keel'
        ? this.makePiece(id,placed?target.x:start[0],placed?target.y:start[1],560*S,22*S,'plank',placed?0:rotation,'KEEL')
        : this.makePiece(id,placed?target.x:start[0],placed?target.y:start[1],184*S,100*S,'rib',placed?0:rotation,'RIB');
      piece.homeX=start[0];piece.homeY=start[1];
      if(placed){piece.placed=true;piece.disableInteractive();if(piece.arcOffsetY)piece.setPosition(target.x,target.y-piece.arcOffsetY);}
    });
    // Action buttons live under the title, not at the canvas bottom:
    // on wide desktop windows the canvas is centre-cropped vertically,
    // and bottom-edge buttons can fall outside the visible area.
    const rotate=text(this,480,this.phonePortrait?182:172,'↻  Rotate selected rib   ·   R',{fontFamily:'Arial',fontSize:this.phonePortrait?'20px':'15px',color:'#fff2cf',backgroundColor:'#35594c',padding:{x:16,y:10}}).setOrigin(.5).setInteractive({useHandCursor:true});
    rotate.on('pointerdown',()=>this.rotateSelected());
    this.board.add(rotate);this.rotateBtn=rotate;this.addZone(rotate,()=>this.rotateSelected());
  }
  // ---- Stage 2: support posts, then decks ----
  drawDeckStage(){
    this.stageTitle('2 · Posts first, then three decks','A deck with no support post under it will sag. Set the posts, then lay the decks — widest at the bottom.');
    const f=this.flags(),S=this.S;
    this.deckLevels={lower:{y:-34,w:540},middle:{y:-92,w:440},upper:{y:-150,w:320}};
    this.pillarFor={middle:'pillar-mid',upper:'pillar-up'};
    const guide=this.add.graphics();this.board.add(guide);
    guide.lineStyle(3,0x51604c,.7);
    for(const key of ['lower','middle','upper']){const d=this.deckLevels[key];guide.strokeRect(this.X(-d.w/2),this.Y(d.y-13),d.w*S,26*S);}
    guide.strokeRect(this.X(-11),this.Y(-92),22*S,58*S);
    guide.strokeRect(this.X(-11),this.Y(-150),22*S,58*S);
    const starts=this.phonePortrait?[[350,520],[430,520],[510,520],[590,520],[660,520]]:[[150,548],[265,548],[420,548],[600,548],[790,548]];
    const deckFlags=['pillar_mid_placed','pillar_up_placed','deck_lower_placed','deck_middle_placed','deck_upper_placed'];
    const setup=this.stageSetup(2,deckFlags.filter(k=>f[k]).length)??rollStageSetup(2);
    const mk=(id,w,h,kind,label,flag)=>{
      const placed=!!f[flag];
      const [sx,sy]=starts[setup.slots[id]];
      const px=placed?(kind==='pillar'?this.X(0):this.X(0)):sx, py=placed?(kind==='pillar'?this.Y(id==='pillar-mid'?-63:-121):this.Y(this.deckLevels[id.replace('deck-','')].y)):sy;
      const piece=this.makePiece(id,px,py,w,h,kind,0,label);
      piece.flag=flag;
      // Remember the tray position so a sagging deck can bounce home.
      piece.homeX=sx;piece.homeY=sy;
      if(placed){piece.placed=true;piece.disableInteractive();}
      return piece;
    };
    mk('pillar-mid',22*S,58*S,'pillar','POST','pillar_mid_placed');
    mk('pillar-up',22*S,58*S,'pillar','POST','pillar_up_placed');
    mk('deck-lower',this.deckLevels.lower.w*S,24*S,'plank','LOWER · WIDEST','deck_lower_placed');
    mk('deck-middle',this.deckLevels.middle.w*S,24*S,'plank','MIDDLE','deck_middle_placed');
    mk('deck-upper',this.deckLevels.upper.w*S,24*S,'plank','UPPER · NARROWEST','deck_upper_placed');
  }
  // ---- Stage 3: pitch seams, door, window, rain test ----
  drawSealStage(){
    this.stageTitle('3 · Pitch, a door, and a window','Cover the seams with pitch so no water gets in. The door goes in the side; the window opens under the roof. Genesis 6:14–16.');
    const f=this.flags(),S=this.S;
    this.seamY=[-52,-98,-144];
    const guide=this.add.graphics();this.board.add(guide);
    this.seamY.forEach((sy,i)=>{
      if(f[`seam_${i+1}_placed`]){guide.fillStyle(0x4a3826);guide.fillRect(this.X(-292),this.Y(sy-7),584*S,14*S);}
      else{guide.lineStyle(4,0xffe9a3,.95);guide.lineBetween(this.X(-292),this.Y(sy),this.X(292),this.Y(sy));}
    });
    guide.lineStyle(3,0x51604c,.8);
    if(!f.door_placed)guide.strokeRect(this.X(140),this.Y(-118),72*S,114*S);
    if(!f.window_placed)guide.strokeRect(this.X(-30),this.Y(-238),60*S,34*S);
    if(f.door_placed)this.drawFittedDoor();
    if(f.window_placed)this.drawFittedWindow();
    const starts=this.phonePortrait?[[330,514],[480,514],[630,514],[395,566],[565,566]]:[[140,540],[330,540],[520,540],[700,540],[830,540]];
    const items=[
      ['seam-1','strip','seam_1_placed',560*S,15*S,'PITCH'],
      ['seam-2','strip','seam_2_placed',560*S,15*S,'PITCH'],
      ['seam-3','strip','seam_3_placed',560*S,15*S,'PITCH'],
      ['door','door','door_placed',72*S,114*S,'DOOR'],
      ['window','window','window_placed',60*S,34*S,'WINDOW'],
    ];
    const setup=this.stageSetup(3,items.filter(([, ,flag])=>f[flag]).length)??rollStageSetup(3);
    items.forEach(([id,kind,flag,w,h,label])=>{
      if(f[flag])return;
      const [sx,sy]=starts[setup.slots[id]];
      const piece=this.makePiece(id,sx,sy,w,h,kind,0,label);
      piece.flag=flag;piece.homeX=sx;piece.homeY=sy;
    });
    if(['seam_1_placed','seam_2_placed','seam_3_placed','door_placed','window_placed'].every(k=>f[k]))this.showRainButton();
  }
  drawFittedDoor(){
    const g=this.add.graphics();this.board.add(g);const S=this.S;
    g.fillStyle(0x7c5230).fillRect(this.X(140),this.Y(-118),72*S,114*S);
    g.fillStyle(0x8f6238);g.fillEllipse(this.X(176),this.Y(-118),72*S,36*S);
    g.lineStyle(3,0x54381f);g.strokeRect(this.X(140),this.Y(-118),72*S,114*S);
    g.fillStyle(0xe8c96f);g.fillCircle(this.X(198),this.Y(-58),5*S);
  }
  drawFittedWindow(){
    const g=this.add.graphics();this.board.add(g);const S=this.S;
    g.fillStyle(0xf3e3b3).fillRect(this.X(-30),this.Y(-238),60*S,34*S);
    g.lineStyle(3,0x6e4c2e);g.strokeRect(this.X(-30),this.Y(-238),60*S,34*S);
    g.lineBetween(this.X(0),this.Y(-238),this.X(0),this.Y(-204));g.lineBetween(this.X(-30),this.Y(-221),this.X(30),this.Y(-221));
  }
  showRainButton(){
    if(this.rainButton)return;
    const btn=text(this,480,this.phonePortrait?182:174,'🌧  Test it with rain',{fontFamily:'Arial',fontSize:this.phonePortrait?'21px':'17px',fontStyle:'bold',color:'#fff2cf',backgroundColor:'#2e5d8a',padding:{x:20,y:12}}).setOrigin(.5).setInteractive({useHandCursor:true});
    btn.on('pointerdown',()=>this.rainTest());
    this.board.add(btn);this.rainButton=btn;this.addZone(btn,()=>this.rainTest());
  }
  rainTest(){
    if(this.raining)return;this.raining=true;this.rainButton?.destroy();this.rainButton=null;
    const cloud=this.add.container(this.phonePortrait?480:480,60);cloud.setDepth(60);
    cloud.add(this.add.ellipse(0,0,340,74,0x5d7186));cloud.add(this.add.ellipse(-90,14,190,54,0x6d8299));cloud.add(this.add.ellipse(95,12,200,58,0x52667c));
    this.tweens.add({targets:cloud,x:480,duration:10});
    const drops=[];
    for(let i=0;i<70;i++){
      const x=300+Math.random()*360,y=110+Math.random()*40;
      const drop=this.add.rectangle(x,y,3,17,0x9fd3f2,.9).setDepth(59);
      drops.push(drop);
      this.tweens.add({targets:drop,y:y+300+Math.random()*90,alpha:.15,duration:620+Math.random()*260,repeat:2,onComplete:()=>drop.destroy()});
    }
    // Beading sparkles on the sealed hull: the pitch is doing its job.
    this.time.delayedCall(900,()=>{for(let i=0;i<10;i++){const sx=this.X(-260+i*58),sy=this.Y(-60-(i%3)*44);const s=text(this,sx,sy,'✦',{fontSize:'15px',color:'#fff3b0'}).setOrigin(.5).setDepth(61);this.tweens.add({targets:s,alpha:0,y:sy-14,duration:800,onComplete:()=>s.destroy()});}});
    // …but a few seams still weep — at random spots every time. The test
    // only passes once Aaron has patched every leak by tapping it.
    this.leakCloud=cloud;
    this.time.delayedCall(1100,()=>this.spawnLeaks());
  }
  spawnLeaks(){
    const setup=this.stageSetup(3,5)??rollStageSetup(3);
    this.leaks=[];
    this.ping(480,this.phonePortrait?246:232,`Rain test: patch ${setup.leaks.length} leaks. Look for the blue drops on the seams.`);
    for(const {seam,t,id} of setup.leaks){
      const lx=this.X(-280+t*560),ly=this.Y(this.seamY[seam]);
      const leak=text(this,lx,ly,'💧',{fontSize:'27px'}).setOrigin(.5).setDepth(62).setInteractive({useHandCursor:true});
      leak.__leakId=id;
      this.tweens.add({targets:leak,y:ly+7,duration:380,yoyo:true,repeat:-1});
      leak.on('pointerdown',()=>this.patchLeak(leak));
      this.board.add(leak);
      this.leaks.push(leak);
    }
  }
  patchLeak(leak){
    if(!this.leaks?.includes(leak))return;
    this.leaks=this.leaks.filter(l=>l!==leak);
    this.tweens.killTweensOf(leak);leak.destroy();
    if(this.leaks.length===0){
      const cloud=this.leakCloud;this.leakCloud=null;
      this.time.delayedCall(650,()=>{cloud?.destroy();this.raining=false;this.finishSealing();});
    } else {
      this.ping(480,this.phonePortrait?246:232,`${this.leaks.length} leak${this.leaks.length>1?'s':''} left…`);
    }
  }
  // ---- Pieces ----
  makePiece(id,x,y,w,h,kind,rotation=0,label=''){
    const c=this.add.container(x,y).setRotation(rotation);
    if(kind==='plank'){
      c.add(this.add.rectangle(0,0,w,h,wood).setStrokeStyle(3,0x704d36));
      c.add(this.add.rectangle(0,-h/2+5,w-12,3,0xe4bb7e,.8));
      if(label)c.add(text(this,0,0,label,{fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',color:'#513e2f'}).setOrigin(.5));
    } else if(kind==='rib'){
      const g=this.add.graphics();g.lineStyle(Math.max(6,10*this.S),darkWood);
      g.beginPath();g.arc(0,h/2-6,w/2,Math.PI,2*Math.PI);g.strokePath();
      g.lineStyle(3,0xe4bb7e);g.beginPath();g.arc(0,h/2-6,w/2-8,Math.PI,2*Math.PI);g.strokePath();
      c.add(g);
      if(label)c.add(text(this,0,h/2+8,label,{fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:'#513e2f'}).setOrigin(.5));
    } else if(kind==='pillar'){
      c.add(this.add.rectangle(0,0,w,h,darkWood).setStrokeStyle(2,0x5d3d22));
      c.add(this.add.rectangle(0,-h/2+6,w+10,7,wood));
      c.add(this.add.rectangle(0,h/2-6,w+10,7,wood));
    } else if(kind==='strip'){
      c.add(this.add.rectangle(0,0,w,h,0x4a3826).setStrokeStyle(2,0x2e2119));
      c.add(this.add.rectangle(0,-h/2+3,w-16,3,0x8a715a,.7));
    } else if(kind==='door'){
      c.add(this.add.rectangle(0,8,w,h-16,0x7c5230).setStrokeStyle(3,0x54381f));
      c.add(this.add.ellipse(0,-h/2+16,w,32,0x7c5230).setStrokeStyle(3,0x54381f));
      c.add(this.add.circle(w/2-13,6,4.5,0xe8c96f));
    } else if(kind==='window'){
      c.add(this.add.rectangle(0,0,w,h,0xf3e3b3).setStrokeStyle(3,0x6e4c2e));
      const g=this.add.graphics();g.lineStyle(2,0x6e4c2e);g.lineBetween(0,-h/2,0,h/2);g.lineBetween(-w/2,0,w/2,0);c.add(g);
    }
    // Pieces are picked by the scene-level touch handler below. Keeping
    // overlapping Phaser game-object hit areas here lets a wide deck mask a
    // nearby support post on touch screens.
    c.setSize(w,h);
    c.id=id;c.kind=kind;c.placed=false;c.setDepth(20);c.grabW=w;c.grabH=h;
    // A rib's visual centre is its arc centre, offset below the container origin.
    if(kind==='rib')c.arcOffsetY=h/2-6;
    // Selection ring: a gold outline shown while the piece is selected, so
    // a tap on a piece always has a visible answer.
    const ring=this.add.rectangle(0,0,w+12,h+12,0x000000,0).setStrokeStyle(3,0xffd968).setVisible(false);
    ring.name='selring';c.addAt(ring,0);
    this.pieces.push(c);this.board.add(c);return c;
  }
  selectPiece(piece){
    if(this.selected&&this.selected!==piece)this.selected.getByName('selring')?.setVisible(false);
    this.selected=piece;
    piece?.getByName('selring')?.setVisible(true);
    // Light up the rotate button while a rib is selected, so the next
    // step is obvious.
    if(this.rotateBtn)this.rotateBtn.setBackgroundColor(piece&&piece.kind==='rib'?'#a37c14':'#35594c');
  }
  // Primary piece picking: plain distance from the tap to each piece's
  // visual centre, on the scene-level pointer events. Game-object input
  // on container pieces proved unreliable on touch devices (ribs could
  // not be selected at all), while scene-level pointer input is the same
  // path that reliably drives walking in the explore scenes.
  // Buttons in this scene are tapped through the same scene-level path
  // as the pieces: game-object input on objects inside the board
  // container proved unreliable on touch devices (the Rotate button did
  // not respond at all on the user's iPhone), so each button registers a
  // plain rectangle zone computed from its position and text size.
  addZone(btn,action){
    const w=btn.width,h=btn.height;
    (this.zones??=[]).push({left:btn.x-btn.originX*w,top:btn.y-btn.originY*h,right:btn.x+(1-btn.originX)*w,bottom:btn.y+(1-btn.originY)*h,action});
  }
  pickAt(pointer){
    // During the rain test the only live targets are the leaks (zones
    // and pieces stay frozen until every leak is patched).
    if(this.raining&&this.leaks?.length){
      for(const leak of [...this.leaks])if(Math.abs(pointer.worldX-leak.x)<36&&Math.abs(pointer.worldY-leak.y)<36){this.patchLeak(leak);return;}
    }
    if(this.app.isBlocked()||this.raining)return;
    for(const z of this.zones??[])if(pointer.worldX>=z.left&&pointer.worldX<=z.right&&pointer.worldY>=z.top&&pointer.worldY<=z.bottom){z.action();return;}
    const candidates=[];
    for(const piece of this.pieces){
      if(piece.placed)continue;
      const off=piece.arcOffsetY||0,cos=Math.cos(piece.rotation),sin=Math.sin(piece.rotation);
      const cx=piece.x-off*sin,cy=piece.y+off*cos;
      const r=Math.max(piece.grabW||0,piece.grabH||0)*.62+18;
      const distance=Phaser.Math.Distance.Between(pointer.worldX,pointer.worldY,cx,cy);
      if(distance<=r)candidates.push({piece,distance});
    }
    // Wide deck pieces have intentionally generous touch ranges. Choose the
    // closest centre first so those ranges cannot swallow the small posts.
    candidates.sort((a,b)=>a.distance-b.distance);
    const piece=candidates[0]?.piece;
    if(!piece)return;
    this.selectPiece(piece);
    this.dragging=piece;this.dragOffset={x:piece.x-pointer.worldX,y:piece.y-pointer.worldY};piece.setDepth(40);
  }
  pointerMove(pointer){if(this.dragging&&pointer.isDown)this.dragging.setPosition(pointer.worldX+this.dragOffset.x,pointer.worldY+this.dragOffset.y);}
  pointerUp(){
    if(!this.dragging)return;
    const piece=this.dragging;this.dragging=null;piece.setDepth(20);
    if(this.stage===1)this.dropRib(piece);
    else if(this.stage===2)this.dropDeckPiece(piece);
    else if(this.stage===3)this.dropSealPiece(piece);
  }
  rotateSelected(){
    if(this.stage!==1)return;
    const piece=this.selected;
    if(!piece||piece.placed||piece.kind!=='rib'){this.ping(480,this.phonePortrait?242:230,'Tap a rib first, then turn it upright.');return;}
    // One tap turns the rib upright — the only orientation a rib is
    // ever fitted at. (This used to blind-cycle +90° per tap, so the
    // first tap turned the rib upside down and it took three taps to
    // come back upright, which read as "rotate doesn't work".)
    piece.rotation=0;
    const flags=this.flags();
    if(piece.id==='rib-a')flags.beam_a_rotated=true;
    if(piece.id==='rib-b')flags.beam_b_rotated=true;
    this.app.persist();this.ping(piece.x,piece.y-60,'Turned upright');
  }
  placePiece(piece,x,y){
    piece.setPosition(x,y);piece.rotation=0;piece.placed=true;piece.disableInteractive();
    piece.getByName('selring')?.setVisible(false);
    if(this.selected===piece)this.selected=null;
    if(piece.flag){this.flags()[piece.flag]=true;}
    this.app.persist();this.feedback?.destroy();
  }
  dropRib(piece){
    const target=this.ribTargets[piece.id];
    const ty=target.y-(piece.arcOffsetY||0);
    const angleOff=Math.abs(Phaser.Math.Angle.Wrap(piece.rotation-target.rotation));
    if(Phaser.Math.Distance.Between(piece.x,piece.y,target.x,ty)<85&&angleOff<.3){
      piece.flag=piece.id==='keel'?'beam_keel_placed':piece.id==='rib-a'?'beam_a_placed':'beam_b_placed';
      this.placePiece(piece,target.x,ty);
      if(this.pieces.every(p=>p.placed)){
        const f=this.flags();f.ark_ribs_done=true;f.blueprint_stage_one=true;this.app.persist();
        this.celebrate(480,300);
        this.time.delayedCall(750,()=>{this.stage=2;this.visualStage=2;this.drawStage();this.updateHUD();});
      }
    } else {
      piece.setPosition(piece.homeX,piece.homeY);
      this.ping(piece.x,piece.y-56,piece.kind==='rib'&&angleOff>=.3?'Turn the rib upright first (↻).':'Look for the outline that fits.');
    }
  }
  dropDeckPiece(piece){
    const f=this.flags();
    if(piece.kind==='pillar'){
      const ty=this.Y(piece.id==='pillar-mid'?-63:-121);
      if(Math.abs(piece.x-this.X(0))<80&&Math.abs(piece.y-ty)<70){this.placePiece(piece,this.X(0),ty);this.checkDecksDone();}
      else{piece.setPosition(piece.homeX,piece.homeY);this.ping(piece.x,piece.y-52,'Posts stand in the middle, under a deck.');}
      return;
    }
    const key=piece.id.replace('deck-',''),level=this.deckLevels[key],ty=this.Y(level.y);
    if(Math.abs(piece.x-this.X(0))<110&&Math.abs(piece.y-ty)<52){
      if(!f.pillar_mid_placed||!f.pillar_up_placed){
        piece.setPosition(piece.homeX,piece.homeY);
        this.ping(this.X(0),ty-48,'Set both support posts first. Every deck needs a firm support.');
        return;
      }
      const needed=this.pillarFor[key];
      if(needed&&!f[needed==='pillar-mid'?'pillar_mid_placed':'pillar_up_placed']){
        // No support yet: the deck goes on, sags, and Aaron takes it back.
        piece.setPosition(this.X(0),ty);
        this.tweens.add({targets:piece,y:ty+13,angle:3.5,duration:200,yoyo:true,repeat:1,onComplete:()=>{piece.setPosition(piece.homeX,piece.homeY);piece.angle=0;}});
        this.ping(this.X(0),ty-46,'It sags! This deck needs a support post under it first.');
        return;
      }
      this.placePiece(piece,this.X(0),ty);this.checkDecksDone();
    } else {
      piece.setPosition(piece.homeX,piece.homeY);
      this.ping(piece.x,piece.y-52,'Try the deck outline that matches this level.');
    }
  }
  checkDecksDone(){
    const f=this.flags();
    if(['pillar_mid_placed','pillar_up_placed','deck_lower_placed','deck_middle_placed','deck_upper_placed'].every(k=>f[k])){
      f.ark_decks_done=true;this.app.persist();this.celebrate(480,300);
      this.time.delayedCall(750,()=>{this.stage=3;this.visualStage=3;this.rainButton=null;this.drawStage();this.updateHUD();});
    }
  }
  dropSealPiece(piece){
    const f=this.flags();let done=false,tx=0,ty=0;
    if(piece.kind==='strip'){
      const idx=Number(piece.id.split('-')[1])-1;tx=this.X(0);ty=this.Y(this.seamY[idx]);
      done=Math.abs(piece.x-tx)<120&&Math.abs(piece.y-ty)<44;
    } else if(piece.kind==='door'){tx=this.X(176);ty=this.Y(-61);done=Math.abs(piece.x-tx)<85&&Math.abs(piece.y-ty)<80;}
    else if(piece.kind==='window'){tx=this.X(0);ty=this.Y(-221);done=Math.abs(piece.x-tx)<85&&Math.abs(piece.y-ty)<60;}
    if(done){
      const flag=piece.flag;piece.destroy();this.pieces=this.pieces.filter(p=>p!==piece);
      f[flag]=true;this.app.persist();this.feedback?.destroy();
      this.drawStage(); // redraw guides/fitted art with the new piece in place
      if(['seam_1_placed','seam_2_placed','seam_3_placed','door_placed','window_placed'].every(k=>f[k]))this.ping(480,540,'Everything is sealed. Time for the rain test!');
    } else {
      piece.setPosition(piece.homeX,piece.homeY);
      this.ping(piece.x,piece.y-52,piece.kind==='strip'?'Drag the pitch onto a glowing seam.':piece.kind==='door'?'The door belongs in the side of the ark.':'The window opens under the roof.');
    }
  }
  finishSealing(){
    const flags=this.flags();
    if(flags.blueprint_complete){this.drawCompletion();return;}
    flags.ark_sealed_done=true;flags.blueprint_stage_two=true;flags.blueprint_complete=true;
    const progress=this.app.save.stories[this.story.id];if(!progress.completedScenes.includes('ark_blueprint'))progress.completedScenes.push('ark_blueprint');
    this.app.persist();this.celebrate(480,320);
    this.time.delayedCall(800,()=>this.drawCompletion());
  }
  resetStage(){
    if(this.raining)return;
    const keys={
      1:['beam_keel_placed','beam_a_placed','beam_b_placed','beam_a_rotated','beam_b_rotated','ark_ribs_done','blueprint_stage_one'],
      2:['pillar_mid_placed','pillar_up_placed','deck_lower_placed','deck_middle_placed','deck_upper_placed','ark_decks_done'],
      3:['seam_1_placed','seam_2_placed','seam_3_placed','door_placed','window_placed','ark_sealed_done','blueprint_stage_two','blueprint_complete'],
    }[this.stage]??[];
    const f=this.flags();for(const key of keys)delete f[key];
    if(this.stage===3){const progress=this.app.save.stories[this.story.id];progress.completedScenes=progress.completedScenes.filter(id=>id!=='ark_blueprint');}
    let all={};try{all=JSON.parse(localStorage.getItem(BUILD_SCRATCH_KEY)||'{}');}catch{all={};}
    delete all[this.stage];this.saveBuildScratch(all);
    this.app.persist();this.selected=null;this.drawStage();this.updateHUD();
    this.ping(480,this.phonePortrait?246:232,'Stage reset. The pieces and rain test are ready to try again.');
  }
  drawCompletion(){
    this.stage=0;this.visualStage=3;this.board.removeAll(true);this.pieces=[];this.slots=[];this.zones=[];
    this.addTopButton();
    this.drawArkBase();
    this.board.add(text(this,480,180,'The ark is finished!',{fontFamily:'Georgia',fontSize:'36px',fontStyle:'bold',color:'#2e4a3e'}).setOrigin(.5));
    this.board.add(text(this,480,238,'Ribs, decks, door, window — and pitch on every seam. It passed the rain test.',{fontFamily:'Arial',fontSize:'17px',color:'#42503f',align:'center',wordWrap:{width:680}}).setOrigin(.5));
    this.board.add(text(this,480,282,'Noah built it just as God described in Genesis 6:14–16.',{fontFamily:'Georgia',fontSize:'16px',color:'#7a6749'}).setOrigin(.5));
    const btn=text(this,480,360,'Tell Noah the good news  →',{fontFamily:'Arial',fontSize:'18px',fontStyle:'bold',color:'#fff2cf',backgroundColor:'#35594c',padding:{x:25,y:15}}).setOrigin(.5).setInteractive({useHandCursor:true});
    btn.on('pointerdown',()=>this.returnToMeadow());this.board.add(btn);this.addZone(btn,()=>this.returnToMeadow());
    this.app.showHUD('Build the Ark','The ark is finished! Tell Noah the good news.','GENESIS 6:14–16 · BUILDING WITH NOAH');
  }
  leave(){this.returnToMeadow();}
  returnToMeadow(){this.app.router.story(this.story.id,'meet_noah',{x:980,y:550});}
  ping(x,y,message){this.feedback?.destroy();this.feedback=text(this,x,y,message,{fontFamily:'Arial',fontSize:this.phonePortrait?'19px':'14px',fontStyle:'bold',color:'#fff5d8',backgroundColor:'#29483f',padding:{x:10,y:8}}).setOrigin(.5).setDepth(70);this.time.delayedCall(1700,()=>this.feedback?.destroy());}
  celebrate(x,y){if(this.app.save.settings.reducedMotion)return;for(let i=0;i<24;i++){const angle=i*Math.PI/12,star=text(this,x,y,'✦',{fontSize:'18px',color:i%2?'#e8c96f':'#b07d48'}).setOrigin(.5).setDepth(65);this.tweens.add({targets:star,x:x+Math.cos(angle)*115,y:y+Math.sin(angle)*80,alpha:0,scale:.2,duration:700,onComplete:()=>star.destroy()});}}
}
