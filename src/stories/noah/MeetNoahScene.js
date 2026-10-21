import { ExploreScene } from '../../scenes/ExploreScene.js';
import Phaser from 'phaser';
import { character, label } from '../../scenes/art.js';
import { addItem, hasItems, inventoryCount } from '../../core/Inventory.js';
import meadow from '../../assets/noah-meadow-concept.jpg';

// A compact, hand-built RPG field. The scene owns Noah-specific quest steps;
// movement, prompts, touch input, routing and persistence remain shared systems.
export class MeetNoahScene extends ExploreScene {
  constructor(){super('MeetNoah');}
  preload(){this.load.image('noah-meadow',meadow);}
  init({story,spawn}){this.story=story;this.savedSpawn=spawn;}
  create(){
    const app=this.game.registry.get('app'),content=this.story.content;
    const spawn=Number.isFinite(this.savedSpawn?.x)&&Number.isFinite(this.savedSpawn?.y)?this.savedSpawn:{x:820,y:510};
    this.setup(app,spawn);
    this.drawMap();
    // Old preview saves can resume on top of the fallen log, now a new landmark.
    if(!this.canStand(this.player.x,this.player.y)||Phaser.Math.Distance.Between(this.player.x,this.player.y,850,820)<112||spawn.y>700)this.player.setPosition(820,510);
    this.bounds={left:36,right:1464,top:92,bottom:1034};
    const cameraBounds=()=>window.innerHeight>window.innerWidth?this.cameras.main.setBounds(-400,0,2300,1100):this.cameras.main.setBounds(0,0,1500,1100);
    cameraBounds();this.scale.on('resize',cameraBounds);this.events.once('shutdown',()=>this.scale.off('resize',cameraBounds));
    this.cameras.main.startFollow(this.player,true,.12,.12);
    this.cameras.main.setZoom(window.innerHeight > window.innerWidth ? 0.46 : 1.08);
    this.buildPeopleAndProps();
    const f=this.flags();
    // Previous preview saves could mark this scene complete after only two
    // interactions. Keep their discoveries, but reopen the material quest.
    if(f.preview_complete&&!f.supply_quest_complete){delete f.preview_complete;const p=this.app.save.stories[this.story.id];p.completedScenes=p.completedScenes.filter(id=>id!==this.story.entryScene);this.app.persist();}
    this.hotspot(990,570,f.met_noah?(f.supply_quest_complete?'Return to Noah':'Talk with Noah'):'Find Noah',()=>this.talkNoah(),94);
    this.hotspot(970,305,f.inspected_ark?'Explore the ark':'Inspect the ark',()=>this.inspectArk(),100);
    if(f.inspected_ark)this.hotspot(1110,245,'Study Noah’s building plan',()=>this.studyBlueprint(),88);
    this.hotspot(1095,930,'Look beside the stream',()=>app.dialogue('Beside the stream',content.discovery,{fiction:true,reference:content.reference}),78);
    if(!f.log_moved)this.hotspot(850,820,'Drag the fallen log aside',()=>this.app.toast('Touch the log and drag it away from the path.'),80);
    for(const item of this.materialSpots()) if((!item.hidden||f.log_moved)&&!f[item.key])this.hotspot(item.x,item.y,item.name,()=>this.collect(item),58);
    this.hotspot(125,910,'Return to your room',()=>app.router.home(),64);
    this.updateObjective();
  }
  flags(){return this.app.save.stories[this.story.id].questFlags;}
  inventory(){const progress=this.app.save.stories[this.story.id];progress.inventory??={};return progress.inventory;}
  canStand(x,y){
    if(!super.canStand(x,y))return false;
    if(Phaser.Geom.Polygon.Contains(this.waterPolygon,x,y))return this.steppingStones.some(([sx,sy])=>Phaser.Math.Distance.Between(x,y,sx,sy)<43);
    return true;
  }
  drawMap(){
    const ground=this.add.graphics().setDepth(-20);
    ground.fillStyle(0x77995c).fillRect(-250,-250,2000,1900);
    for(let i=0;i<520;i++){
      const x=(i*193+61)%1500,y=(i*127+37)%1600;
      ground.fillStyle(i%4===0?0x9aaf6b:0x5d824c,.22).fillEllipse(x,y,5+(i%4)*2,2+(i%3));
    }
    this.add.image(750,550,'noah-meadow').setDisplaySize(1500,1100).setDepth(-10);
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
    this.noah=this.add.image(990,570,'noah-down-0').setOrigin(.5,.85).setScale(.9).setDepth(571);
    if(!this.app.save.settings.reducedMotion)this.tweens.add({targets:this.noah,y:567,duration:950,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    label(this,990,595,'NOAH','#fff0cc',13).setDepth(572);
    const sheep=this.add.container(520,710).setDepth(711);const body=this.add.ellipse(0,0,33,23,0xf1e7ce);sheep.add(body);sheep.add(this.add.circle(-14,2,4,0x4a4438));sheep.add(this.add.circle(14,2,4,0x4a4438));sheep.add(this.add.triangle(17,-7,0,9,8,0,0,0,0x4a4438));
    const bird=this.add.container(1150,565).setDepth(566);bird.add(this.add.ellipse(0,0,25,16,0xd8d0b4));bird.add(this.add.circle(10,-4,7,0xd8d0b4));bird.add(this.add.triangle(18,-4,0,3,9,0,0,-3,0xc88e56));
    if(!this.app.save.settings.reducedMotion){this.tweens.add({targets:sheep,x:560,y:725,duration:5600,yoyo:true,repeat:-1,ease:'Sine.inOut'});this.tweens.add({targets:bird,x:1180,y:555,duration:3100,yoyo:true,repeat:-1,ease:'Sine.inOut'});}
    this.drawMaterials();
    const savedFlags=this.flags();
    for(const item of this.materialSpots())if(savedFlags[item.key])this.materialArt[item.key].setAlpha(.34);
    label(this,1260,640,'STREAM','#d5ead0',10).setDepth(800);
    const plan=this.add.container(1110,245).setDepth(246);
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
      if(!this.logMoved&&(Math.abs(this.log.y-this.dragStart.y)>64||Math.abs(this.log.x-this.dragStart.x)>64)){this.logMoved=true;this.flags().log_moved=true;this.log.setDepth(this.log.y);this.hiddenWood.setVisible(true);this.hiddenSpark.setVisible(true);this.hotspots=this.hotspots.filter(h=>h.name!=='Drag the fallen log aside');const hidden=this.materialSpots().find(item=>item.key==='wood_3');if(!this.flags()[hidden.key])this.hotspot(hidden.x,hidden.y,hidden.name,()=>this.collect(hidden),58);this.app.persist();this.showFeedback('You shifted the fallen log. A supply was tucked behind it!');this.burst(this.hiddenWood.x,this.hiddenWood.y);}
    });
    this.hiddenWood=this.materialArt.wood_3;
    this.hiddenSpark=this.add.text(x,y-30,'✦',{fontSize:'18px',color:'#fff0ad'}).setOrigin(.5).setDepth(y+5).setVisible(false);
    if(!this.app.save.settings.reducedMotion)this.tweens.add({targets:this.hiddenSpark,y:y-38,alpha:.35,duration:800,yoyo:true,repeat:-1});
    if(this.flags().log_moved){this.logMoved=true;this.log.setY(y-82);this.logWall.setTo(this.log.x-50,this.log.y-16,100,32);this.hiddenWood.setVisible(true);this.hiddenSpark.setVisible(true);}
  }
  drawMaterials(){
    const wood1=this.woodPile(590,730),wood2=this.woodPile(905,645),wood3=this.add.container(900,865).setDepth(867).setVisible(false);
    wood3.add(this.add.ellipse(0,10,45,12,0x334a35,.25));wood3.add(this.add.rectangle(-7,0,36,11,0x9b7048).setAngle(14));wood3.add(this.add.rectangle(12,-8,28,10,0xb68a59).setAngle(-13));

    const rope1=this.ropeCoil(1120,660),rope2=this.ropeCoil(1370,790);

    const jar=this.add.container(1070,875).setDepth(876);
    jar.add(this.add.ellipse(0,15,36,10,0x334a35,.3));
    jar.add(this.add.rectangle(0,0,23,29,0x9d7250).setStrokeStyle(2,0x654b37));
    jar.add(this.add.rectangle(0,-17,11,7,0x72533b));jar.add(this.add.rectangle(0,-13,18,3,0xd0ad69));
    jar.add(this.add.rectangle(0,1,13,12,0xc29a61));
    const hammer=this.add.container(680,890).setDepth(891);
    hammer.add(this.add.ellipse(0,12,36,10,0x334a35,.3));hammer.add(this.add.rectangle(0,1,5,27,0x986f47).setAngle(-20));
    hammer.add(this.add.rectangle(2,-11,22,8,0x777767).setAngle(-20));hammer.add(this.add.rectangle(-7,-11,8,13,0x777767).setAngle(-20));
    // A warm pulse and small glint make each quest prop legible against the grass.
    for(const [x,y] of [[590,730],[905,645],[1120,660],[1370,790],[1070,875],[680,890]]){
      const glint=this.add.text(x+20,y-22,'✦',{fontSize:'14px',color:'#fff0ad'}).setOrigin(.5).setDepth(y+20);
      if(!this.app.save.settings.reducedMotion)this.tweens.add({targets:glint,y:y-28,alpha:.35,duration:800,yoyo:true,repeat:-1});
    }
    this.materialArt={wood_1:wood1,wood_2:wood2,wood_3:wood3,rope_1:rope1,rope_2:rope2,tool_1:hammer,pitch:jar};
  }
  woodPile(x,y){const pile=this.add.container(x,y).setDepth(y);pile.add(this.add.ellipse(0,11,52,12,0x334a35,.28));for(let i=0;i<3;i++){pile.add(this.add.rectangle((i-1)*8,(i%2)*6,42,10,i%2?0x9b7048:0xb08454).setAngle(i*11-10));}return pile;}
  ropeCoil(x,y){const rope=this.add.container(x,y).setDepth(y);rope.add(this.add.ellipse(0,11,39,10,0x334a35,.28));const coil=this.add.graphics();coil.lineStyle(4,0xc79a59,1).strokeCircle(-3,0,12).strokeCircle(3,0,8).strokeCircle(0,0,4);rope.add(coil);rope.add(this.add.arc(12,3,10,20,230,false,0xc79a59).setStrokeStyle(3,0xc79a59));return rope;}
  materialSpots(){return [
    {key:'wood_1',item:'wood',x:590,y:730,name:'Gather wood by the path'},
    {key:'wood_2',item:'wood',x:905,y:645,name:'Search the forest clearing'},
    {key:'wood_3',item:'wood',x:900,y:865,name:'Collect wood behind the fallen log',hidden:true},
    {key:'rope_1',item:'rope',x:1120,y:660,name:'Gather rope by the riverbank'},
    {key:'rope_2',item:'rope',x:1370,y:790,name:'Search the far riverbank'},
    {key:'tool_1',item:'tool',x:680,y:890,name:'Find the construction hammer'}
  ];}
  collect(item){
    const f=this.flags();
    if(!f.met_noah){this.app.dialogue('A useful discovery',this.story.content.before_noah,{fiction:false,reference:this.story.content.reference});return;}
    if(!f.inspected_ark){this.app.dialogue('Take a closer look',this.story.content.inspect_first,{fiction:true,reference:'Genesis 6:14–16'});return;}
    if(item.hidden&&!this.logMoved){this.app.toast('Something may be tucked behind the fallen log.');return;}
    if(f[item.key])return;
    this.materialArt?.[item.key]?.setAlpha(.34);
    f[item.key]=true;const amount=addItem(this.inventory(),item.item);this.app.persist();this.showFeedback(`✦  ${item.item==='wood'?'Wood':item.item==='rope'?'Rope':'Hammer'} collected · ${amount}`);
    if(hasItems(this.inventory(),{wood:3,rope:2,tool:1})){f.supply_quest_complete=true;this.app.persist();this.burst(this.player.x,this.player.y);this.app.dialogue('Supplies gathered!',this.story.content.materials_complete,{fiction:true,reference:'Genesis 6:14–16'});}
    this.updateObjective();
  }
  talkNoah(){
    const f=this.flags();
    if(!f.met_noah){this.app.dialogue('Noah',this.story.content.noah,{reference:this.story.content.reference,onComplete:()=>{f.met_noah=true;if(!this.app.save.discoveredCharacters.includes('noah'))this.app.save.discoveredCharacters.push('noah');this.app.persist();this.updateObjective();this.showFeedback('Quest updated · Explore the ark');}});return;}
    if(f.supply_quest_complete){this.app.dialogue('A job well done',this.story.content.return_noah,{fiction:true,reference:this.story.content.reference,onComplete:()=>this.completeQuest()});return;}
    this.app.dialogue('Noah',this.story.content.after_talk,{reference:this.story.content.reference});
  }
  inspectArk(){
    const f=this.flags();if(!f.met_noah){this.app.dialogue('The unfinished ark',this.story.content.before_noah,{fiction:false,reference:this.story.content.reference});return;}
    if(!f.inspected_ark){f.inspected_ark=true;this.app.persist();this.updateObjective();this.burst(970,305);this.app.dialogue('The ark',this.story.content.ark,{reference:'Genesis 6:14–16',onComplete:()=>{this.hotspot(1110,245,'Study Noah’s building plan',()=>this.studyBlueprint(),88);this.updateObjective();}});return;}
    this.app.dialogue('The ark',this.story.content.ark,{reference:'Genesis 6:14–16'});
  }
  studyBlueprint(){
    const f=this.flags();
    if(!f.met_noah){this.app.dialogue('A careful look',this.story.content.before_noah,{fiction:false,reference:this.story.content.reference});return;}
    if(!f.blueprint_discovered){
      f.blueprint_discovered=true;this.app.persist();this.updateObjective();
      this.app.dialogue('Noah’s building plan',this.story.content.blueprint_clue,{fiction:false,reference:'Genesis 6:14–16',onComplete:()=>this.app.router.story(this.story.id,'ark_blueprint')});
      return;
    }
    if(f.blueprint_complete){this.app.dialogue('Noah’s building plan',this.story.content.blueprint_finished,{fiction:false,reference:'Genesis 6:14–16'});return;}
    this.app.router.story(this.story.id,'ark_blueprint');
  }
  completeQuest(){
    const f=this.flags(),p=this.app.save.stories[this.story.id];f.preview_complete=true;
    if(!p.completedScenes.includes(this.story.entryScene))p.completedScenes.push(this.story.entryScene);
    this.app.persist();this.updateObjective();this.burst(990,570);
    this.app.dialogue('Chapter explored!',this.story.content.complete,{fiction:false,reference:this.story.content.reference});
  }
  showFeedback(message){this.app.toast(message);}
  burst(x,y){
    if(this.app.save.settings.reducedMotion)return;
    for(let i=0;i<16;i++){const a=i*Math.PI/8,star=this.add.text(x,y,'✦',{fontSize:'16px',color:'#fff0a8'}).setOrigin(.5).setDepth(1200);this.tweens.add({targets:star,x:x+Math.cos(a)*65,y:y+Math.sin(a)*55,alpha:0,scale:.25,duration:560,onComplete:()=>star.destroy()});}
  }
  updateObjective(){
    const f=this.flags(),bag=this.inventory(),wood=inventoryCount(bag,'wood'),rope=inventoryCount(bag,'rope'),tool=inventoryCount(bag,'tool');
    const objective=f.blueprint_discovered&&!f.blueprint_complete?'Restore the ark’s shape, then fit its three decks.':f.blueprint_complete&&!f.supply_quest_complete?'Plan restored! Explore the meadow for Noah’s supplies.':f.preview_complete&&f.supply_quest_complete?'Meadow explored! Keep exploring, or return to your room.':!f.met_noah?'Find Noah somewhere in the meadow.':!f.inspected_ark?'Take a closer look at the ark.':!f.supply_quest_complete?`Find supplies: wood ${wood}/3 · rope ${rope}/2 · tool ${tool}/1`:'Return to Noah with the supplies.';
    this.app.showHUD('Noah’s Meadow',objective,'NOAH’S ARK · CHAPTER 01');
    this.hotspots=this.hotspots.filter(h=>{const item=this.materialSpots().find(i=>i.x===h.x&&i.y===h.y);return !item||!f[item.key];});
  }
}
