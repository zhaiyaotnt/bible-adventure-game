import Phaser from 'phaser';
import { character, label } from './art.js';
export class ExploreScene extends Phaser.Scene {
  setup(app, spawn) {
    this.app=app; this.bounds={left:45,right:915,top:175,bottom:583}; this.hotspots=[]; this.walls=[]; this.direction='down'; this.velocity={x:0,y:0}; this.elapsed=0;
    character(this,'aaron',0xc67b4a,0x4d3e32);
    this.player=this.add.image(spawn.x,spawn.y,'aaron-down-0').setOrigin(.5,.85).setDepth(10).setScale(.65);
    this.player.setInteractive({ useHandCursor:false });
    // Direct touch movement, Poké Run style: no joystick. Tap the world and
    // Aaron walks to that point; hold and drag and he follows your finger in
    // any direction until you release (he then finishes the last short step
    // to where you let go). Keyboard input always takes over and cancels
    // the touch target.
    this.moveTarget=null; this.touchPointerId=null; this.touchStuck=0;
    this.input.on('pointerdown',pointer=>{
      if(app.isBlocked())return;
      if((this.draggableObjects??[]).some(o=>o.getBounds?.().contains(pointer.worldX,pointer.worldY)))return;
      this.touchPointerId=pointer.id; this.touchStuck=0;
      this.moveTarget={x:pointer.worldX,y:pointer.worldY};
    });
    this.input.on('pointermove',pointer=>{
      if(pointer.id===this.touchPointerId&&pointer.isDown)this.moveTarget={x:pointer.worldX,y:pointer.worldY};
    });
    const releaseTouch=pointer=>{if(pointer.id===this.touchPointerId)this.touchPointerId=null;};
    this.input.on('pointerup',releaseTouch);
    this.input.on('pointerupoutside',releaseTouch);
    this.input.on('pointercancel',releaseTouch);
    // The camera always follows Aaron. The game is scaled ENVELOP, which
    // crops the overflow on mismatched screen shapes, so zoom in just
    // enough that the cropped slice can still keep him in view; a scene
    // that manages its own camera (Noah's meadow) opts out via the flag.
    this.world={width:960,height:640}; this.cameraManagedByScene=false;
    this.fitCamera=()=>{
      if(this.cameraManagedByScene)return;
      const cam=this.cameras.main,display=this.scale.displaySize,game=this.scale.gameSize;
      cam.setBounds(0,0,this.world.width,this.world.height);
      cam.startFollow(this.player,true,.12,.12);
      const parentAspect=display.width/Math.max(1,display.height),gameAspect=game.width/game.height;
      const zoom=Math.max(gameAspect/parentAspect,parentAspect/gameAspect);
      cam.setZoom(Math.max(1,zoom)*1.02);
    };
    this.fitCamera();
    this.scale.on('resize',this.fitCamera);
    this.events.once('shutdown',()=>this.scale.off('resize',this.fitCamera));
    this.keys=this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER,ESC');
    this.interactHandler=()=>{if(!app.isBlocked())this.interact();};
    for(const k of ['E','SPACE','ENTER'])this.keys[k].on('down',this.interactHandler);
    this.keys.ESC.on('down',()=> app.dismiss());
    this.marker=label(this,0,0,'✦','#fff2c5',20).setDepth(12).setVisible(false);
    this.events.once('shutdown',()=>{ app.setPrompt(''); app.input.reset(); this.input.keyboard.resetKeys(); });
    if(!app.save.settings.reducedMotion)this.cameras.main.fadeIn(300,24,46,45);
  }
  wall(x,y,w,h){const wall=new Phaser.Geom.Rectangle(x,y,w,h);this.walls.push(wall);return wall;}
  hotspot(x,y,name,action,radius=78){this.hotspots.push({x,y,name,action,radius});}
  interact(){ if(this.nearby) { this.velocity={x:0,y:0}; this.moveTarget=null; this.nearby.action(); } }
  canStand(x,y){return x>this.bounds.left && x<this.bounds.right && y>this.bounds.top && y<this.bounds.bottom && !this.walls.some(r=>r.contains(x,y)||r.contains(x-12,y)||r.contains(x+12,y)||r.contains(x,y-8));}
  update(time,delta){
    if(!this.player)return;
    if(this.app.isBlocked()){this.velocity={x:0,y:0};this.moveTarget=null;this.touchPointerId=null;this.player.setTexture(`aaron-${this.direction}-0`);this.app.setPrompt('');this.marker.setVisible(false);return;}
    const held=this.app.input.held,k=this.keys;
    if(this.draggingLog)this.velocity={x:0,y:0};
    const keyX=this.draggingLog?0:Number(k.D.isDown||k.RIGHT.isDown||held.has('right'))-Number(k.A.isDown||k.LEFT.isDown||held.has('left'));
    const keyY=this.draggingLog?0:Number(k.S.isDown||k.DOWN.isDown||held.has('down'))-Number(k.W.isDown||k.UP.isDown||held.has('up'));
    let dx=this.draggingLog?0:(keyX||keyY?keyX:this.app.input.vector.x);
    let dy=this.draggingLog?0:(keyX||keyY?keyY:this.app.input.vector.y);
    if(keyX||keyY)this.moveTarget=null;
    if(!this.draggingLog&&!keyX&&!keyY&&this.moveTarget){
      const tx=this.moveTarget.x-this.player.x,ty=this.moveTarget.y-this.player.y,td=Math.hypot(tx,ty);
      if(td<8){this.moveTarget=null;dx=0;dy=0;}
      else{dx=tx/td;dy=ty/td;}
    }
    const length=Math.hypot(dx,dy),dt=Math.min(delta,40)/1000;
    if(length>1){dx/=length;dy/=length;}
    const speed=170,acceleration=1050,deceleration=1350;
    const desiredX=dx*speed,desiredY=dy*speed;
    const approach=(value,target,amount)=>value<target?Math.min(value+amount,target):Math.max(value-amount,target);
    this.velocity.x=approach(this.velocity.x,desiredX,(length?acceleration:deceleration)*dt);
    this.velocity.y=approach(this.velocity.y,desiredY,(length?acceleration:deceleration)*dt);
    let moving=Math.hypot(this.velocity.x,this.velocity.y)>5;
    const prevX=this.player.x,prevY=this.player.y;
    if(moving){
      const nx=this.player.x+this.velocity.x*dt,ny=this.player.y+this.velocity.y*dt;
      const movedX=this.canStand(nx,this.player.y),movedY=this.canStand(this.player.x,ny);
      if(movedX)this.player.x=nx;else this.velocity.x=0;
      if(movedY)this.player.y=ny;else this.velocity.y=0;
      moving=movedX||movedY;
      this.direction=this.facingDirection(this.velocity.x||dx,this.velocity.y||dy);
    }
    // A tap target Aaron cannot reach (inside a wall, across the stream)
    // must not pin him against it forever: give up after a short stall.
    if(this.moveTarget){
      if(Math.hypot(this.player.x-prevX,this.player.y-prevY)<0.2){this.touchStuck+=dt;if(this.touchStuck>0.35){this.moveTarget=null;this.touchStuck=0;}}
      else this.touchStuck=0;
    }
    this.player.setTexture(`aaron-${this.direction}-${moving ? 2+Math.floor(time/150)%2 : Math.floor(time/720)%2}`);
    this.player.setDepth(this.player.y);
    if(this.app.save.current.location==='story') { this.app.save.current.x=this.player.x; this.app.save.current.y=this.player.y; }
    this.nearby=this.hotspots.map(h=>({...h,d:Phaser.Math.Distance.Between(this.player.x,this.player.y,h.x,h.y)})).filter(h=>h.d<h.radius).sort((a,b)=>a.d-b.d)[0];
    this.app.setPrompt(this.nearby ? `${this.nearby.name}` : '');
    this.marker.setVisible(!!this.nearby);if(this.nearby)this.marker.setPosition(this.nearby.x,this.nearby.y-54);
  }

  facingDirection(dx,dy){
    const angle=Math.atan2(dy,dx),sector=Math.round(angle/(Math.PI/4));
    return ['right','down-right','down','down-left','left','up-left','up','up-right'][((sector%8)+8)%8];
  }
}
