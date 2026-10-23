// Arrow navigation for the horizontal tablists and radio groups used by Dialogue.
export function bindChoiceKeys(group) {
  group.addEventListener('keydown', e => {
    const buttons = [...group.querySelectorAll('button[role="tab"], button[role="radio"]')];
    const i = buttons.indexOf(e.target);
    if (i < 0) return;
    const radio = e.target.getAttribute('role') === 'radio';
    let next;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    else if (e.key === 'ArrowRight' || (radio && e.key === 'ArrowDown')) next = (i + 1) % buttons.length;
    else if (e.key === 'ArrowLeft' || (radio && e.key === 'ArrowUp')) next = (i + buttons.length - 1) % buttons.length;
    else return;
    e.preventDefault(); buttons[next].focus(); buttons[next].click();
  });
}
