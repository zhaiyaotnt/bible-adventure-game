import { ExploreScene } from '../../scenes/ExploreScene.js';
import Phaser from 'phaser';
import { character, label, text } from '../../scenes/art.js';
import { addItem, hasItems, inventoryCount } from '../../core/Inventory.js';
import { SUPPLY_SCRATCH_KEY, chooseSupplySpots, spotsFromRoll, clearSupplyScratch } from './supplySpots.js';
import meadow from '../../assets/noah-meadow-concept.jpg';
import meadowStage0 from '../../assets/noah-meadow-stage0.jpg';
import meadowStage1 from '../../assets/noah-meadow-stage1.jpg';
import meadowStage3 from '../../assets/noah-meadow-stage3.jpg';

// A compact, hand-built RPG field. The scene owns Noah-specific quest steps;
// movement, prompts, touch input, routing and persistence remain shared systems.
export class MeetNoahScene extends ExploreScene {
  constructor(){super('MeetNoah');}
  preload(){
    this.load.image('noah-meadow',meadow);
    this.load.image('noah-meadow-0',meadowStage0);
    this.load.image('noah-meadow-1',meadowStage1);
    this.load.image('noah-meadow-3',meadowStage3);
  }
  init({story,spawn}){this.story=story;this.savedSpawn=spawn;}
  create(){
    const app=this.game.registry.get('app'),content=this.story.content;
    const spawn=Number.isFinite(this.savedSpawn?.x)&&Number.isFinite(this.savedSpawn?.y)?this.savedSpawn:{x:820,y:510};
    this.setup(app,spawn);
    this.drawMap();
    // Old preview saves can resume on top of the fallen log, now a new landmark.
    if(!this.canStand(this.player.x,this.player.y)||Phaser.Math.Distance.Between(this.player.x,this.player.y,850,820)<112||spawn.y>700)this.player.setPosition(820,510);
    this.bounds={left:36,right:1464,top:92,bottom:1034};
    const cameraBounds=()=>this.cameras.main.setBounds(-550,-350,2600,1800);
    cameraBounds();this.scale.on('resize',cameraBounds);this.events.once('shutdown',()=>this.scale.off('resize',cameraBounds));
    this.cameraManagedByScene=true;
    this.cameras.main.startFollow(this.player,true,.12,.12);
    // Default framing sits wider than the old 0.95 portrait close-up:
    // players want to see where they are. Pinch (or the mouse wheel)
    // adjusts from here, out to the full-meadow fit level or in to 3x.
    this.baseZoom=window.innerHeight>window.innerWidth?0.62:1.0;
    this.minZoom=this.computeFitZoom();
    this.userZoom=1;this.applyZoom();
    this.buildPeopleAndProps();
    const f=this.flags();
    // Previous preview saves could mark this scene complete after only two
    // interactions. Keep their discoveries, but reopen the material quest.
    if(f.preview_complete&&!f.supply_quest_complete){delete f.preview_complete;const p=this.app.save.stories[this.story.id];p.completedScenes=p.completedScenes.filter(id=>id!==this.story.entryScene);this.app.persist();}
    this.hotspot(990,570,f.met_noah?(f.supply_quest_complete?'Return to Noah':'Talk with Noah'):'Find Noah',()=>this.talkNoah(),94);
    this.hotspot(970,305,f.blueprint_complete&&!f.mx_complete?'Enter the ark':f.inspected_ark?'Explore the ark':'Inspect the ark',()=>this.inspectArk(),100);
    if(f.inspected_ark)this.hotspot(1110,245,this.planLabel(),()=>this.studyBlueprint(),88);
    this.hotspot(1095,930,'Look beside the stream',()=>app.dialogue('Beside the stream',content.discovery,{fiction:true,reference:content.reference}),78);
    if(!f.log_moved)this.hotspot(850,820,'Drag the fallen log aside',()=>this.app.toast('Touch the log and drag it away from the path.'),80);
    for(const item of this.materialSpots()) if((!item.hidden||f.log_moved)&&!f[item.key])this.hotspot(item.x,item.y,item.name,()=>this.collect(item),68);
    this.hotspot(125,910,'Return to your room',()=>app.router.home(),64);
    this.updateObjective();
    // First time back in the meadow with the ark sealed: swing the camera
    // up to the finished ark for a small celebration, exactly once.
    if(f.ark_sealed_done&&!f.build_celebrated){
      f.build_celebrated=true;this.app.persist();
      this.time.delayedCall(700,()=>this.celebrateBuild());
    }
  }
  planLabel(){const f=this.flags();return f.blueprint_complete&&!f.mx_complete?'Enter the ark':f.build_unlocked&&!f.blueprint_complete?'Help build the ark':'Study Noah’s building plan';}
  celebrateBuild(){
    const cam=this.cameras.main;cam.stopFollow();
    cam.pan(1020,330,1100,'Sine.easeInOut');
    this.burst(880,290);this.burst(1090,270);
    this.app.toast('✦ The ark is finished! Tell Noah the good news.');
    this.time.delayedCall(2200,()=>{
      cam.pan(this.player.x,this.player.y,700,'Sine.easeInOut',false,(camera,progress)=>{if(progress===1)camera.startFollow(this.player,true,.12,.12);});
    });
  }
  showDiscovery(){
    const d=this.story.content.discovery_build;if(!d)return;
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    this.app.openModal(`<p class="overline">BIBLE DISCOVERY · GENESIS 6:14–16</p><h2>${esc(d.title)}</h2><p class="reading">${esc(d.verse)}</p><p class="reading"><b>Something to notice:</b> ${esc(d.observation)}</p><p class="reading"><b>Talk about it:</b> ${esc(d.question)}</p><p class="save-note">✦ Noah character card earned.</p><button id="close-discovery" class="primary">Keep exploring →</button>`,'reading');
    document.getElementById('close-discovery').onclick=()=>this.app.closeModal();
  }
  flags(){return this.app.save.stories[this.story.id].questFlags;}
  inventory(){const progress=this.app.save.stories[this.story.id];progress.inventory??={};return progress.inventory;}
  canStand(x,y){
    if(!super.canStand(x,y))return false;
    if(Phaser.Geom.Polygon.Contains(this.waterPolygon,x,y)){
      if(this.steppingStones.some(([sx,sy])=>Phaser.Math.Distance.Between(x,y,sx,sy)<50))return true;
      // Escape hatch: if Aaron somehow ended up standing in open water
      // (an edge case near the stones), never trap him there — let him
      // walk out. Entering water from land is still blocked above.
      const px=this.player?.x??x,py=this.player?.y??y;
      return Phaser.Geom.Polygon.Contains(this.waterPolygon,px,py)&&!this.steppingStones.some(([sx,sy])=>Phaser.Math.Distance.Between(px,py,sx,sy)<50);
    }
    return true;
  }
  // A tap in the stream almost always means "cross here": aim Aaron at
  // the nearest stepping stone instead of the unwalkable water beside it.
  adjustTarget(point){
    if(!this.waterPolygon||!Phaser.Geom.Polygon.Contains(this.waterPolygon,point.x,point.y))return point;
    let best=null,bestD=Infinity;
    for(const [sx,sy] of this.steppingStones){const d=Phaser.Math.Distance.Between(point.x,point.y,sx,sy);if(d<bestD){bestD=d;best={x:sx,y:sy};}}
    return bestD<110?best:point;
  }
  drawMap(){
    const ground=this.add.graphics().setDepth(-20);
    ground.fillStyle(0x77995c).fillRect(-250,-250,2000,1900);
    for(let i=0;i<520;i++){
      const x=(i*193+61)%1500,y=(i*127+37)%1600;
      ground.fillStyle(i%4===0?0x9aaf6b:0x5d824c,.22).fillEllipse(x,y,5+(i%4)*2,2+(i%3));
    }
    // The painted ark itself grows as Aaron helps build it: bare frame,
    // half-built hull, the original scaffolded ark, then the finished ark.
    const f=this.flags();
    const bgKey=f.blueprint_complete?'noah-meadow-3':f.ark_decks_done?'noah-meadow':(f.ark_ribs_done||f.blueprint_stage_one)?'noah-meadow-1':'noah-meadow-0';
    this.add.image(750,550,bgKey).setDisplaySize(1500,1100).setDepth(-10);
    // The stream boundary follows the painted river; stepping stones remain traversable.
    const river=[{x:1190,y:530},{x:1500,y:450},{x:1500,y:1100},{x:1180,y:1050},{x:1250,y:890},{x:1175,y:760},{x:1255,y:625}];
    this.waterPolygon=new Phaser.Geom.Polygon(river);
    this.steppingStones=[[1220,610],[1250,680],[1260,750],[1275,825],[1300,900],[1340,970]];
    const stones=this.add.graphics().setDepth(-9);
    stones.fillStyle(0xb9aa84,.9);for(const [x,y] of this.steppingStones){stones.fillEllipse(x,y,31,15);stones.fillEllipse(x-4,y-3,16,6);}
    label(this,1075,380,'THE ARK','#f5e7bf',14).setDepth(650);
  }
  buildPeopleAndProps(){
    character(this,'noah',0x688687,0xd2d1bc,true);
    this.noah=this.add.image(990,570,'noah-down-0').setOrigin(.5,.85).setScale(.467).setDepth(571);
    if(!this.app.save.settings.reducedMotion)this.tweens.add({targets:this.noah,y:567,duration:950,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    label(this,990,595,'NOAH','#fff0cc',13).setDepth(572);
    const sheep=this.add.container(520,710).setDepth(711).setScale(1.3);const body=this.add.ellipse(0,0,33,23,0xf1e7ce);sheep.add(body);sheep.add(this.add.circle(-14,2,4,0x4a4438));sheep.add(this.add.circle(14,2,4,0x4a4438));sheep.add(this.add.triangle(17,-7,0,9,8,0,0,0,0x4a4438));
    const bird=this.add.container(1150,565).setDepth(566).setScale(1.3);bird.add(this.add.ellipse(0,0,25,16,0xd8d0b4));bird.add(this.add.circle(10,-4,7,0xd8d0b4));bird.add(this.add.triangle(18,-4,0,3,9,0,0,-3,0xc88e56));
    if(!this.app.save.settings.reducedMotion){this.tweens.add({targets:sheep,x:560,y:725,duration:5600,yoyo:true,repeat:-1,ease:'Sine.inOut'});this.tweens.add({targets:bird,x:1180,y:555,duration:3100,yoyo:true,repeat:-1,ease:'Sine.inOut'});}
    this.drawMaterials();
    const savedFlags=this.flags();
    for(const item of this.materialSpots())if(savedFlags[item.key])this.materialArt[item.key].setAlpha(.34);
    label(this,1260,640,'STREAM','#d5ead0',10).setDepth(800);
    const plan=this.add.container(1110,245).setDepth(246).setScale(1.3);
    plan.add(this.add.ellipse(0,14,45,12,0x344a39,.28));plan.add(this.add.rectangle(0,0,32,24,0xe8d6a7).setAngle(-9).setStrokeStyle(2,0x8d7450));
    plan.add(this.add.rectangle(0,0,17,3,0x8b7652).setAngle(-9));plan.add(this.add.rectangle(0,6,14,2,0x8b7652).setAngle(-9));
    if(!this.app.save.settings.reducedMotion)this.tweens.add({targets:plan,y:240,duration:850,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    this.setupFallenLog();
  }
  setupFallenLog(){
    const x=850,y=820;
    this.logWall=this.wall(x-50,y-16,100,32);
    this.log=this.add.container(x,y).setDepth(y);
    this.log.add(this.add.ellipse(0,13,106,20,0x304a36,.35));
    this.log.add(this.add.rectangle(0,0,94,24,0x805b3e).setStrokeStyle(3,0x563f30));
    this.log.add(this.add.rectangle(-4,-4,75,4,0xb08454));
    this.log.add(this.add.ellipse(-44,0,13,22,0xb88959).setStrokeStyle(2,0x563f30));
    this.log.add(this.add.ellipse(44,0,13,22,0xb88959).setStrokeStyle(2,0x563f30));
    this.log.setSize(106,30).setInteractive(new Phaser.Geom.Rectangle(-53,-15,106,30),Phaser.Geom.Rectangle.Contains);
    this.draggableObjects=[...(this.draggableObjects??[]),this.log];
    this.input.on('pointerdown',pointer=>{
      if(this.log.getBounds().contains(pointer.worldX,pointer.worldY)){
        this.draggingLog=true;this.logDragOffset={x:this.log.x-pointer.worldX,y:this.log.y-pointer.worldY};this.dragStart={x:this.log.x,y:this.log.y};this.velocity={x:0,y:0};
      }
    });
    this.input.on('pointermove',pointer=>{
      if(!this.draggingLog||!pointer.isDown)return;
      this.log.setPosition(Phaser.Math.Clamp(pointer.worldX+this.logDragOffset.x,770,1040),Phaser.Math.Clamp(pointer.worldY+this.logDragOffset.y,720,940));
      this.logWall.setTo(this.log.x-50,this.log.y-16,100,32);
    });
    this.input.on('pointerup',()=>{
      if(!this.draggingLog)return;
      this.draggingLog=false;
      if(!this.logMoved&&(Math.abs(this.log.y-this.dragStart.y)>64||Math.abs(this.log.x-this.dragStart.x)>64)){this.logMoved=true;this.flags().log_moved=true;this.log.setDepth(this.log.y);this.hiddenWood.setVisible(true);this.hiddenSpark.setVisible(true);this.hotspots=this.hotspots.filter(h=>h.name!=='Drag the fallen log aside');const hidden=this.materialSpots().find(item=>item.key==='wood_3');if(!this.flags()[hidden.key])this.hotspot(hidden.x,hidden.y,hidden.name,()=>this.collect(hidden),68);this.app.persist();this.showFeedback('You shifted the fallen log. A supply was tucked behind it!');this.burst(this.hiddenWood.x,this.hiddenWood.y);}
    });
    this.hiddenWood=this.materialArt.wood_3;
    this.hiddenSpark=text(this,x,y-30,'✦',{fontSize:'18px',color:'#fff0ad'}).setOrigin(.5).setDepth(y+5).setVisible(false);
    if(!this.app.save.settings.reducedMotion)this.tweens.add({targets:this.hiddenSpark,y:y-38,alpha:.35,duration:800,yoyo:true,repeat:-1});
    if(this.flags().log_moved){this.logMoved=true;this.log.setY(y-82);this.logWall.setTo(this.log.x-50,this.log.y-16,100,32);this.hiddenWood.setVisible(true);this.hiddenSpark.setVisible(true);}
  }
  drawMaterials(){
    const sp=Object.fromEntries(this.materialSpots().map(s=>[s.key,s]));
    const wood1=this.woodPile(sp.wood_1.x,sp.wood_1.y),wood2=this.woodPile(sp.wood_2.x,sp.wood_2.y),wood3=this.add.container(900,865).setDepth(867).setScale(1.3).setVisible(false);
    wood3.add(this.add.ellipse(0,10,45,12,0x334a35,.25));wood3.add(this.add.rectangle(-7,0,36,11,0x9b7048).setAngle(14));wood3.add(this.add.rectangle(12,-8,28,10,0xb68a59).setAngle(-13));

    const rope1=this.ropeCoil(sp.rope_1.x,sp.rope_1.y),rope2=this.ropeCoil(sp.rope_2.x,sp.rope_2.y);

    const jar=this.add.container(sp.pitch.x,sp.pitch.y).setDepth(sp.pitch.y+1).setScale(1.3);
    jar.add(this.add.ellipse(0,15,36,10,0x334a35,.3));
    jar.add(this.add.rectangle(0,0,23,29,0x9d7250).setStrokeStyle(2,0x654b37));
    jar.add(this.add.rectangle(0,-17,11,7,0x72533b));jar.add(this.add.rectangle(0,-13,18,3,0xd0ad69));
    jar.add(this.add.rectangle(0,1,13,12,0xc29a61));
    const hammer=this.add.container(sp.tool_1.x,sp.tool_1.y).setDepth(sp.tool_1.y+1).setScale(1.3);
    hammer.add(this.add.ellipse(0,12,36,10,0x334a35,.3));hammer.add(this.add.rectangle(0,1,5,27,0x986f47).setAngle(-20));
    hammer.add(this.add.rectangle(2,-11,22,8,0x777767).setAngle(-20));hammer.add(this.add.rectangle(-7,-11,8,13,0x777767).setAngle(-20));
    // A warm pulse and small glint make each quest prop legible against the grass.
    for(const key of ['wood_1','wood_2','rope_1','rope_2','pitch','tool_1']){
      const {x,y}=sp[key];
      const glint=text(this,x+20,y-22,'✦',{fontSize:'14px',color:'#fff0ad'}).setOrigin(.5).setDepth(y+20);
      if(!this.app.save.settings.reducedMotion)this.tweens.add({targets:glint,y:y-28,alpha:.35,duration:800,yoyo:true,repeat:-1});
    }
    this.materialArt={wood_1:wood1,wood_2:wood2,wood_3:wood3,rope_1:rope1,rope_2:rope2,tool_1:hammer,pitch:jar};
  }
  woodPile(x,y){const pile=this.add.container(x,y).setDepth(y).setScale(1.3);pile.add(this.add.ellipse(0,11,52,12,0x334a35,.28));for(let i=0;i<3;i++){pile.add(this.add.rectangle((i-1)*8,(i%2)*6,42,10,i%2?0x9b7048:0xb08454).setAngle(i*11-10));}return pile;}
  ropeCoil(x,y){const rope=this.add.container(x,y).setDepth(y).setScale(1.3);rope.add(this.add.ellipse(0,11,39,10,0x334a35,.28));const coil=this.add.graphics();coil.lineStyle(4,0xc79a59,1).strokeCircle(-3,0,12).strokeCircle(3,0,8).strokeCircle(0,0,4);rope.add(coil);rope.add(this.add.arc(12,3,10,20,230,false,0xc79a59).setStrokeStyle(3,0xc79a59));return rope;}
  // Supply spots are rolled once per supply quest (one candidate per
  // item from supplySpots.js pools) and persisted, so the hunt differs
  // between adventures but never reshuffles mid-quest.
  materialSpots(){
    if(this._spots)return this._spots;
    let roll=null;
    try{roll=JSON.parse(localStorage.getItem(SUPPLY_SCRATCH_KEY)||'null');}catch{roll=null;}
    let spots=spotsFromRoll(roll);
    if(!spots){
      const chosen=chooseSupplySpots();
      spots=spotsFromRoll(chosen);
      try{localStorage.setItem(SUPPLY_SCRATCH_KEY,JSON.stringify(chosen));}catch{/* storage unavailable */}
    }
    this._spots=spots;
    return spots;
  }
  collect(item){
    const f=this.flags();
    if(!f.met_noah){this.app.dialogue('A useful discovery',this.story.content.before_noah,{fiction:false,reference:this.story.content.reference});return;}
    if(!f.inspected_ark){this.app.dialogue('Take a closer look',this.story.content.inspect_first,{fiction:true,reference:'Genesis 6:14–16'});return;}
    if(item.hidden&&!this.logMoved){this.app.toast('Something may be tucked behind the fallen log.');return;}
    if(f[item.key])return;
    this.materialArt?.[item.key]?.setAlpha(.34);
    f[item.key]=true;if(item.item==='pitch')f.pitch_taken=true;
    const amount=addItem(this.inventory(),item.item);this.app.persist();this.showFeedback(`✦  ${item.item==='wood'?'Wood':item.item==='rope'?'Rope':item.item==='pitch'?'Pitch':'Hammer'} collected · ${amount}`);
    if(hasItems(this.inventory(),{wood:3,rope:2,tool:1,pitch:1})){f.supply_quest_complete=true;clearSupplyScratch();this.app.persist();this.burst(this.player.x,this.player.y);this.app.dialogue('Supplies gathered!',this.story.content.materials_complete,{fiction:true,reference:'Genesis 6:14–16'});}
    this.updateObjective();
  }
  talkNoah(){
    const f=this.flags();
    if(!f.met_noah){this.app.dialogue('Noah',this.story.content.noah,{reference:this.story.content.reference,onComplete:()=>{f.met_noah=true;if(!this.app.save.discoveredCharacters.includes('noah'))this.app.save.discoveredCharacters.push('noah');this.app.persist();this.updateObjective();this.showFeedback('Quest updated · Explore the ark');}});return;}
    if(f.blueprint_complete&&!f.preview_complete){this.app.dialogue('The ark is finished!',this.story.content.complete,{fiction:false,reference:this.story.content.reference,onComplete:()=>this.completeQuest()});return;}
    if(f.blueprint_complete&&!f.mx_complete){this.app.dialogue('Noah',this.story.content.mystery_invite,{fiction:true,reference:'Genesis 6:14–16',onComplete:()=>this.app.router.story(this.story.id,'ark_interior')});return;}
    if(f.mx_complete&&!f.flood_complete){this.app.dialogue('Noah',this.story.content.flood_invite,{fiction:true,reference:'Genesis 7:10–16',onComplete:()=>this.app.router.story(this.story.id,'rising_flood')});return;}
    if(f.flood_complete&&!f.dove_complete){this.app.dialogue('Noah',this.story.content.dove_invite,{fiction:true,reference:'Genesis 8:1–9',onComplete:()=>this.app.router.story(this.story.id,'doves_journey')});return;}
    if(f.dove_complete&&!f.prism_complete){this.app.dialogue('Adventure Guide',this.story.content.prism_invite,{fiction:false,reference:'Genesis 8:20–22',onComplete:()=>this.app.router.story(this.story.id,'rainbow_prism')});return;}
    if(f.prism_complete){this.app.dialogue('Adventure Guide',this.story.content.prism_done,{fiction:false,reference:'Genesis 9:8–17',onComplete:()=>this.app.router.story(this.story.id,'rainbow_prism')});return;}
    if(f.dove_complete){this.app.dialogue('Noah',this.story.content.dove_done,{fiction:false,reference:'Genesis 8:20–22'});return;}
    if(f.flood_complete){this.app.dialogue('Noah',this.story.content.flood_done,{fiction:true,reference:'Genesis 7:16'});return;}
    if(f.build_unlocked){this.app.dialogue('Noah',this.story.content.build_progress,{fiction:true,reference:'Genesis 6:14–16'});return;}
    if(f.supply_quest_complete&&f.pitch_taken){this.app.dialogue('Noah',this.story.content.build_start,{fiction:true,reference:'Genesis 6:14–16',onComplete:()=>{f.build_unlocked=true;this.app.persist();this.updateObjective();this.showFeedback('Quest updated · Help Noah build the ark');this.hotspots=this.hotspots.filter(h=>!(h.x===1110&&h.y===245));this.hotspot(1110,245,this.planLabel(),()=>this.studyBlueprint(),88);}});return;}
    if(f.supply_quest_complete&&!f.pitch_taken){this.app.dialogue('Noah',this.story.content.pitch_reminder,{fiction:true,reference:'Genesis 6:14'});return;}
    this.app.dialogue('Noah',this.story.content.after_talk,{reference:this.story.content.reference});
  }
  replayDoves(){
    this.app.openModal(`<p class="overline">FLY AGAIN</p><h2>The Dove's Journey</h2><p class="reading">Fly any of the dove's three flights again — for the joy of it. Noah's story and your rewards stay exactly as they are.</p><button data-flight="0">Flight 1 · No Place to Rest</button> <button data-flight="1">Flight 2 · The Olive Leaf</button> <button data-flight="2">Flight 3 · A New Beginning</button>`,'reading');
    for(const b of document.querySelectorAll('[data-flight]'))b.onclick=()=>{this.app.doveReplayFlight=Number(b.dataset.flight);this.app.closeModal();this.app.router.story(this.story.id,'doves_journey');};
  }
  inspectArk(){
    const f=this.flags();if(!f.met_noah){this.app.dialogue('The unfinished ark',this.story.content.before_noah,{fiction:false,reference:this.story.content.reference});return;}
    if(!f.inspected_ark){f.inspected_ark=true;this.app.persist();this.updateObjective();this.burst(970,305);this.app.dialogue('The ark',this.story.content.ark,{reference:'Genesis 6:14–16',onComplete:()=>{this.hotspot(1110,245,this.planLabel(),()=>this.studyBlueprint(),88);this.updateObjective();}});return;}
    if(f.blueprint_complete){
      if(!f.mx_complete){this.app.dialogue('Noah',this.story.content.mystery_invite,{fiction:true,reference:'Genesis 6:14–16',onComplete:()=>this.app.router.story(this.story.id,'ark_interior')});return;}
      this.app.dialogue('The finished ark',this.story.content.ark_finished,{fiction:true,reference:'Genesis 6:14–16'});return;
    }
    this.app.dialogue('The ark',this.story.content.ark,{reference:'Genesis 6:14–16'});
  }
  studyBlueprint(){
    const f=this.flags();
    if(!f.met_noah){this.app.dialogue('A careful look',this.story.content.before_noah,{fiction:false,reference:this.story.content.reference});return;}
    if(f.blueprint_complete&&!f.mx_complete){this.app.dialogue('Noah',this.story.content.mystery_invite,{fiction:true,reference:'Genesis 6:14–16',onComplete:()=>this.app.router.story(this.story.id,'ark_interior')});return;}
    if(f.blueprint_complete){this.app.dialogue('Noah’s building plan',this.story.content.blueprint_finished,{fiction:false,reference:'Genesis 6:14–16'});return;}
    if(!f.build_unlocked){this.app.dialogue('Noah’s building plan',this.story.content.build_locked,{fiction:false,reference:'Genesis 6:14–16'});return;}
    if(!f.blueprint_discovered){
      f.blueprint_discovered=true;this.app.persist();this.updateObjective();
      this.app.dialogue('Noah’s building plan',this.story.content.blueprint_clue,{fiction:false,reference:'Genesis 6:14–16',onComplete:()=>this.app.router.story(this.story.id,'ark_blueprint')});
      return;
    }
    this.app.router.story(this.story.id,'ark_blueprint');
  }
  completeQuest(){
    const f=this.flags(),p=this.app.save.stories[this.story.id];f.preview_complete=true;f.noah_card_earned=true;
    if(!p.completedScenes.includes(this.story.entryScene))p.completedScenes.push(this.story.entryScene);
    this.app.persist();this.updateObjective();this.burst(990,570);
    this.showDiscovery();
  }
  showFeedback(message){this.app.toast(message);}
  burst(x,y){
    if(this.app.save.settings.reducedMotion)return;
    for(let i=0;i<16;i++){const a=i*Math.PI/8,star=text(this,x,y,'✦',{fontSize:'16px',color:'#fff0a8'}).setOrigin(.5).setDepth(1200);this.tweens.add({targets:star,x:x+Math.cos(a)*65,y:y+Math.sin(a)*55,alpha:0,scale:.25,duration:560,onComplete:()=>star.destroy()});}
  }
  updateObjective(){
    const f=this.flags(),bag=this.inventory(),wood=inventoryCount(bag,'wood'),rope=inventoryCount(bag,'rope'),tool=inventoryCount(bag,'tool'),pitch=inventoryCount(bag,'pitch');
    const ribs=f.ark_ribs_done||f.blueprint_stage_one;
    const objective=f.prism_complete?'Noah’s chapter is complete — keep exploring, or return to your room.':f.dove_complete?'The dove has returned. Talk with Noah to continue into the sunlit valley.':f.flood_complete?'The waters are going down — talk to Noah about sending out the dove.':f.mx_complete?'Dark clouds are gathering over the valley — talk to Noah about the coming flood.':f.blueprint_complete&&!f.preview_complete?'Tell Noah the ark is finished!':f.blueprint_complete?'The ark is finished — but inside is a mystery. Explore the ark and step inside!':f.preview_complete?'The ark is ready. Keep exploring the meadow.':f.build_unlocked?`Build the ark with Noah: ribs ${ribs?'✓':'…'} · decks ${f.ark_decks_done?'✓':'…'} · sealing …`:!f.met_noah?'Find Noah somewhere in the meadow.':!f.inspected_ark?'Take a closer look at the ark.':!f.supply_quest_complete?`Find supplies: wood ${wood}/3 · rope ${rope}/2 · tool ${tool}/1 · pitch ${pitch}/1`:'Return to Noah with the supplies.';
    this.app.showHUD('Noah’s Meadow',objective,'NOAH’S ARK · CHAPTER 01');
    this.hotspots=this.hotspots.filter(h=>{const item=this.materialSpots().find(i=>i.x===h.x&&i.y===h.y);return !item||!f[item.key];});
  }
}
