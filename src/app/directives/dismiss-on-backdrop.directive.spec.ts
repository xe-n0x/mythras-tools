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
  });

  it('closes on a pointer press outside the dialog rectangle', () => {
    directive.onPointerDown({ clientX: 50, clientY: 50 } as PointerEvent);
    expect(dialog.close).toHaveBeenCalled();
  });

  it('closes on a touch outside the dialog rectangle', () => {
    const touch = { clientX: 350, clientY: 150 } as Touch;
    directive.onTouchStart({ changedTouches: [touch], touches: [touch] } as unknown as TouchEvent);
    expect(dialog.close).toHaveBeenCalled();
  });

  it('does not close when the pointer is inside the dialog rectangle', () => {
    directive.onPointerDown({ clientX: 150, clientY: 150 } as PointerEvent);
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('supports a real click outside the dialog as a fallback', () => {
    directive.onDocumentClick({ clientX: 350, clientY: 150, detail: 1 } as MouseEvent);
    expect(dialog.close).toHaveBeenCalled();
  });

  it('does not mistake keyboard activation for a backdrop click', () => {
    directive.onDocumentClick({ clientX: 0, clientY: 0, detail: 0 } as MouseEvent);
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('does nothing when the dialog is already closed', () => {
    dialog.removeAttribute('open');
    directive.onPointerDown({ clientX: 50, clientY: 50 } as PointerEvent);
    expect(dialog.close).not.toHaveBeenCalled();
  });
});
