import Phaser from 'phaser';
import './style.css';
import manifests from './data/stories/index.js';
import { StoryRegistry } from './core/StoryRegistry.js';
import { SaveManager, newSave } from './core/SaveManager.js';
import { InputManager } from './core/InputManager.js';
import { SceneRouter } from './core/SceneRouter.js';
import { HomeBaseScene } from './scenes/HomeBaseScene.js';
import { MeetNoahScene } from './stories/noah/MeetNoahScene.js';
import { ArkBlueprintScene } from './stories/noah/ArkBlueprintScene.js';
import { ArkInteriorScene } from './stories/noah/ArkInteriorScene.js';
import { FloodScene } from './stories/noah/FloodScene.js';
import { DoveJourneyScene } from './stories/noah/DoveJourneyScene.js';
const $=id=>document.getElementById(id);
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
class BootScene extends Phaser.Scene {
  constructor(){super('Boot');}
  create(){ $('loading').hidden=true; app.game=this.game; this.game.registry.set('app',app); app.router=new SceneRouter(app,{'noahs_ark/meet_noah':'MeetNoah','noahs_ark/ark_blueprint':'ArkBlueprint','noahs_ark/ark_interior':'ArkInterior','noahs_ark/rising_flood':'Flood','noahs_ark/doves_journey':'DoveJourney'}); this.scene.start('HomeBase'); app.menu(); }
}
const app={
  registry:new StoryRegistry(manifests), input:new InputManager(), save:newSave(), saved:null, modal:null, talking:false, game:null,
  toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>$('toast').hidden=true,6500);},
  persist(){this.saved=structuredClone(this.save);this.saves.write(this.save);},
  startScene(key,data){this.closeModal();this.endDialogue(); for(const scene of this.game.scene.getScenes(true)) this.game.scene.stop(scene.scene.key);this.game.scene.start(key,data);},
  isBlocked(){return !!this.modal||this.talking;},
  setPrompt(text){$('prompt').hidden=!text;$('prompt').textContent=text?`✦  ${text}  ·  E / tap Explore`:'';$('touch-interact').disabled=!text;},
  showHUD(location,objective,eyebrow){$('location').textContent=location;$('objective').textContent=objective;$('eyebrow').textContent=eyebrow;$('chapter').textContent=location;$('hud').hidden=false;$('home').hidden=this.save.current.location==='home';$('touch').hidden=false;},
  openModal(html,type){this.endDialogue();this.modal=type;this.input.reset();$('modal-root').innerHTML=`<div class="scrim"><section class="panel ${type}" role="dialog" aria-modal="true" aria-label="${escape(type)}" tabindex="-1">${html}</section></div>`;$('modal-root').querySelector('.panel').focus();},
  closeModal(){this.modal=null;$('modal-root').replaceChildren();$('game').focus({preventScroll:true});},
  dismiss(){if(this.talking)return this.advanceDialogue();if(this.modal==='menu')return;if(this.modal)this.closeModal();else this.menu();},
  menu(){
    this.openModal(`<div class="menu-art" aria-hidden="true"><span class="star star-a">✦</span><span class="star star-b">✦</span><div class="little-book">✝</div><div class="orbit"></div></div><p class="overline">A WORLD OF STORIES IS WAITING</p><h2>Aaron’s<br><em>Bible Adventure</em></h2><p class="intro">Travel through the stories. Meet the people.<br>Discover God’s plan.</p><div class="menu-buttons">${this.saved?'<button id="continue" class="primary">Continue adventure <span>→</span></button>':''}<button id="new" class="${this.saved?'secondary':'primary'}">New adventure <span>✦</span></button><button id="menu-settings" class="text-button">Settings & save backups</button></div><div class="release">M0 · PLAYABLE FIRST CHAPTER<br><span>Noah’s Ark · Genesis 6–9</span></div>`, 'menu');
    $('continue')?.addEventListener('click',()=>{this.save=structuredClone(this.saved);this.applySettings();this.router.resume();});
    $('new').onclick=()=>{if(this.saved)this.confirm('Start a new adventure?','This replaces your current progress. Export a backup in Settings if you want to keep it.',()=>this.newAdventure());else this.newAdventure();};
    $('menu-settings').onclick=()=>this.settings('menu');
  },
  newAdventure(){const settings=this.save.settings;this.save=newSave();this.save.settings=settings;this.router.home();this.toast('Welcome, Aaron! Walk to the glowing Bible Timeline.');},
  timeline(){
    this.openModal(`<div class="panel-head"><div><p class="overline">TRAVEL THROUGH THE STORIES</p><h2>The Bible Timeline</h2></div><button id="close-timeline" class="close" aria-label="Close timeline">×</button></div><p class="muted">Every story is part of a bigger story. Where will you begin?</p><div class="timeline-list">${this.registry.timeline().map((s,i)=>`<div class="timeline-row ${s.published?'available':''}"><div class="timeline-index">${String(i+1).padStart(2,'0')}</div><div><span class="overline">${escape(s.era)} · ${escape(s.bibleReferences.join(', '))}</span><h3>${escape(s.title)}</h3><p>${escape(s.subtitle)}</p>${s.published?`<small>${escape(s.releaseNote)}${this.save.stories[s.id]?.completedScenes.includes(s.entryScene)?' · Chapter explored ✓':''}</small>`:''}</div>${s.published?`<button class="primary story-enter" data-story="${escape(s.id)}">Explore <span>→</span></button>`:'<span class="coming">Coming soon</span>'}</div>`).join('')}</div><p class="footnote">Published stories can be explored independently. More adventures are on their way.</p>`,'timeline');
    $('close-timeline').onclick=()=>this.closeModal();for(const b of document.querySelectorAll('.story-enter'))b.onclick=()=>this.router.story(b.dataset.story);
  },
  dialogue(speaker,lines,{reference='',fiction=true,onComplete=null}={}){
    this.closeModal();this.talking=true;this.dialogueState={speaker,lines,index:0,reference,fiction,onComplete};this.renderDialogue();
  },
  renderDialogue(){const d=this.dialogueState;
    $('dialogue-root').innerHTML=`<section class="dialogue" role="dialog" aria-label="${escape(d.speaker)} dialogue"><div class="portrait ${d.speaker==='Noah'?'noah':''}" aria-hidden="true"><div class="head"></div><div class="robe"></div></div><div class="dialogue-copy"><div class="dialogue-label"><strong>${escape(d.speaker)}</strong><span>${d.fiction?'IMAGINED GAME DIALOGUE':'ADVENTURE GUIDE'}</span></div><p>${escape(d.lines[d.index])}</p><div class="dialogue-bottom"><button id="reference" class="reference">${escape(d.reference)} ↗</button><span>${d.index+1} / ${d.lines.length}</span><button id="next" class="primary">${d.index===d.lines.length-1?'Done':'Next'} →</button></div><button id="skip-dialogue" class="skip">Skip conversation</button></div></section>`;
    $('next').onclick=()=>this.advanceDialogue();$('skip-dialogue').onclick=()=>this.finishDialogue();$('reference').onclick=()=>{
      const old={...d};this.openModal(`<p class="overline">READ IN THE BIBLE</p><h2>${escape(d.reference)}</h2><p class="reading">${escape(this.registry.get(this.save.current.storyId)?.content.bible||'Read the passage in your own Bible. Aaron is a fictional observer; the conversations and activities in this game are imagined.')}</p><p class="footnote">Faithful summary, not a verbatim Bible translation. Game dialogue is dramatized.</p><button id="back-dialogue" class="primary">Back to conversation</button>`,'reading');
      $('back-dialogue').onclick=()=>{this.closeModal();this.talking=true;this.dialogueState=old;this.renderDialogue();};
    };$('next').focus({preventScroll:true});
  },
  advanceDialogue(){if(!this.talking)return;const d=this.dialogueState;if(d.index<d.lines.length-1){d.index++;this.renderDialogue();}else this.finishDialogue();},
  finishDialogue(){const callback=this.dialogueState?.onComplete;this.endDialogue();callback?.();},
  endDialogue(){this.talking=false;this.dialogueState=null;$('dialogue-root').replaceChildren();},
  confirm(title,text,yes){const back=this.modal;this.openModal(`<p class="overline">YOUR ADVENTURE</p><h2>${title}</h2><p class="reading">${text}</p><div class="button-row"><button id="cancel" class="secondary">Keep my progress</button><button id="confirm" class="primary">${title.startsWith('Reset')?'Reset progress':'Start new'}</button></div>`,'confirm');$('confirm').onclick=yes;$('cancel').onclick=()=>back==='menu'?this.menu():this.settings('menu');},
  settings(back=null){
    this.openModal(`<div class="panel-head"><div><p class="overline">MAKE YOURSELF AT HOME</p><h2>Settings</h2></div><button class="close" id="close-settings" aria-label="Close settings">×</button></div><label class="setting">Mute audio <input id="muted" type="checkbox" ${this.save.settings.muted?'checked':''}></label><p class="footnote">This first chapter is a quiet adventure; audio comes in a later milestone.</p><label class="setting">Reduce motion <input id="reduced" type="checkbox" ${this.save.settings.reducedMotion?'checked':''}></label><p class="save-note">Progress saves on this browser. Export a backup to keep it or move it to another device.</p><div class="button-row"><button id="export" class="secondary">Export save ↓</button><button id="import" class="secondary">Import save ↑</button></div><button id="reset" class="text-button danger">Reset progress…</button><p class="footnote">Hand-painted Noah’s meadow · Genesis 6 learning activity<br>No accounts. No tracking. Made for discovery.</p>`,'settings');
    $('close-settings').onclick=()=>back==='menu'?this.menu():this.closeModal();
    $('muted').onchange=e=>{this.save.settings.muted=e.target.checked;if(this.saved)this.persist();};
    $('reduced').onchange=e=>{this.save.settings.reducedMotion=e.target.checked;this.applySettings();if(this.saved)this.persist();const scene=this.game.scene.getScenes(true)[0];scene?.tweens.getAllTweens().forEach(t=>e.target.checked?t.pause():t.resume());};
    $('export').onclick=()=>{const blob=new Blob([JSON.stringify(this.save,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='aaron-adventure-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    $('import').onclick=()=>$('import-save').click();
    $('reset').onclick=()=>this.confirm('Reset all progress?','This clears your story progress on this browser. Export a backup first if you want to keep it.',()=>{this.save=newSave();this.persist();this.router.home();this.menu();});
  },
  applySettings(){document.documentElement.classList.toggle('reduced-motion',!!this.save.settings.reducedMotion);},
  help(){this.openModal(`<div class="panel-head"><div><p class="overline">A LITTLE HELP</p><h2>Follow your curiosity.</h2></div><button id="close-help" class="close" aria-label="Close help">×</button></div><p class="reading">On a phone, <b>tap the world</b> and Aaron walks there — or <b>press and drag</b> and he follows your finger in any direction. On a keyboard, use <b>WASD or the arrow keys</b>. Walk close to a person or object, then press <b>E, Space, Enter</b> or tap <b>Explore</b>. The view follows Aaron as he walks. <b>Pinch with two fingers</b> (or use the mouse wheel) to zoom in and out.</p><p class="reading">In your room, walk to the glowing portal. In Noah’s meadow, talk to Noah and inspect the ark at the top of the ramp.</p><p class="save-note">${escape($('objective').textContent)}</p><p class="footnote">Escape opens the menu or closes a panel. There are no time limits.</p>`,'help');$('close-help').onclick=()=>this.closeModal();}
};
// Accessing localStorage can itself throw in private/restricted contexts.
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();}};}
app.saves=new SaveManager(storage,message=>app.toast(message));app.saved=app.saves.load();if(app.saved)app.save=structuredClone(app.saved);app.applySettings();
$('brand').onclick=e=>{e.preventDefault();app.menu();};$('settings').onclick=()=>app.settings(app.modal==='menu'?'menu':null);$('help').onclick=()=>app.help();$('home').onclick=()=>app.router.home();$('touch-interact').onclick=()=>{if(!app.isBlocked())app.game.scene.getScenes(true)[0]?.interact?.();};
$('import-save').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('Save files must be smaller than 100 KB.');const save=app.saves.parse(await file.text());app.save=save;app.applySettings();app.persist();app.router.resume();app.toast('Your adventure has been restored.');}catch(error){app.toast(`Could not import: ${error.message}`);}e.target.value='';};
document.addEventListener('keydown',e=>{
  if(app.talking&&['Enter',' ','e','E'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();app.advanceDialogue();}
  else if(app.modal&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();app.dismiss();}
  else if(app.modal&&e.key==='Tab'){const elements=[...$('modal-root').querySelectorAll('button,input')].filter(x=>!x.disabled);const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
},true);
// The top HUD banner can be pushed out of the way: it slides up and a
// small tab remains to pull it back down.
(()=>{const play=document.getElementById('play'),hud=document.getElementById('hud');if(!play||!hud)return;const tab=document.createElement('button');tab.type='button';tab.id='hud-toggle';tab.textContent='⌃';tab.setAttribute('aria-label','Hide or show the top banner');tab.addEventListener('click',()=>{const hidden=hud.classList.toggle('hud-hidden');tab.textContent=hidden?'⌄':'⌃';});play.appendChild(tab);})();
window.addEventListener('blur',()=>{if(app.saved)app.persist();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&app.saved)app.persist();});setInterval(()=>{if(app.saved)app.persist();},30000);
// Phaser has no game-canvas resolution setting: the canvas backing is
// always exactly the game size. So supersample by making the game size
// itself a multiple of the 960x640 world; ENVELOP then scales that
// bigger canvas back down to the screen, and every camera zoom is
// multiplied by the same factor (see renderScale in scenes/art.js),
// leaving framing unchanged. Capped at 2: at 3 (2880x1920 WebGL +
// antialiasing + hi-res text textures) iOS Safari killed the page
// process for memory ("A problem repeatedly occurred", 2026-10-21).
const RENDER_SCALE=Math.min(window.devicePixelRatio||1,2);
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960*RENDER_SCALE,height:640*RENDER_SCALE,backgroundColor:'#203a37',pixelArt:false,roundPixels:false,scale:{mode:Phaser.Scale.ENVELOP,autoCenter:Phaser.Scale.CENTER_BOTH},input:{keyboard:{capture:[32,37,38,39,40]}},scene:[BootScene,HomeBaseScene,MeetNoahScene,ArkBlueprintScene,ArkInteriorScene,FloodScene,DoveJourneyScene],render:{antialias:true}});
