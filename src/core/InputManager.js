// Movement input shared by the explore scenes.
//
// There is deliberately no on-screen joystick: on touch devices Aaron is
// steered by tapping / dragging directly on the game world (handled by
// ExploreScene through Phaser's pointer events, the same direct-pointer
// style as the keyboard path below). This manager only tracks the
// button-held set kept for layout compatibility, and clears state when the
// page loses focus so Aaron never keeps walking on his own.
export class InputManager {
  constructor() {
    this.held = new Set();
    this.vector = { x: 0, y: 0, magnitude: 0 };

    for (const button of document.querySelectorAll('[data-direction]')) {
      const release = () => this.held.delete(button.dataset.direction);
      button.addEventListener('pointerdown', e => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.held.add(button.dataset.direction);
      });
      for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, release);
    }

    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });
  }

  reset() {
    this.held.clear();
    this.vector = { x: 0, y: 0, magnitude: 0 };
  }
}
