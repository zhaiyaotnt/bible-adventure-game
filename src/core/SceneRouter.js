export class SceneRouter {
  constructor(app, routes) { this.app = app; this.routes = routes; }
  home() { this.app.save.current = { location:'home', spawnId:'start' }; this.app.persist(); this.app.startScene('HomeBase'); }
  story(id, sceneId, restore = {}) {
    const story = this.app.registry.get(id);
    if (!story?.published) return this.home();
    const target = story.scenes.includes(sceneId) ? sceneId : story.entryScene;
    const route = this.routes[`${id}/${target}`];
    if (!route) return this.home();
    this.app.save.current = { location:'story', storyId:id, sceneId:target, spawnId:'start', ...(Number.isFinite(restore.x)&&Number.isFinite(restore.y)?{x:restore.x,y:restore.y}:{}) };
    this.app.save.stories[id] ??= { status:'in_progress', completedScenes:[], questFlags:{}, inventory:{} };
    this.app.save.stories[id].inventory ??= {};
    this.app.persist(); this.app.startScene(route, { story, spawn:{x:restore.x,y:restore.y} });
  }
  resume() { const current = this.app.save.current; current.location === 'story' ? this.story(current.storyId, current.sceneId, current) : this.home(); }
}
