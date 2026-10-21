import Phaser from 'phaser';
import { character, label } from './art.js';
export class ExploreScene extends Phaser.Scene {
  setup(app, spawn) {
    this.app=app; this.bounds={left:45,right:915,top:175,bottom:583}; this.hotspots=[]; this.walls=[]; this.direction='down'; this.velocity={x:0,y:0}; this.elapsed=0;
    character(this,'aaron',0xc67b4a,0x4d3e32);
    this.player=this.add.image(spawn.x,spawn.y,'aaron-down-0').setOrigin(.5,.85).setDepth(10).setScale(.65);
    this.player.setInteractive({ useHandCursor:false });
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
  interact(){ if(this.nearby) { this.velocity={x:0,y:0}; this.nearby.action(); } }
  canStand(x,y){return x>this.bounds.left && x<this.bounds.right && y>this.bounds.top && y<this.bounds.bottom && !this.walls.some(r=>r.contains(x,y)||r.contains(x-12,y)||r.contains(x+12,y)||r.contains(x,y-8));}
  update(time,delta){
    if(!this.player)return;
    if(this.app.isBlocked()){this.velocity={x:0,y:0};this.player.setTexture(`aaron-${this.direction}-0`);this.app.setPrompt('');this.marker.setVisible(false);return;}
    const held=this.app.input.held,k=this.keys;
    if(this.draggingLog)this.velocity={x:0,y:0};
    const keyX=this.draggingLog?0:Number(k.D.isDown||k.RIGHT.isDown||held.has('right'))-Number(k.A.isDown||k.LEFT.isDown||held.has('left'));
    const keyY=this.draggingLog?0:Number(k.S.isDown||k.DOWN.isDown||held.has('down'))-Number(k.W.isDown||k.UP.isDown||held.has('up'));
    let dx=this.draggingLog?0:(keyX||keyY?keyX:this.app.input.vector.x);
    let dy=this.draggingLog?0:(keyX||keyY?keyY:this.app.input.vector.y);
    const length=Math.hypot(dx,dy),dt=Math.min(delta,40)/1000;
    if(length>1){dx/=length;dy/=length;}
    const speed=170,acceleration=1050,deceleration=1350;
    const desiredX=dx*speed,desiredY=dy*speed;
    const approach=(value,target,amount)=>value<target?Math.min(value+amount,target):Math.max(value-amount,target);
    this.velocity.x=approach(this.velocity.x,desiredX,(length?acceleration:deceleration)*dt);
    this.velocity.y=approach(this.velocity.y,desiredY,(length?acceleration:deceleration)*dt);
    let moving=Math.hypot(this.velocity.x,this.velocity.y)>5;
    if(moving){
      const nx=this.player.x+this.velocity.x*dt,ny=this.player.y+this.velocity.y*dt;
      const movedX=this.canStand(nx,this.player.y),movedY=this.canStand(this.player.x,ny);
      if(movedX)this.player.x=nx;else this.velocity.x=0;
      if(movedY)this.player.y=ny;else this.velocity.y=0;
      moving=movedX||movedY;
      this.direction=this.facingDirection(this.velocity.x||dx,this.velocity.y||dy);
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
