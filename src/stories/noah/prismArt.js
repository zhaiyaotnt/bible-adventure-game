export function drawPrismBackdrop(scene){
  const g=scene.add.graphics().setDepth(-20);g.fillGradientStyle(0x345b57,0x345b57,0x789a86,0x789a86,1);g.fillRect(0,0,960,640);
  g.fillStyle(0xe7d49b,.22);g.fillCircle(760,120,125);g.fillStyle(0xc5d9c4,.18);g.fillEllipse(500,445,740,175);g.fillStyle(0x9ebcad,.2);g.fillEllipse(170,520,430,115);
  g.lineStyle(2,0xe8dfbd,.1);for(let i=0;i<10;i++)g.lineBetween(i*112,535+(i%3)*12,960,520+(i%3)*12);
  for(const [x,y,r] of [[70,270,110],[850,300,145],[210,90,75],[620,80,96]]){g.fillStyle(0x294942,.16);g.fillCircle(x,y,r);}
  return g;
}
export function drawPiece(scene,g,x,y,size,piece,orientation,selected=false){
  const s=size, cx=x+s/2,cy=y+s/2;
  if(piece.type==='mirror'){
    g.fillStyle(0x574b37,.9);g.fillRoundedRect(x+s*.2,y+s*.2,s*.6,s*.6,7);g.lineStyle(5,selected?0xffe9a5:0xc1b48f,.95);
    if(orientation==='/')g.lineBetween(x+s*.27,y+s*.73,x+s*.73,y+s*.27);else g.lineBetween(x+s*.27,y+s*.27,x+s*.73,y+s*.73);
    g.fillStyle(0xfff0c2,.9);g.fillCircle(cx,cy,3);
  }else if(piece.type==='prism'){
    g.fillStyle(0xb8dbce,.68);g.fillPoints([{x:cx,y:y+s*.15},{x:x+s*.82,y:y+s*.5},{x:cx,y:y+s*.85},{x:x+s*.18,y:y+s*.5}],true);g.lineStyle(2,0xf2e8c8,.8).strokePoints([{x:cx,y:y+s*.15},{x:x+s*.82,y:y+s*.5},{x:cx,y:y+s*.85},{x:x+s*.18,y:y+s*.5}],true);
  }else if(piece.type==='blocker'){
    g.fillStyle(0x775c3d,.96).fillRoundedRect(x+s*.2,y+s*.2,s*.6,s*.6,5);g.lineStyle(2,0xc6a66f,.8).strokeRoundedRect(x+s*.2,y+s*.2,s*.6,s*.6,5);g.lineBetween(x+s*.3,y+s*.3,x+s*.7,y+s*.7);
  }else if(piece.type==='shutter'){
    g.fillStyle(0x604a34,.9).fillRoundedRect(x+s*.15,y+s*.12,s*.7,s*.76,4);g.lineStyle(2,0xc3a66e,.7);for(let i=1;i<4;i++)g.lineBetween(x+s*.2,y+s*i*.2,x+s*.8,y+s*i*.2);
  }
}
export function drawReceiver(scene,g,x,y,size,receiver,active,charged=false){
  const colors={1:0xd86656,2:0x75bd78,4:0x648fd5,7:0xf4dfa3},glyph={1:'▲',2:'●',4:'■',7:'✦'};
  const cx=x+size/2,cy=y+size/2;g.fillStyle(active||charged?colors[receiver.color]:0x465e56,.95).fillCircle(cx,cy,size*.29);g.lineStyle(2,active||charged?0xfff1c3:0xc5c7a9,.9).strokeCircle(cx,cy,size*.32);
  const t=scene.add.text(cx,cy,charged?'✓':glyph[receiver.color],{fontFamily:'system-ui',fontSize:`${Math.max(11,size*.31)}px`,color:'#fff5d8'}).setOrigin(.5).setDepth(18);return t;
}
