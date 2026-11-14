import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuccessLevelsComponent } from './success-levels.component';

describe('SuccessLevelsComponent', () => {
  let component: SuccessLevelsComponent;
  let fixture: ComponentFixture<SuccessLevelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SuccessLevelsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuccessLevelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('rounds the existing combat table augmentation and derived thresholds (Core Rules pp. 37–38, 50; Tennla)', () => {
    component.skill = 47;
    component.augment = 33;
    expect(component.getValue()).toBe(53);
    expect(component.getCrit(1)).toBe(4);
    expect(component.getSuccess(2 / 3)).toBe(35);
    component.augment = 0;
    component.skill = 101;
    expect(component.getFumble(1)).toBe(100);
  });
});
