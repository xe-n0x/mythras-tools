import { v4 as uuid } from 'uuid';
import { Character } from '../model/character';
import { CharacterChange, CharacterHistoryEvent, HistoryField } from '../model/character-history';
import type { RollRecord } from '../model/roll-record';
import { hydrateCharacter } from './character-format';

const historyLimit = 50;
const historySizeLimit = 128_000;
type Details = Pick<CharacterHistoryEvent, 'type' | 'target' | 'source' | 'description'> &
  Partial<Pick<CharacterHistoryEvent, 'before' | 'after'>>;
type Data = Record<string | number, unknown>;
const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const isObject = (value: unknown): value is Data => value !== null && typeof value === 'object';

function capture(character: Character, fields: readonly HistoryField[]): Data {
  return JSON.parse(JSON.stringify(Object.fromEntries(fields.map(field => [field, character[field]]))));
}

function diff(before: unknown, after: unknown, path: (string | number)[], changes: CharacterChange[]): void {
  if (equal(before, after)) return;
  if (isObject(before) && isObject(after) && Array.isArray(before) === Array.isArray(after) &&
    (!Array.isArray(before) || (Array.isArray(after) && before.length === after.length))) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      diff(before[key], after[key], [...path, key], changes);
    }
  } else changes.push({ path, before, after });
}

export function savedHistory(character: Character): CharacterHistoryEvent[] {
  return Array.isArray(character.history) ? character.history.filter(event => event &&
    typeof event.id === 'string' && typeof event.type === 'string' && typeof event.target === 'string') : [];
}

function appendHistory(character: Character, event: CharacterHistoryEvent): CharacterHistoryEvent[] {
  const entries = [...savedHistory(character), event].slice(-historyLimit);
  while (entries.length > 1 && JSON.stringify(entries).length > historySizeLimit) entries.shift();
  character.history = entries;
  return entries;
}

export class CharacterHistory {
  private undoStack: CharacterHistoryEvent[] = [];
  private redoStack: CharacterHistoryEvent[] = [];

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }

  record<T>(character: Character, fields: readonly HistoryField[], details: Details, action: () => T): T {
    const before = capture(character, fields);
    const result = action();
    const after = capture(character, fields);
    const changes: CharacterChange[] = [];
    for (const field of fields) diff(before[field], after[field], [field], changes);
    if (!changes.length) return result;
    const event: CharacterHistoryEvent = {
      id: uuid(), time: new Date().toISOString(), ...details, changes,
      before: Object.prototype.hasOwnProperty.call(details, 'before') ? details.before : changes.length === 1 ? changes[0].before : undefined,
      after: Object.prototype.hasOwnProperty.call(details, 'after') ? details.after : changes.length === 1 ? changes[0].after : undefined,
    };
    const entries = appendHistory(character, event);
    const kept = new Set(entries.map(entry => entry.id));
    this.undoStack = [...this.undoStack, event].filter(entry => kept.has(entry.id));
    this.redoStack = [];
    return result;
  }

  recordRoll(character: Character, roll: RollRecord): void {
    appendHistory(character, {
      id: uuid(), time: new Date().toISOString(), type: 'Roll', target: roll.check?.skill ?? roll.dice.expression,
      changes: [], roll: JSON.parse(JSON.stringify(roll)) as RollRecord,
    });
  }

  replay(character: Character, direction: 'undo' | 'redo', save: (restored: Character) => boolean): Character | undefined {
    const from = direction === 'undo' ? this.undoStack : this.redoStack;
    const to = direction === 'undo' ? this.redoStack : this.undoStack;
    const event = from[from.length - 1];
    if (!event) return undefined;
    const expected = direction === 'undo' ? 'after' : 'before';
    const replacement = direction === 'undo' ? 'before' : 'after';
    // Reuse the JSON loading boundary so composite state is restored as a valid character.
    const draft: Data = JSON.parse(JSON.stringify(character));
    for (const change of event.changes) {
      if (change.path.some(key => ['__proto__', 'constructor', 'prototype'].includes(String(key)))) return undefined;
      const parent = change.path.slice(0, -1).reduce<unknown>((value, key) =>
        isObject(value) && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined, draft);
      const key = change.path[change.path.length - 1];
      if (!isObject(parent) || !equal(parent[key], change[expected])) return undefined;
      if (change[replacement] === undefined) delete parent[key];
      else parent[key] = JSON.parse(JSON.stringify(change[replacement]));
    }
    const restored = hydrateCharacter(draft);
    restored.history = savedHistory(character).map(entry => entry.id === event.id
      ? { ...entry, undone: direction === 'undo' } : entry);
    if (!save(restored)) return undefined;
    from.pop();
    to.push(event);
    return restored;
  }

  clear(character: Character): void {
    delete character.history;
    this.undoStack = [];
    this.redoStack = [];
  }
}
