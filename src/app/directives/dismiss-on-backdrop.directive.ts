import { Directive, ElementRef, HostListener } from '@angular/core';

/** Close a native modal dialog only when its backdrop is clicked or tapped. */
@Directive({
  selector: 'dialog[appDismissOnBackdrop]',
  standalone: true,
})
export class DismissOnBackdropDirective {
  constructor(private readonly host: ElementRef<HTMLDialogElement>) {}

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const dialog = this.host.nativeElement;
    // Backdrop interactions are dispatched to <dialog> itself. A click on the
    // dialog's padding is not a backdrop click, so also check its geometry.
    if (!dialog.open || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) {
      dialog.close(); // Triggers existing (close) cleanup, just like the button/Escape.
    }
  }
}
