export const SAVE_KEY = 'aaron-bible-adventure:save:v1';
export function newSave() {
  return { schemaVersion: 1, player: { name: 'Aaron' }, current: { location: 'home', spawnId: 'start' }, stories: {}, discoveredCharacters: [], badges: [], mementos: [], settings: { muted: false, reducedMotion: false } };
}
export function validateSave(save) {
  if (!save || save.schemaVersion !== 1 || save.player?.name !== 'Aaron' || !['home','story'].includes(save.current?.location) || !save.stories || typeof save.stories !== 'object' || Array.isArray(save.stories)) throw new Error('This is not a supported adventure save.');
  if (save.current.location === 'story' && (typeof save.current.storyId !== 'string' || typeof save.current.sceneId !== 'string')) throw new Error('The saved location is incomplete.');
  if ((save.current.x !== undefined || save.current.y !== undefined) && (!Number.isFinite(save.current.x) || !Number.isFinite(save.current.y))) throw new Error('Invalid saved player position.');
  for (const key of ['discoveredCharacters','badges','mementos']) if (!Array.isArray(save[key]) || !save[key].every(x => typeof x === 'string')) throw new Error('Invalid collection in save.');
  if (!save.settings || typeof save.settings.muted !== 'boolean' || (save.settings.reducedMotion !== undefined && typeof save.settings.reducedMotion !== 'boolean')) throw new Error('Invalid settings in save.');
  for (const story of Object.values(save.stories)) {
    if (!story || !['in_progress','completed'].includes(story.status) || !Array.isArray(story.completedScenes) || !story.completedScenes.every(x=>typeof x==='string') || !story.questFlags || typeof story.questFlags !== 'object' || Array.isArray(story.questFlags) || !Object.values(story.questFlags).every(x=>typeof x==='boolean')) throw new Error('Invalid story progress.');
    if (story.inventory !== undefined && (!story.inventory || typeof story.inventory !== 'object' || Array.isArray(story.inventory) || !Object.values(story.inventory).every(x=>Number.isSafeInteger(x)&&x>=0))) throw new Error('Invalid story inventory.');
  }
  return save;
}
export class SaveManager {
  constructor(storage, onWarning = () => {}) { this.storage = storage; this.onWarning = onWarning; }
  load() { try { const raw = this.storage.getItem(SAVE_KEY); return raw ? this.parse(raw) : null; } catch { this.onWarning('Your save could not be read. You can still start a new adventure.'); return null; } }
  parse(raw) { if (typeof raw !== 'string' || raw.length > 100000) throw new Error('Save files must be smaller than 100 KB.'); return validateSave(JSON.parse(raw)); }
  write(save) { try { this.storage.setItem(SAVE_KEY, JSON.stringify(validateSave(save))); return true; } catch { this.onWarning('Your browser could not save progress. Export a backup from Settings.'); return false; } }
}
