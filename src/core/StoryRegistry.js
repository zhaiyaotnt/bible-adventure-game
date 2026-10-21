export class StoryRegistry {
  constructor(manifests) {
    this.stories = new Map();
    for (const story of manifests) {
      if (!story.id || !story.title || !Number.isFinite(story.timelineOrder) || typeof story.published !== 'boolean' || !Array.isArray(story.bibleReferences)) throw new Error('Invalid story manifest');
      if (this.stories.has(story.id)) throw new Error(`Duplicate story: ${story.id}`);
      if (story.published && (!Array.isArray(story.scenes) || !story.scenes.includes(story.entryScene))) throw new Error(`Invalid entry scene: ${story.id}`);
      this.stories.set(story.id, story);
    }
  }
  get(id) { return this.stories.get(id); }
  timeline() { return [...this.stories.values()].sort((a,b) => a.timelineOrder - b.timelineOrder); }
}
