import { CommittedNumberComponent } from './committed-number.component';

describe('Committed character values', () => {
  it('keeps a partial or invalid number out of the saved value and preserves an intentional clear', () => {
    const editor = new CommittedNumberComponent();
    editor.value = 13;
    const updates: (number | '')[] = [];
    editor.committed.subscribe(value => updates.push(value));
    editor.write('-');
    editor.commit();
    expect(updates).toEqual([]);
    expect(editor.invalid).toBeTrue();
    editor.write('16');
    expect(updates).toEqual([]);
    editor.commit();
    editor.write('');
    editor.commit();
    expect(updates).toEqual([16, '']);
  });

  it('supports negative HP and caps a confirmed increase at the location maximum', () => {
    const editor = new CommittedNumberComponent();
    editor.value = 0;
    editor.maximum = 6;
    const updates: (number | '')[] = [];
    editor.committed.subscribe(value => updates.push(value));
    editor.step({ select() {} } as HTMLInputElement, -1);
    editor.write('9');
    editor.commit();
    expect(updates).toEqual([-1, 6]);
  });
});
