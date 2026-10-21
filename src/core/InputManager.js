export class InputManager {
  constructor() {
    this.held = new Set();
    this.vector = { x: 0, y: 0, magnitude: 0 };
    this.activePointer = null;
    this.stick = document.getElementById('movement-stick');
    this.knob = document.getElementById('movement-knob');

    // Keep compatibility with an alternate button-based control layout. The
    // primary phone control is the continuous analog thumbstick below.
    for (const button of document.querySelectorAll('[data-direction]')) {
      const release = () => this.held.delete(button.dataset.direction);
      button.addEventListener('pointerdown', e => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.held.add(button.dataset.direction);
      });
      for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, release);
    }

    if (this.stick) {
      this.stick.addEventListener('pointerdown', event => this.startStick(event));
      this.stick.addEventListener('pointermove', event => this.moveStick(event));
      for (const type of ['pointerup','pointercancel','lostpointercapture']) {
        this.stick.addEventListener(type, event => this.endStick(event));
      }
    }

    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });
  }

  startStick(event) {
    event.preventDefault();
    if (this.activePointer !== null) return;
    this.activePointer = event.pointerId;
    this.stick.setPointerCapture(event.pointerId);
    this.stick.classList.add('active');
    this.updateStick(event);
  }

  moveStick(event) {
    if (event.pointerId !== this.activePointer) return;
    event.preventDefault();
    this.updateStick(event);
  }

  updateStick(event) {
    const bounds = this.stick.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const maxTravel = bounds.width * 0.31;
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const distance = Math.hypot(rawX, rawY);
    const clamped = Math.min(distance, maxTravel);
    const unitX = distance ? rawX / distance : 0;
    const unitY = distance ? rawY / distance : 0;
    const deadzone = 0.12;
    const normalized = clamped / maxTravel;
    const magnitude = normalized <= deadzone ? 0 : (normalized - deadzone) / (1 - deadzone);

    this.vector = { x: unitX * magnitude, y: unitY * magnitude, magnitude };
    if (this.knob) this.knob.style.transform = `translate(${unitX * clamped}px, ${unitY * clamped}px)`;
  }

  endStick(event) {
    if (event.pointerId !== this.activePointer) return;
    this.resetStick();
  }

  resetStick() {
    this.activePointer = null;
    this.vector = { x: 0, y: 0, magnitude: 0 };
    this.stick?.classList.remove('active');
    if (this.knob) this.knob.style.transform = 'translate(0, 0)';
  }

  reset() {
    this.held.clear();
    this.resetStick();
  }
}
