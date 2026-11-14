import { Directive, ElementRef, HostListener } from '@angular/core';

/**
 * Dismisses a native modal dialog when its backdrop is tapped or clicked.
 *
 * Native dialog backdrop events are not retargeted consistently by mobile
 * browsers. Listen at document level and compare pointer coordinates with the
 * visible dialog rectangle instead of relying on event.target === dialog.
 * Existing (close) handlers remain responsible for component cleanup.
 */
@Directive({
  selector: 'dialog[appDismissOnBackdrop]',
  standalone: true,
})
export class DismissOnBackdropDirective {
  constructor(private readonly host: ElementRef<HTMLDialogElement>) {}

  @HostListener('document:pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.closeIfOutside(event.clientX, event.clientY);
  }

  // Touch fallback for older iOS browsers and embedded mobile webviews.
  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0] || event.touches[0];
    if (touch) this.closeIfOutside(touch.clientX, touch.clientY);
  }

  // Click fallback. detail === 0 identifies keyboard/screen-reader activation,
  // whose synthetic (0, 0) coordinates must not be mistaken for a backdrop tap.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (event.detail !== 0) this.closeIfOutside(event.clientX, event.clientY);
  }

  // Keep a host listener as an additional fallback for engines that dispatch
  // backdrop clicks to the dialog but do not bubble them to document.
  @HostListener('click', ['$event'])
  onDialogClick(event: MouseEvent): void {
    if (event.detail !== 0) this.closeIfOutside(event.clientX, event.clientY);
  }

  private closeIfOutside(clientX: number, clientY: number): void {
    const dialog = this.host.nativeElement;
    if (!dialog.open) return;

    const rect = dialog.getBoundingClientRect();
    const outside = clientX < rect.left || clientX > rect.right ||
      clientY < rect.top || clientY > rect.bottom;

    if (outside) dialog.close();
  }
}
