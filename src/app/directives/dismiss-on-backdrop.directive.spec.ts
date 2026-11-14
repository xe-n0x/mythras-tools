import { ElementRef } from '@angular/core';
import { DismissOnBackdropDirective } from './dismiss-on-backdrop.directive';

describe('DismissOnBackdropDirective', () => {
  let dialog: HTMLDialogElement;
  let directive: DismissOnBackdropDirective;

  beforeEach(() => {
    dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    spyOn(dialog, 'getBoundingClientRect').and.returnValue(new DOMRect(100, 100, 200, 200));
    spyOn(dialog, 'close');
    directive = new DismissOnBackdropDirective(new ElementRef(dialog));
    dialog.addEventListener('click', event => directive.onClick(event));
  });

  it('closes when the backdrop is clicked', () => {
    dialog.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 50 }));
    expect(dialog.close).toHaveBeenCalled();
  });

  it('does not close when the dialog padding is clicked', () => {
    dialog.dispatchEvent(new MouseEvent('click', { clientX: 150, clientY: 150 }));
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('does not close when an element inside the dialog is clicked', () => {
    const button = document.createElement('button');
    dialog.appendChild(button);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 50 }));
    expect(dialog.close).not.toHaveBeenCalled();
  });
});
