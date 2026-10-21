// Shared painterly character textures and reusable scene drawing helpers.
import Phaser from 'phaser';
export const C = { ink:0x263c39, grass:0x81a867, darkGrass:0x658c56, leaf:0x3c7355, lightLeaf:0x579364, wood:0x976747, lightWood:0xb68a59, path:0xd6c18a };
export function rect(scene,x,y,w,h,color,alpha=1) { return scene.add.rectangle(x,y,w,h,color,alpha).setOrigin(0); }
export function label(scene,x,y,text,color='#fff1cf',size=14) { return scene.add.text(x,y,text,{fontFamily:'monospace',fontSize:size,color,stroke:'#263c39',strokeThickness:3}).setOrigin(.5); }
export function tree(scene,x,y,size=1) {
  const g=scene.add.graphics().setPosition(x,y).setScale(size);
  g.fillStyle(0x304c3d,.18).fillEllipse(0,11,76,24);
  g.fillStyle(0x775940).fillRect(-8,-30,16,42); g.fillStyle(0x9a7450).fillRect(-4,-28,5,36);
  g.fillStyle(0x305b48).fillRect(-35,-66,70,40).fillRect(-25,-87,50,50);
  g.fillStyle(C.leaf).fillRect(-35,-72,60,34).fillRect(-20,-92,42,35);
  g.fillStyle(C.lightLeaf).fillRect(-26,-72,20,9).fillRect(-12,-88,22,8); return g;
}
export function character(scene,key,robe,hair,beard=false) {
  if (scene.textures.exists(key+'-down-0')) return;
  for (const dir of ['down','down-left','left','up-left','up','up-right','right','down-right']) for(let frame=0;frame<4;frame++) {
    const g=scene.make.graphics({x:0,y:0,add:false});
    const step=frame===2?-4:frame===3?4:0,breathe=frame===1?-1:0;
    const skin=0xd9a77d,skinLight=0xe8bd95,shoe=0x4a4037;
    // Soft ground shadow, rounded clothing and distinct proportions read clearly
    // at both the small meadow scale and the larger dialogue portrait scale.
    g.fillStyle(0x253e38,.28).fillEllipse(40,84,48,15);
    g.fillStyle(shoe).fillEllipse(30+step,79,15,9).fillEllipse(49-step,79,15,9);
    g.fillStyle(0x665544).fillRoundedRect(27+step,60,12,21,6).fillRoundedRect(43-step,60,12,21,6);
    g.fillStyle(robe).fillPoints([{x:24,y:43+breathe},{x:56,y:43+breathe},{x:64,y:73},{x:60,y:78},{x:20,y:78},{x:16,y:73}],true);
    g.fillStyle(Phaser.Display.Color.ValueToColor(robe).lighten(18).color).fillRoundedRect(23,46+breathe,12,26,6);
    g.fillStyle(Phaser.Display.Color.ValueToColor(robe).darken(17).color).fillRoundedRect(46,47+breathe,10,25,5);
    g.lineStyle(2,0xf0d4a1,.78).lineBetween(40,47,40,73).lineBetween(25,71,55,71);
    g.fillStyle(0x74513b).fillRoundedRect(28,69,24,5,2);g.fillStyle(0xd3b277).fillCircle(40,71,2.3);
    g.fillStyle(skin).fillRoundedRect(17,49+breathe,10,24,5).fillRoundedRect(53,49+breathe,10,24,5);
    g.fillStyle(skinLight).fillEllipse(21,69,8,6).fillEllipse(59,69,8,6);
    // Ears and face, with a different hair silhouette for Aaron and Noah.
    g.fillStyle(skin).fillEllipse(40,29+breathe,34,38);
    g.fillStyle(skinLight,.55).fillEllipse(34,27+breathe,8,13);
    g.fillStyle(hair).fillEllipse(40,16+breathe,38,22).fillEllipse(24,21+breathe,12,19).fillEllipse(56,21+breathe,12,19);
    for(const [x,y,r] of [[27,13,6],[35,10,7],[44,10,7],[53,14,6]])g.fillCircle(x,y+breathe,r,hair);
    if(dir.startsWith('up')){
      g.fillStyle(hair).fillEllipse(40,29+breathe,35,22);
      if(beard)g.fillStyle(hair).fillRoundedRect(28,22+breathe,24,19,9);
    }else{
      const eyeX=dir.includes('left')?33:dir.includes('right')?47:null;
      g.fillStyle(0xf8e9cd);
      if(dir==='down'){g.fillEllipse(33,29+breathe,8,5);g.fillEllipse(47,29+breathe,8,5);}
      else g.fillEllipse(eyeX,29+breathe,7,5);
      g.fillStyle(0x303b35);
      if(dir==='down'){g.fillCircle(34,29+breathe,2.1);g.fillCircle(46,29+breathe,2.1);}
      else g.fillCircle(eyeX,29+breathe,2.1);
      g.fillStyle(0xb8745a).fillEllipse(40,36+breathe,5,3);
      if(beard){
        g.fillStyle(hair).fillRoundedRect(25,37+breathe,30,15,7).fillEllipse(40,50+breathe,12,10);
        g.fillStyle(Phaser.Display.Color.ValueToColor(hair).lighten(12).color).fillEllipse(34,40+breathe,8,5).fillEllipse(46,40+breathe,8,5);
      }else{
        g.lineStyle(2,0x9b604a).lineBetween(35,43+breathe,45,43+breathe);
      }
    }
    g.generateTexture(`${key}-${dir}-${frame}`,80,96); g.destroy();
  }
}
export function book(scene,x,y) { rect(scene,x-20,y-12,40,27,0x374e50); rect(scene,x-17,y-15,33,24,0xf0d9a4); rect(scene,x-1,y-13,2,23,0xa2875e); }
export function sparkle(scene,x,y) { const t=label(scene,x,y,'✦','#ffeab0',22); if(!scene.app.save.settings.reducedMotion) scene.tweens.add({targets:t,y:y-6,alpha:.4,duration:1200,yoyo:true,repeat:-1}); return t; }
export function outdoor(scene) {
  rect(scene,0,0,960,640,C.grass);
  // Stable, repeatable ground detail keeps the map editable and collision independent of art.
  for(let i=0;i<220;i++){const x=(i*137+23)%960,y=(i*83+29)%640; rect(scene,x,y,3+(i%3),3,i%4===0?0xb9c782:0x779d60);}
  rect(scene,0,415,960,80,C.path); rect(scene,410,330,85,220,C.path);
  for(let i=0;i<7;i++) tree(scene,30+i*150,155,1.15);
  for(let i=0;i<7;i++) tree(scene,20+i*151,650,1.1);
  rect(scene,57,230,91,174,0x587f76); rect(scene,66,231,69,168,0x7ba9a0);
  for(let i=0;i<7;i++) rect(scene,75+(i%2)*15,245+i*22,36,3,0xb4d2b2);
  for(const [x,y] of [[185,355],[200,375],[695,510],[722,516],[835,377],[300,526]]) { rect(scene,x,y,5,10,0x4e7950); rect(scene,x-3,y-2,10,5,0xeed193); }
  tree(scene,208,315); tree(scene,856,338); tree(scene,310,601,.8);
}
export function ark(scene) {
  const g=scene.add.graphics();
  g.fillStyle(0x304c3d,.2).fillEllipse(582,338,340,50);
  g.fillStyle(0x624c3c).fillPoints([{x:395,y:236},{x:780,y:236},{x:744,y:339},{x:443,y:339}],true);
  g.fillStyle(0x9f7049).fillRect(430,192,305,104);
  g.fillStyle(0xba8b57).fillPoints([{x:411,y:192},{x:470,y:151},{x:697,y:151},{x:752,y:192}],true);
  for(let y=204;y<335;y+=16){g.lineStyle(2,0x70513b).lineBetween(439,y,730,y);}
  g.fillStyle(0x4d5141).fillRect(555,255,40,77);
  for(let x=459;x<720;x+=50){g.fillStyle(0x4c5546).fillRect(x,210,21,19); g.fillStyle(0xc99f68).fillRect(x+8,210,3,20);}
  g.fillStyle(0x9a7551).fillPoints([{x:555,y:329},{x:595,y:329},{x:615,y:383},{x:535,y:383}],true);
  g.lineStyle(3,0x68523e); for(let y=340;y<380;y+=10)g.lineBetween(550-(y-340)*.3,y,599+(y-340)*.3,y);
}
