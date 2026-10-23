import { CELLS, DECK_NAMES, ROOMS, createMysteryRun, evaluate, finalSatisfied, loadMysteryState, saveMysteryState } from './mystery.js';

// The interactive blueprint for the Ark Mystery. DOM-based (like the
// game's other panels) so drag-and-drop, pencil marks and the clue list
// work the same with mouse and touch. Feedback is deliberately limited:
// Inspect reports how many clue conditions are satisfied (never which
// rooms are wrong), and stops counting after three inspections.
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const roomLabel = id => ROOMS.find(r => r.id === id)?.label ?? id;
const roomShort = id => ROOMS.find(r => r.id === id)?.short ?? id;

export function openArkBlueprint(app, hooks = {}) {
  const storyId = app.save.current.storyId;
  const flags = app.save.stories[storyId].questFlags;
  const state = loadMysteryState();
  const run = hooks.run ?? createMysteryRun(state.seed);
  const { clues: CLUES, hints: HINTS, condition: FINAL_CONDITION } = run;
  let mode = 'place';
  let selected = null; // room id chosen in the palette
  const save = () => saveMysteryState(state);
  const foundClues = () => CLUES.filter(c => flags[`mx_clue_${c.id}`]);

  app.openModal(`
    <div class="panel-head"><div><p class="overline">NOAH'S UNFINISHED PLAN · GENESIS 6:16</p><h2>The Ark Blueprint</h2></div><button id="bp-close" class="close" aria-label="Close blueprint">×</button></div>
    <p class="muted">Three decks, nine rooms. Drag a room into place — or tap a room, then tap a square. Tapping a filled square picks its room back up; dropping a room onto a filled square swaps them. Noah will not mark your work: reason it out from the clues.</p>
    <div id="bp-final"></div>
    <div class="bp-layout">
      <div>
        <div id="bp-board" class="bp-board"></div>
        <div class="bp-row bp-actions">
          <button id="bp-inspect" class="primary">Inspect blueprint</button>
          <button id="bp-hint" class="secondary">Hint</button>
          <button id="bp-mode" class="secondary">✏️ Pencil marks: off</button>
          <button id="bp-reset" class="secondary">Reset plan</button>
        </div>
        <p id="bp-message" class="bp-message" role="status"></p>
        <p id="bp-hintbox" class="bp-hintbox" hidden></p>
      </div>
      <div class="bp-side">
        <p class="overline">ROOMS</p>
        <div id="bp-palette" class="bp-palette"></div>
        <p class="overline">CLUES · <span id="bp-cluecount"></span></p>
        <div id="bp-clues" class="bp-clues"></div>
        <p class="overline">YOUR NOTES</p>
        <textarea id="bp-notes" class="bp-notes" rows="3" placeholder="Jot your deductions here…">${esc(state.notes)}</textarea>
      </div>
    </div>`, 'blueprint');

  const $ = id => document.getElementById(id);
  $('bp-close').onclick = () => app.closeModal();
  $('bp-notes').addEventListener('input', e => { state.notes = e.target.value; save(); });

  function render() {
    // Board
    $('bp-board').innerHTML = [0, 1, 2].map(r => `
      <div class="bp-deck">${esc(DECK_NAMES[r])}</div>
      ${[0, 1, 2].map(c => { const cell = CELLS[r * 3 + c], room = state.grid[cell], marks = (state.marks[cell] ?? []);
        return `<button type="button" class="bp-cell ${room ? 'filled' : ''}" data-cell="${cell}"><span class="bp-cellid">${cell}</span>${room ? `<span class="bp-room">${esc(roomShort(room))}</span>` : ''}${marks.length ? `<span class="bp-marks">${marks.map(m => esc(roomShort(m))).join(' · ')}</span>` : ''}</button>`; }).join('')}`).join('');
    // Palette: in place mode, unplaced rooms; in pencil mode, all rooms.
    const placed = new Set(Object.values(state.grid));
    const paletteRooms = mode === 'pencil' ? ROOMS : ROOMS.filter(r => !placed.has(r.id));
    $('bp-palette').innerHTML = paletteRooms.map(r => `<button type="button" class="bp-chip ${selected === r.id ? 'selected' : ''}" data-room="${r.id}">${esc(r.label)}</button>`).join('') || '<p class="muted">Every room is placed.</p>';
    $('bp-mode').textContent = mode === 'pencil' ? '✏️ Pencil marks: on' : '✏️ Pencil marks: off';
    $('bp-cluecount').textContent = `${foundClues().length} of ${CLUES.length} found`;
    $('bp-clues').innerHTML = CLUES.map(c => flags[`mx_clue_${c.id}`]
      ? `<div class="bp-clue"><strong>${esc(c.source)}</strong><span>${esc(c.text)}</span></div>`
      : `<div class="bp-clue missing"><strong>Undiscovered clue</strong><span>Still hidden somewhere in the ark…</span></div>`).join('')
      + ((flags.mx_torn_a ^ flags.mx_torn_b) ? '<div class="bp-clue missing"><strong>Torn diagram</strong><span>You hold one half. The other half is still missing.</span></div>' : '');
    // Final-check banner
    const fin = $('bp-final');
    if (flags.mx_solved && flags.mx_final_given && !flags.mx_complete) {
      fin.innerHTML = `<div class="bp-finalbox"><strong>Noah's final check</strong><p>${esc(FINAL_CONDITION.text)}</p><p class="muted">Check your plan against it, then submit.</p><button id="bp-submit" class="primary">Submit final blueprint</button></div>`;
      $('bp-submit').onclick = submitFinal;
    } else if (flags.mx_solved && !flags.mx_complete) {
      fin.innerHTML = `<div class="bp-finalbox"><strong>Every clue condition is satisfied.</strong><p>Take the plan to Noah on the middle deck — he has one final check before the rooms are built.</p></div>`;
    } else fin.innerHTML = '';
    wireBoard();
  }

  function place(room, cell) {
    const existingCell = Object.keys(state.grid).find(k => state.grid[k] === room);
    if (existingCell) delete state.grid[existingCell];
    const occupant = state.grid[cell];
    state.grid[cell] = room;
    if (occupant && existingCell) state.grid[existingCell] = occupant; // swap
    selected = null; save(); render();
  }
  function unplace(cell) { const room = state.grid[cell]; delete state.grid[cell]; selected = room; save(); render(); }
  function toggleMark(room, cell) {
    const marks = state.marks[cell] ?? (state.marks[cell] = []);
    const i = marks.indexOf(room);
    if (i >= 0) marks.splice(i, 1); else marks.push(room);
    save(); render();
  }

  function wireBoard() {
    for (const chip of document.querySelectorAll('.bp-chip')) {
      chip.onclick = () => { selected = selected === chip.dataset.room ? null : chip.dataset.room; render(); };
      chip.onpointerdown = e => startDrag(e, chip.dataset.room, null);
    }
    for (const cellEl of document.querySelectorAll('.bp-cell')) {
      const cell = cellEl.dataset.cell;
      cellEl.onclick = () => {
        if (mode === 'pencil') { if (selected) toggleMark(selected, cell); else flash('Pick a room first, then tap squares to pencil it in as a maybe.'); return; }
        if (selected) place(selected, cell);
        else if (state.grid[cell]) unplace(cell);
      };
      cellEl.onpointerdown = e => { const room = state.grid[cell]; if (room && mode === 'place') startDrag(e, room, cell); };
    }
  }

  // Pointer drag: a ghost label follows the pointer; dropping on a cell
  // places/swaps, dropping anywhere else cancels (a plain tap still
  // selects via the click handlers above).
  function startDrag(e, room, fromCell) {
    if (e.button !== undefined && e.button !== 0) return;
    const ghost = document.createElement('div');
    ghost.className = 'bp-ghost'; ghost.textContent = roomLabel(room);
    document.body.appendChild(ghost);
    const move = ev => { ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`; };
    move(e);
    let dragged = false;
    const onMove = ev => { dragged = true; move(ev); };
    const onUp = ev => {
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); ghost.remove();
      if (!dragged) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('[data-cell]');
      if (el) place(room, el.dataset.cell);
      else if (fromCell) unplace(fromCell);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  function flash(message) { $('bp-message').textContent = message; }
  function inspect() {
    const result = evaluate(state.grid, CLUES);
    state.checks++; save();
    if (result.complete) {
      if (!flags.mx_solved) { hooks.onAllSatisfied?.(); flash('Noah traces the whole plan with one finger… then smiles. “Every condition holds. Every single one.”'); }
      else flash('The plan still satisfies every condition.');
      render(); return;
    }
    const filled = Object.keys(state.grid).length;
    if (filled < 9) flash(`The plan is not finished — ${9 - filled} square${9 - filled === 1 ? ' is' : 's are'} still empty.`);
    else if (state.checks <= 3) flash(`Noah studies the plan. “${result.count} of ${result.total} conditions satisfied,” he says. He will not say which ones fail.`);
    else flash('Noah studies the plan for a long moment, then shakes his head. “Keep reasoning — I won’t keep counting for you.”');
  }
  function submitFinal() {
    const result = evaluate(state.grid, CLUES);
    if (!result.complete) { flash('The plan no longer satisfies every clue. Check it again before submitting.'); return; }
    if (!finalSatisfied(state.grid, FINAL_CONDITION)) { flash('Noah frowns at the final check. “This arrangement misses the last condition. Look again.”'); return; }
    hooks.onFinalSubmitted?.();
  }
  $('bp-inspect').onclick = inspect;
  $('bp-reset').onclick = () => { state.grid = {}; state.marks = {}; selected = null; save(); render(); flash('The plan is wiped clean. The clues remain in your notes.'); };
  $('bp-mode').onclick = () => { mode = mode === 'place' ? 'pencil' : 'place'; selected = null; render(); };
  $('bp-hint').onclick = () => {
    if (state.hints >= HINTS.length) { flash('No more hints — the rest is yours to reason out.'); return; }
    const box = $('bp-hintbox'); box.hidden = false;
    box.textContent = `Hint ${state.hints + 1}: ${HINTS[state.hints]}`;
    state.hints++; save();
    if (state.hints >= HINTS.length) $('bp-hint').disabled = true;
  };
  if (state.hints >= HINTS.length) $('bp-hint').disabled = true;
  else if (state.hints > 0) { const box = $('bp-hintbox'); box.hidden = false; box.textContent = `Hint ${state.hints}: ${HINTS[state.hints - 1]}`; }
  render();
  if (flags.mx_solved && !flags.mx_complete && !flags.mx_final_given) flash('Every clue condition is satisfied. Take the plan to Noah for his final check.');
}
