import Phaser from 'phaser';

const ink = '#273e38';
const wood = 0xb98453;

// Two short spatial challenges turn the Genesis blueprint clue into an activity:
// rotate and fit the hull timbers, then build three decks from widest to narrowest.
export class ArkBlueprintScene extends Phaser.Scene {
  constructor(){super('ArkBlueprint');}
  init({story}){this.story=story;}
  create(){
    this.app=this.game.registry.get('app');
    this.phonePortrait=window.innerHeight>window.innerWidth;
    document.body.classList.add('blueprint-mode');
    this.events.once('shutdown',()=>document.body.classList.remove('blueprint-mode'));
    this.app.showHUD('Noah’s Blueprint','Rotate and fit the hull timbers.','FIELD NOTES · GENESIS 6');
    this.app.setPrompt('');
    this.app.save.current.x=undefined;this.app.save.current.y=undefined;this.app.persist();
    this.add.rectangle(480,320,960,640,0x314d45);
    this.add.ellipse(480,640,1140,580,0x3d5d4b,.7);
    this.add.rectangle(480,324,900,500,0xf0e4c6).setStrokeStyle(8,0x9d8157);
    this.add.rectangle(480,324,880,480,0xf6ebd0).setStrokeStyle(2,0xd1bd91);
    this.note=this.add.text(480,98,'GENESIS 6:14–16  ·  NOAH’S PLAN',{fontFamily:'Georgia',fontSize:'21px',fontStyle:'bold',color:ink}).setOrigin(.5);
    this.subnote=this.add.text(480,133,'Make a large ark of wood, cover it with pitch, and prepare three decks.',{fontFamily:'Georgia',fontSize:'15px',color:'#526350',align:'center',wordWrap:{width:780}}).setOrigin(.5);
    this.board=this.add.container(0,0);this.slots=[];this.pieces=[];
    this.stage=this.app.save.stories[this.story.id].questFlags.blueprint_stage_one?2:1;
    this.selected=null;this.dragging=null;
    this.input.on('pointerdown',p=>this.pointerDown(p));
    this.input.on('pointermove',p=>this.pointerMove(p));
    this.input.on('pointerup',p=>this.pointerUp(p));
    this.input.keyboard.on('keydown-R',()=>this.rotateSelected());
    this.input.keyboard.on('keydown-ESC',()=>this.leave());
    this.drawStage();
    if(this.app.save.stories[this.story.id].questFlags.blueprint_complete)this.time.delayedCall(0,()=>this.drawCompletion());
  }
  drawStage(){
    this.board.removeAll(true);
    this.addTopButton();
    if(this.stage===1)this.drawHullStage();
    else this.drawDeckStage();
  }
  addTopButton(){
    const b=this.add.text(this.phonePortrait?480:876,this.phonePortrait?30:74,'← Meadow',{fontFamily:'Arial',fontSize:'15px',color:ink,backgroundColor:'#e2d1a7',padding:{x:13,y:10}}).setOrigin(this.phonePortrait ? 0.5 : 1,0).setInteractive({useHandCursor:true});
    b.on('pointerdown',()=>this.leave());
  }
  drawHullStage(){
    this.slots=[];
    this.board.add(this.add.text(480,175,'1  ·  Turn the short beams, then fit the hull',{fontFamily:'Georgia',fontSize:this.phonePortrait?'17px':'22px',fontStyle:'bold',color:ink,align:'center',wordWrap:{width:this.phonePortrait?300:800}}).setOrigin(.5));
    this.board.add(this.add.text(480,215,'The ark was 300 cubits long, 50 wide, and 30 high.',{fontFamily:'Georgia',fontSize:this.phonePortrait?'13px':'16px',color:'#53604b',align:'center',wordWrap:{width:300}}).setOrigin(.5));
    this.board.add(this.add.text(480,245,'Drag the beams. Turn both short beams upright with ↻.',{fontFamily:'Arial',fontSize:this.phonePortrait?'12px':'13px',color:'#6b715c',align:'center',wordWrap:{width:300}}).setOrigin(.5));
    const centerWidth=this.phonePortrait?210:300,sideX=this.phonePortrait?[385,575]:[320,640],sideHeight=this.phonePortrait?110:140;
    this.hullTargets={keel:{x:480,y:325,rotation:0},'side-a':{x:sideX[0],y:410,rotation:Math.PI/2},'side-b':{x:sideX[1],y:410,rotation:Math.PI/2}};
    this.slot(480,325,centerWidth,30,0xc8b990,'LONG KEEL');
    this.slot(sideX[0],410,28,sideHeight,0xc8b990,'SIDE');
    this.slot(sideX[1],410,28,sideHeight,0xc8b990,'SIDE');
    const f=this.app.save.stories[this.story.id].questFlags;
    const starts=this.phonePortrait?[[390,525],[480,525],[570,525]]:[[220,525],[475,525],[730,525]];
    const beamRows=[['keel','beam_keel_placed','keel'],['side-a','beam_a_placed','side-a'],['side-b','beam_b_placed','side-b']];
    beamRows.forEach(([id,flag,target],i)=>{
      const placed=!!f[flag],slot=this.hullTargets[target];
      const [x,y]=placed?[slot.x,slot.y]:starts[i];
      const rotation=id==='keel'?0:Number(f[id==='side-a'?'beam_a_rotated':'beam_b_rotated']?Math.PI/2:0);
      const width=id==='keel'?(this.phonePortrait?190:210):(this.phonePortrait?95:125);
      const piece=this.piece(id,x,y,width,id==='keel'?30:28,placed?slot.rotation:rotation,id==='keel'?'LONG':'SIDE',wood,placed);
      if(placed)piece.disableInteractive();
    });
    const rotate=this.add.text(480,594,'↻  Rotate selected beam   ·   R',{fontFamily:'Arial',fontSize:'16px',color:'#fff2cf',backgroundColor:'#35594c',padding:{x:18,y:12}}).setOrigin(.5).setInteractive({useHandCursor:true});
    rotate.on('pointerdown',()=>this.rotateSelected());
    this.board.add(rotate);
  }
  drawDeckStage(){
    this.slots=[];
    this.board.add(this.add.text(480,175,'2  ·  Give the ark three decks',{fontFamily:'Georgia',fontSize:this.phonePortrait?'18px':'22px',fontStyle:'bold',color:ink,align:'center',wordWrap:{width:300}}).setOrigin(.5));
    this.board.add(this.add.text(480,215,'Drag each floor into the hull. The widest deck goes lowest.',{fontFamily:'Georgia',fontSize:this.phonePortrait?'13px':'16px',color:'#53604b',align:'center',wordWrap:{width:300}}).setOrigin(.5));
    this.board.add(this.add.text(480,250,'Genesis describes three levels inside the ark.',{fontFamily:'Arial',fontSize:'12px',color:'#6b715c'}).setOrigin(.5));
    const ys=[320,390,460], widths=this.phonePortrait?[240,205,170]:[310,250,190], labels=['LOWER · WIDEST','MIDDLE','UPPER · NARROWEST'];
    const palette=[0xc49a68,0xb68558,0x9e704a];
    ys.forEach((y,i)=>{
      const hull=this.add.rectangle(480,y,widths[i],45,0xead9ad).setStrokeStyle(2,0x9f8359);
      this.board.add(hull);this.board.add(this.add.text(480,y,labels[i],{fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',color:'#68725a'}).setOrigin(.5));
      this.slots.push({x:480,y,w:widths[i],h:45,label:labels[i]});
    });
    const f=this.app.save.stories[this.story.id].questFlags;
    const cards=[{id:'lower',w:310,slot:0,color:palette[0]},{id:'middle',w:250,slot:1,color:palette[1]},{id:'upper',w:190,slot:2,color:palette[2]}];
    const startX=this.phonePortrait?[390,480,570]:[210,480,750];
    cards.forEach((card,i)=>{
      const placed=f[`deck_${card.id}_placed`];
      const width=this.phonePortrait?widths[i]:card.w;
      this.piece(`deck-${card.id}`,placed?480:startX[i],placed?ys[card.slot]:535,width,28,0,card.id.toUpperCase(),card.color,placed);
      this.pieces.at(-1).slot=card.slot;
    });
    this.tryCompleteDecks();
  }
  slot(x,y,w,h,color,labelText){
    this.slots??=[];
    const shape=this.add.rectangle(x,y,w,h,color,.45).setStrokeStyle(3,0x8d7955,.8);
    this.board.add(shape);
    if(labelText)this.board.add(this.add.text(x,y+h/2+12,labelText,{fontFamily:'Arial',fontSize:'10px',color:'#77705a'}).setOrigin(.5));
    this.slots.push({x,y,w,h,label:labelText});
  }
  piece(id,x,y,w,h,rotation,text,color=wood,placed=false){
    this.pieces??=[];
    const c=this.add.container(x,y).setRotation(rotation);
    const plank=this.add.rectangle(0,0,w,h,color).setStrokeStyle(3,0x704d36);
    c.add(plank);c.add(this.add.rectangle(0,-h/2+5,w-12,3,0xe4bb7e,.8));
    c.add(this.add.text(0,0,text,{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:'#513e2f'}).setOrigin(.5));
    c.setSize(w,h).setInteractive(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h),Phaser.Geom.Rectangle.Contains);
    c.id=id;c.baseW=w;c.baseH=h;c.placed=placed;c.setDepth(20);
    this.pieces.push(c);this.board.add(c);return c;
  }
  pointerDown(pointer){
    if(this.app.isBlocked())return;
    for(const piece of [...(this.pieces??[])].reverse())if(piece.getBounds().contains(pointer.worldX,pointer.worldY)&&!piece.placed){
      this.dragging=piece;this.selected=piece;this.dragOffset={x:piece.x-pointer.worldX,y:piece.y-pointer.worldY};piece.setDepth(40);return;
    }
  }
  pointerMove(pointer){if(this.dragging&&pointer.isDown)this.dragging.setPosition(pointer.worldX+this.dragOffset.x,pointer.worldY+this.dragOffset.y);}
  pointerUp(){
    if(!this.dragging)return;
    const piece=this.dragging;this.dragging=null;piece.setDepth(20);
    if(this.stage===1)this.dropHullPiece(piece);else this.dropDeckPiece(piece);
  }
  rotateSelected(){
    const piece=this.selected;if(!piece||piece.placed)return;
    piece.rotation=Phaser.Math.Angle.Wrap(piece.rotation+Math.PI/2);
    const flags=this.app.save.stories[this.story.id].questFlags;
    if(piece.id==='side-a')flags.beam_a_rotated=Math.abs(piece.rotation)>1;
    if(piece.id==='side-b')flags.beam_b_rotated=Math.abs(piece.rotation)>1;
    this.app.persist();this.ping(piece.x,piece.y,'Turned around');
  }
  dropHullPiece(piece){
    const targets=this.hullTargets;
    const target=targets[piece.id];
    if(Phaser.Math.Distance.Between(piece.x,piece.y,target.x,target.y)<75&&Math.abs(Phaser.Math.Angle.Wrap(piece.rotation-target.rotation))<.3){
      piece.setPosition(target.x,target.y);piece.rotation=target.rotation;piece.placed=true;piece.disableInteractive();
      const flag=piece.id==='keel'?'beam_keel_placed':piece.id==='side-a'?'beam_a_placed':'beam_b_placed';
      this.app.save.stories[this.story.id].questFlags[flag]=true;this.app.persist();this.feedback?.destroy();
      if(this.pieces.every(p=>p.placed))this.finishHull();
    } else {
      const starts=this.phonePortrait?[[390,525],[480,525],[570,525]]:[[220,525],[475,525],[730,525]];
      piece.setPosition(...starts[this.pieces.indexOf(piece)]);
      if(Math.abs(piece.rotation-target.rotation)>=.3)this.ping(piece.x,piece.y,'Turn the short beams upright first.');
      else this.ping(piece.x,piece.y,'Look for the beam outline that fits.');
    }
  }
  finishHull(){
    const flags=this.app.save.stories[this.story.id].questFlags;flags.blueprint_stage_one=true;this.app.persist();this.celebrate(480,340);
    this.time.delayedCall(650,()=>{this.stage=2;this.pieces=[];this.slots=[];this.board.removeAll(true);this.drawStage();});
  }
  dropDeckPiece(piece){
    const target=this.slots[piece.slot];
    if(Math.abs(piece.x-target.x)<95&&Math.abs(piece.y-target.y)<47){
      piece.setPosition(target.x,target.y);piece.placed=true;piece.disableInteractive();
      const key=piece.id.replace('deck-','');this.app.save.stories[this.story.id].questFlags[`deck_${key}_placed`]=true;this.app.persist();this.feedback?.destroy();this.tryCompleteDecks();
    } else {
      const starts=this.phonePortrait?{'deck-lower':[390,535],'deck-middle':[480,535],'deck-upper':[570,535]}:{'deck-lower':[210,530],'deck-middle':[480,530],'deck-upper':[750,530]};piece.setPosition(...starts[piece.id]);this.ping(piece.x,piece.y,'Try the deck that matches this level.');
    }
  }
  tryCompleteDecks(){if(this.stage===2&&['lower','middle','upper'].every(name=>this.app.save.stories[this.story.id].questFlags[`deck_${name}_placed`]))this.finishPuzzle();}
  finishPuzzle(){
    const flags=this.app.save.stories[this.story.id].questFlags;
    if(flags.blueprint_complete)return;
    flags.blueprint_stage_two=true;flags.blueprint_complete=true;
    const progress=this.app.save.stories[this.story.id];if(!progress.completedScenes.includes('ark_blueprint'))progress.completedScenes.push('ark_blueprint');
    this.app.persist();this.celebrate(480,350);this.time.delayedCall(700,()=>this.drawCompletion());
  }
  drawCompletion(){
    this.board.removeAll(true);this.pieces=[];this.slots=[];
    this.board.add(this.add.text(480,260,'Blueprint restored!',{fontFamily:'Georgia',fontSize:'34px',fontStyle:'bold',color:'#355447'}).setOrigin(.5));
    this.board.add(this.add.text(480,318,'You fitted the keel, turned the side beams, and made room for three decks.',{fontFamily:'Arial',fontSize:'17px',color:'#53604b',align:'center',wordWrap:{width:680}}).setOrigin(.5));
    this.board.add(this.add.text(480,373,'Noah’s instructions are recorded in Genesis 6:14–16.',{fontFamily:'Georgia',fontSize:'16px',color:'#7a6749'}).setOrigin(.5));
    const btn=this.add.text(480,455,'Return to Noah  →',{fontFamily:'Arial',fontSize:'18px',fontStyle:'bold',color:'#fff2cf',backgroundColor:'#35594c',padding:{x:25,y:15}}).setOrigin(.5).setInteractive({useHandCursor:true});
    btn.on('pointerdown',()=>this.returnToMeadow());this.board.add(btn);
  }
  leave(){this.returnToMeadow();}
  returnToMeadow(){this.app.router.story(this.story.id,'meet_noah',{x:980,y:550});}
  ping(x,y,message){this.feedback?.destroy();this.feedback=this.add.text(x,y-42,message,{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#fff5d8',backgroundColor:'#29483f',padding:{x:10,y:8}}).setOrigin(.5);this.time.delayedCall(1600,()=>this.feedback?.destroy());}
  celebrate(x,y){if(this.app.save.settings.reducedMotion)return;for(let i=0;i<24;i++){const angle=i*Math.PI/12,star=this.add.text(x,y,'✦',{fontSize:'18px',color:i%2?'#e8c96f':'#b07d48'}).setOrigin(.5).setDepth(50);this.tweens.add({targets:star,x:x+Math.cos(angle)*105,y:y+Math.sin(angle)*75,alpha:0,scale:.2,duration:700,onComplete:()=>star.destroy()});}}
}
