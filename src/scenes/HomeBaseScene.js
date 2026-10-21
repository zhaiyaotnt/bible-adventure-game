import { ExploreScene } from './ExploreScene.js';
import { rect, label, book, sparkle, tree } from './art.js';
export class HomeBaseScene extends ExploreScene {
  constructor(){super('HomeBase');}
  create(){
    const app=this.game.registry.get('app');
    rect(this,0,0,960,640,0x203a37);
    // A small cabin, framed by a night garden.
    for(const x of [30,930])for(const y of [220,410,620])tree(this,x,y,1.15);
    rect(this,92,119,776,480,0x172d2b); rect(this,109,125,742,457,0x674e3e);
    rect(this,121,137,718,148,0x8a6e4e); rect(this,121,285,718,280,0xad875d);
    for(let y=292;y<565;y+=35){rect(this,121,y,718,2,0x98724f);for(let x=135+(y%3)*70;x<839;x+=150)rect(this,x,y,2,35,0x98724f);}
    rect(this,121,276,718,13,0x574737);rect(this,121,140,13,424,0x574737);rect(this,826,140,13,424,0x574737);
    // Window, desk, open Bible.
    rect(this,193,163,106,90,0x534c3b);rect(this,201,171,90,74,0x9db5a4);rect(this,242,171,7,75,0x6b654a);rect(this,201,205,90,6,0x6b654a);
    rect(this,177,308,156,64,0x674d38);rect(this,177,300,156,49,0xc39a64);rect(this,187,347,12,38,0x674d38);rect(this,311,347,12,38,0x674d38);book(this,254,323);
    label(this,254,395,'BIBLE','#f9e7ba',13);
    // Portal is a readable landmark with a slow, optional glow.
    rect(this,533,169,196,167,0x624b3d);rect(this,544,177,174,148,0x324d50);rect(this,555,189,152,126,0x537d79);
    rect(this,570,202,122,100,0x799b83);rect(this,589,218,84,72,0xa2b691);rect(this,616,233,32,45,0xe4d9a0);
    rect(this,522,325,218,15,0xb99664);label(this,630,359,'BIBLE TIMELINE','#f9e7ba',13);
    // Memento shelf, bed, and rug.
    rect(this,356,205,112,9,0x5c4937);rect(this,366,183,16,22,0xb89060);rect(this,386,179,14,26,0x6f8670);rect(this,405,184,14,21,0xd2b87c);
    rect(this,708,428,94,111,0x634f3c);rect(this,714,433,82,97,0xe4cc99);rect(this,720,463,70,63,0x69877d);rect(this,725,440,59,23,0xf0dfb6);
    rect(this,369,399,237,123,0x826147);rect(this,376,406,223,109,0xc9aa70);rect(this,384,414,207,93,0x928964);rect(this,392,422,191,77,0xa69c72);
    for(let x=404;x<586;x+=22)rect(this,x,450,10,10,0xc8b987);
    rect(this,155,454,30,43,0x9c7150);rect(this,149,440,42,29,0x507457);
    this.setup(app,{x:471,y:475});
    this.bounds={left:148,right:811,top:300,bottom:548};
    sparkle(this,575,244);sparkle(this,687,227);
    this.wall(160,291,184,83);this.wall(515,175,235,161);this.wall(697,415,113,128);this.wall(140,430,60,65);
    this.hotspot(630,365,'Open the Bible Timeline',()=>app.timeline(),100);
    this.hotspot(255,379,'Read the Bible',()=>app.dialogue('The Bible',['Every adventure begins with the Bible. The people and events in these stories help us discover God’s faithfulness.', 'Aaron is a fictional visitor. His adventures and conversations are imagined; Scripture references show you where to read the real story.'],{reference:'Your adventure guide',fiction:false}));
    this.hotspot(411,284,'Look at your memento shelf',()=>app.dialogue('Your story shelf',['One day, this shelf will hold reminders of the stories you have explored. Your first stop is Noah’s Ark.'],{fiction:false}),67);
    app.showHUD('Adventure Room','Walk to the glowing timeline to begin your journey.','HOME BASE');
  }
}
