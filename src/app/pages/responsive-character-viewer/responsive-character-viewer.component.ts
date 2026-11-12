import { CharacterHistory, savedHistory } from 'src/app/services/character-history';
import { CharacterHistoryEvent, HistoryField } from 'src/app/model/character-history';
import { RollCheckContext, RollRecord } from 'src/app/model/roll-record';
import { formatPercentile } from 'src/app/services/dice';
import { sheetEffectImpact, sheetModifierText, sheetRuleRef, sheetRu } from 'src/app/services/sheet-labels';
import { CharacterEffect, CharacteristicKey } from 'src/app/model/character-effect';
import { activeCharacteristicModifiers, applyAttributeEffect, characterEffects, currentFatigue, effectiveMovement, effectImpact } from 'src/app/services/character-effects';
import { initiativeWithArmour, magicPointMaximum, resolveSessionSkill, sessionValue, storedSkillValue } from 'src/app/services/session-values';
import { attributeDetails, CalculatedAttribute, CalculationDetails, characteristicDetails, hpDetails } from 'src/app/services/calculation-details';
import { difficultyGrades, DifficultyGrade, DifficultySystem, hardestGrade, skillCheckTarget } from 'src/app/services/skill-check';
import { withCurrentCharacteristics, withEffectiveCharacteristics } from 'src/app/services/characteristics';
import { formatMeasurement, heightInMetres, jumpDistance } from 'src/app/services/movement-display';
import { addSpareArmour, armourLabel, armourPenalty, changeArmour, changeWeaponGrip, getArmourAt, hasArmour, spareArmour, weaponGrips, wornArmourEnc } from 'src/app/services/character-loadout';
import { Router } from '@angular/router';
import { downloadJson } from 'src/app/services/character-format';
import { editCurrentHp, getCurrentHp, getHitLocations, getLocationInjury, getMaximumHp, getWoundSeverity, restoreLocationHp, setLocationInjury, usesHumanoidBodyMap } from 'src/app/services/hit-points';
import { HealthLocation } from 'src/app/character/character-health/character-health.component';
import { CharacterWeapon, WeaponGrip } from 'src/app/model/character-weapon';
import { Weapon } from 'src/app/model/weapon';
import { Equipment } from 'src/app/model/equipment';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { Character, LocationInjury } from 'src/app/model/character';
import { Skill } from 'src/app/model/skill';
import { CharacterPassions } from 'src/app/model/character-passions';
import { Spell } from 'src/app/model/spell';
import { getAllCombatStyles, getButArmor, getMoneyAfterClass, getSkillBase, getTotalFromItems } from 'src/app/services/character-service.service';
import { orZero } from 'src/app/services/common.service';
import { Passions } from 'src/app/services/passions.service';
import { SpecialEffectsService } from 'src/app/services/special-effects.service';
import { WeaponService } from 'src/app/services/weapon.service';
import {
  AppStorageService,
  DebouncedSaveHandle,
} from 'src/app/services/app-storage.service';

type ViewerSection = 'play' | 'attributes' | 'extras';
type SectionTarget = 'skills' | 'profile' | 'customization';

function restoreViewerSection(saved: string | null): ViewerSection {
  switch (saved) {
    case 'skills':
    case 'attributes': return 'attributes';
    case 'overview':
    case 'magic':
    case 'notes':
    case 'customization':
    case 'extras': return 'extras';
    default: return 'play';
  }
}

@Component({
  selector: 'app-responsive-character-viewer',
  templateUrl: './responsive-character-viewer.component.html',
  styleUrls: ['./responsive-character-viewer.component.scss'],
})
export class ResponsiveCharacterViewerComponent implements OnInit, OnDestroy {
  readonly ru = sheetRu;
  readonly ruleRef = sheetRuleRef;
  readonly modifierText = sheetModifierText;
  readonly displayEffectImpact = sheetEffectImpact;
  private readonly historyDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  rulePreview?: { title: string; lines: string[]; source?: string };

  historyTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : this.historyDate.format(date);
  }

  calculationValue(label: string, value: number | string): string {
    if (label === 'Direct dependants' && typeof value === 'string') return value.split(', ').map(this.ru).join(', ');
    return this.ruleRef(this.historyValue(value)).split(' · ').map(this.modifierText).join(' · ');
  }

  openRule(title: string, lines: string[], dialog: HTMLDialogElement, source?: string): void {
    this.rulePreview = { title, lines, source };
    dialog.showModal();
  }

  openEffectRule(name: string, dialog: HTMLDialogElement): void {
    const rule = this.effects.getSpecialEffect(name);
    if (rule) this.openRule(rule.effect, rule.traits, dialog, rule.requirement);
  }
  public readonly storage = inject(AppStorageService);
  private readonly effects = inject(SpecialEffectsService);
  private readonly weapons = inject(WeaponService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private saveHandle!: DebouncedSaveHandle;

  character: Character | null = null;
  nameDraft: string | null = null;
  @ViewChild('nameTrigger') private nameTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('nameEditor') set nameEditor(input: ElementRef<HTMLInputElement> | undefined) {
    if (input) {
      input.nativeElement.focus();
      input.nativeElement.select();
    }
  }
  activeSection: ViewerSection = 'play';
  jumpRunUp = true;
  jumpCritical = false;
  normalStep?: number;
  weaponMessage = '';
  armourDraft = new Equipment();
  armourDraftLocation = '';
  readonly gripLabels: Record<WeaponGrip, string> = { main: 'Main hand', off: 'Off hand', both: 'Both hands' };
  skillQuery = '';
  magicQuery = '';
  private readonly failedPortraits = new Set<string>();
  @ViewChild('sectionPanel') sectionPanel?: ElementRef<HTMLElement>;
  readonly weaponGroups = [{ranged:false,label:'Melee weapons & shields'}, {ranged:true,label:'Ranged weapons'}];
  readonly meleeFields = [{key:'size',label:'Size'}, {key:'reach',label:'Reach'}, {key:'ap',label:'AP'}, {key:'hp',label:'HP'}];
  readonly rangedFields = [{key:'dm',label:'DM'}, {key:'force',label:'Force'}, {key:'loadTime',label:'Load'}, {key:'range',label:'Range'}, ...this.meleeFields.filter(field=>field.key!=='reach')];
  get hitLocations() { return this.character ? getHitLocations(this.character) : []; }
  trackHitLocation(_index: number, location: { key: string }): string { return location.key; }
  getCurrentHp(location: string): number | string { return this.character ? getCurrentHp(this.character, location) : ''; }
  private getLocationArmour(location: string) {
    return this.character ? getArmourAt(this.character.equipment, location) : undefined;
  }

  getLocationAp(location: string): number | string {
    const armour = this.getLocationArmour(location);
    return hasArmour(armour) ? armour.ap ?? '—' : 0;
  }

  getLocationArmourName(location: string): string {
    const armour = this.getLocationArmour(location);
    return hasArmour(armour) ? armourLabel(armour) : '';
  }

  displayArmour(location: string): string {
    const piece = this.getLocationArmour(location);
    return hasArmour(piece) ? piece.name || [piece.material, piece.type || piece.construction].filter(Boolean).map(this.ru).join(' ') || 'Своя броня' : '';
  }

  armourChoices(location: string): { index: number; label: string }[] {
    if (!this.character) return [];
    return spareArmour(this.character.equipment).flatMap((entry, index) =>
      entry?.location === location && hasArmour(entry.piece)
        ? [{ index, label: armourLabel(entry.piece) + ' · ' + (entry.piece.ap ?? 0) + ' AP' }] : []);
  }

  equipmentPicker?: {
    title: string; current?: string; description: string; searchable?: boolean;
    options: { value: string; label: string; description?: string; selected?: boolean }[];
    select: (value: string) => boolean;
  };
  equipmentQuery = '';

  get visibleEquipmentOptions() {
    const picker = this.equipmentPicker;
    if (!picker) return [];
    const query = this.equipmentQuery.trim().toLocaleLowerCase('ru');
    return !picker.searchable || !query ? picker.options : picker.options.filter(({ label, value }) =>
      [label, value].some(name => name.toLocaleLowerCase('ru').includes(query)));
  }

  openArmourPicker(location: string, dialog: HTMLDialogElement): void {
    const worn = this.displayArmour(location);
    const options = this.character ? spareArmour(this.character.equipment).flatMap((entry, index) => entry?.location === location && hasArmour(entry.piece) ? [{
      value: String(index), label: entry.piece.name || [entry.piece.material, entry.piece.type || entry.piece.construction].filter(Boolean).map(this.ru).join(' ') || 'Своя броня',
      description: 'Защита: ' + (entry.piece.ap ?? 0) + ' ОБ',
    }] : []) : [];
    this.equipmentPicker = {
      title: 'Броня · ' + this.ru(this.locationLabel(location)), current: worn || 'Без брони',
      description: 'Защита: ' + this.getLocationAp(location) + ' ОБ',
      options: [
        ...(worn ? [{ value:'worn', label:worn, selected:true }] : []),
        ...options,
        { value:'none', label:'Без брони', description:'Снять броню с этой части тела', selected:!worn },
      ],
      select: value => this.selectArmour(location, value),
    };
    this.weaponMessage = '';
    dialog.showModal();
  }

  private selectArmour(location: string, selection: string): boolean {
    const before = this.getLocationArmourName(location) || 'Unarmoured';
    const after = selection === 'none' ? 'Unarmoured' : this.armourChoices(location).find(choice => choice.index === Number(selection))?.label;
    return this.recordChange(['equipment'], {type:'Armour', target:this.locationLabel(location), before, after}, () =>
      changeArmour(this.character!, location, selection === 'none' ? null : Number(selection))) === true;
  }

  get canAddSpareArmour(): boolean {
    return !!this.armourDraftLocation && hasArmour(this.armourDraft);
  }

  saveSpareArmour(): void {
    if (this.character && addSpareArmour(this.character, this.armourDraftLocation, this.armourDraft)) {
      this.armourDraft = new Equipment();
      this.saveHandle?.schedule();
    }
  }
  get humanoidHealth(): boolean { return !!this.character && usesHumanoidBodyMap(this.character); }

  get healthLocations(): HealthLocation[] {
    if (!this.character) return [];
    const calculated = this.getCharacterWithCurrentCharacteristics();
    return this.hitLocations.map(location => {
      const current = this.getCurrentHp(location.key);
      const maximum = getMaximumHp(calculated, location.key);
      return {
        ...location, current, maximum,
        armour: this.getLocationAp(location.key),
        severity: getWoundSeverity(current, maximum),
        injury: getLocationInjury(calculated, location.key),
      };
    });
  }

  editHealth(edit: { key: string; value: number | string }): void {
    if (!this.character || !this.hitLocations.some(location => location.key === edit.key)) return;
    const current = this.getCurrentHp(edit.key);
    const type = current !== '' && edit.value !== '' && Number(edit.value) > Number(current) ? 'Healing' : 'HP';
    this.recordChange(['currentHitPoints'], {type, target:this.locationLabel(edit.key)}, () => editCurrentHp(this.character!, edit.key, edit.value));
  }

  restoreHealth(event: { key: string; confirmed: boolean }): void {
    this.recordChange(['currentHitPoints'], {type:'Restore HP', target:this.locationLabel(event.key)}, () =>
      restoreLocationHp(this.character!, event.key, event.confirmed));
  }

  editInjury(edit: { key: string; injury: LocationInjury }): void {
    if (!this.character || !this.hitLocations.some(location => location.key === edit.key)) return;
    this.recordChange(['locationInjuries'], {type:'Location state', target:this.locationLabel(edit.key), description:edit.injury.note}, () =>
      setLocationInjury(this.character!, edit.key, edit.injury));
  }

  saveName(): void {
    if (!this.character || this.nameDraft === null) return;
    this.recordChange(['name'], {type:'Identity', target:'Character name'}, () => this.character!.name = this.nameDraft!.trim());
    this.closeNameEditor();
  }

  closeNameEditor(): void {
    this.nameDraft = null;
    this.changeDetector.detectChanges();
    this.nameTrigger?.nativeElement.focus();
  }

  get portraitSource(): string {
    const source = [this.character?.portraitUrl, this.character?.portrait]
      .find((value): value is string => typeof value === 'string' && !!value.trim() && !this.failedPortraits.has(value));
    return source ?? '';
  }

  onPortraitError(): void { this.failedPortraits.add(this.portraitSource); }

  get initials(): string {
    return this.character?.name?.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';
  }

  get profileLine(): string {
    return [this.character?.species, this.character?.culture, this.character?.career].filter(Boolean).map(this.ru).join(' · ');
  }

  mobileSkills = false;
  selectedCheck?: Skill;
  difficultyGrade: DifficultyGrade = 'Standard';
  difficultySystem: DifficultySystem = 'standard';
  readonly difficultyGrades = difficultyGrades;
  freeRollOpen = false;
  animateDice = true;

  openFreeRoll(dialog: HTMLDialogElement): void {
    this.freeRollOpen = true;
    dialog.showModal();
  }

  setDiceAnimation(enabled: boolean): void {
    this.animateDice = enabled;
    this.storage.setRaw('viewer-dice-motion', enabled ? 'on' : 'off');
  }

  recordDiceRoll(roll: RollRecord): void {
    if (!this.character) return;
    this.historySession.recordRoll(this.character, roll);
    this.persistCharacter();
  }

  historyRollFaces(roll: RollRecord): string {
    return (Array.isArray(roll.dice?.dice) ? roll.dice.dice : []).map(die =>
      (die.sign < 0 ? '−' : '') + 'd' + die.sides + ': ' + (die.sides === 100 ? formatPercentile(die.value) : die.value)).join(' · ');
  }

  get skillGroups(): { name: string; skills: Skill[] }[] {
    const groups = [
      { name: 'Standard', skills: this.getSessionStandardSkills() },
      { name: 'Professional', skills: [...this.getSessionProfessionalSkills(),
        ...this.getSelectedProfessionalSkills('Language').filter(skill => this.matchesSkill(skill))] },
    ];
    const visibleGroups = this.skillQuery.trim() ? groups.filter(group => group.skills.length > 0) : groups;
    return visibleGroups.map(group => ({
      ...group,
      skills: group.skills.slice().sort((a, b) => this.ru(a.name).localeCompare(this.ru(b.name), 'ru')),
    }));
  }

  openSkillCheck(skill: Skill, dialog: HTMLDialogElement): void {
    this.selectedCheck = skill;
    this.difficultyGrade = 'Standard';
    dialog.showModal();
  }

  trackSkillGroup(_index: number, group: { name: string }): string { return group.name; }

  get effectSkills(): Skill[] {
    return [...this.getStandardSkills(), ...this.getSelectedProfessionalSkills(),
      ...this.getSelectedProfessionalSkills('Language'), ...(this.character?.skills.combatstyles ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get sessionEffects(): CharacterEffect[] { return this.character ? characterEffects(this.character) : []; }

  readonly historySession = new CharacterHistory();
  historyMessage = '';

  get historyEntries(): CharacterHistoryEvent[] {
    return this.character ? savedHistory(this.character).slice().reverse() : [];
  }

  locationLabel(key: string): string { return this.hitLocations.find(location => location.key === key)?.label ?? key; }

  private recordChange<T>(fields: readonly HistoryField[], details: Pick<CharacterHistoryEvent, 'type' | 'target' | 'description' | 'source' | 'before' | 'after'>,
    action: () => T): T | undefined {
    if (!this.character) return undefined;
    const previous = this.character.history;
    const result = this.historySession.record(this.character, fields, details, action);
    if (previous !== this.character.history) {
      this.historyMessage = '';
      this.persistCharacter();
    }
    return result;
  }

  replayHistory(direction: 'undo' | 'redo'): void {
    if (!this.character) return;
    const restored = this.historySession.replay(this.character, direction, character => {
      this.storage.saveCharacter(character, 'view-character');
      return !this.storage.error;
    });
    if (!restored) {
      this.historyMessage = this.storage.error || 'The current values differ from this action. No values were changed.';
      return;
    }
    this.character = restored;
    this.historyMessage = direction === 'undo' ? 'Action undone.' : 'Action redone.';
  }

  clearHistory(): void {
    if (!this.character || !window.confirm('Очистить историю и очередь отмены для этого персонажа?')) return;
    const candidate = { ...this.character };
    delete candidate.history;
    this.storage.saveCharacter(candidate, 'view-character');
    if (this.storage.error) {
      this.historyMessage = this.storage.error;
      return;
    }
    this.historySession.clear(this.character);
    this.historyMessage = 'History cleared.';
  }

  historyValue(value: unknown): string {
    if (value === undefined || value === null || value === '') return '—';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  historySummaryValue(value: unknown): string {
    if (value && typeof value === 'object' && 'name' in value) {
      return this.ru(String(value.name)) + ('active' in value ? (value.active ? ' · активно' : ' · отключено') : '');
    }
    return typeof value === 'object' && value !== null ? 'См. подробности' : this.ru(this.historyValue(value));
  }

  setDevotionPool(field: 'devotionPool' | 'devotionPoolCurrent', input: HTMLInputElement): void {
    const raw = input.value.trim();
    if (raw && (!/^[+-]?\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)))) return;
    this.recordChange([field], {type:field === 'devotionPool' ? 'Attribute' : 'Current resource', target:'Devotion Pool'}, () => {
      if (raw) this.character![field] = Number(raw);
      else delete (this.character as Partial<Character>)[field];
    });
  }

  setEffects(effects: CharacterEffect[]): void {
    if (!this.character) return;
    const previous = this.sessionEffects;
    const before = previous.find(item => !effects.some(next => next.id === item.id && JSON.stringify(next) === JSON.stringify(item)));
    const after = effects.find(item => !previous.some(old => old.id === item.id && JSON.stringify(old) === JSON.stringify(item)));
    const effect = after ?? before;
    if (!effect) return;
    const type = !before ? 'Add effect' : !after ? 'Remove effect' : before.active !== after.active ? (after.active ? 'Enable effect' : 'Disable effect') : 'Edit effect';
    const target = effect.location ? effect.name + ' · ' + this.locationLabel(effect.location) : effect.name;
    this.recordChange(['activeEffects','fatigueLevel'], {type, target, before, after, source:effect.source, description:effect.description}, () => {
      this.character!.activeEffects = effects;
      delete this.character!.fatigueLevel;
    });
  }

  readonly effectImpact = effectImpact;

  get fatigue() { return this.character ? currentFatigue(this.character) : {}; }

  get checkGrade(): DifficultyGrade {
    const penalty = this.fatigue.grade;
    return hardestGrade(this.difficultyGrade, penalty ? [penalty] : []);
  }

  get checkValues() {
    return this.selectedCheck && this.character ? resolveSessionSkill(this.character, this.selectedCheck) : null;
  }

  get checkTarget(): number | null {
    return this.rollCheckContext?.target ?? null;
  }

  get rollCheckContext(): RollCheckContext | undefined {
    const values = this.checkValues;
    if (!this.selectedCheck || !values) return undefined;
    const grade = this.checkGrade;
    const modifiers = values.effects.filter(entry => !entry.blocked).map(({ effect }) =>
      ({ name: effect.name, source: effect.source, impact: effectImpact(effect) }));
    if (this.fatigue.grade === grade && grade !== this.difficultyGrade) {
      modifiers.push({ name: 'Fatigue', source: 'Core Rules, Fatigue Levels, p. 79', impact: grade });
    }
    return {
      skill: this.selectedCheck.name, original: values.original, effective: values.effective,
      grade, selectedGrade: this.difficultyGrade, system: this.difficultySystem,
      target: skillCheckTarget(values.effective, grade, this.difficultySystem), modifiers,
    };
  }

  get localCheckRestrictions(): CharacterEffect[] {
    return this.sessionEffects.filter(effect => effect.kind === 'stun' && effect.active);
  }

  getSessionCheckValue(skill: Skill): number | null {
    return skillCheckTarget(Number(this.getSkill(skill)), this.fatigue.grade ?? 'Standard', this.difficultySystem);
  }

  sessionCheckLabel(skill: Skill): string {
    const value = this.getSessionCheckValue(skill);
    return value === null ? '—' : this.checkNumber.format(value) + '%';
  }

  private readonly checkNumber = new Intl.NumberFormat('en', { maximumFractionDigits: 4, useGrouping: false });

  effectiveCharacteristic(label: string): number | null {
    const key = label.toLowerCase() as CharacteristicKey;
    if (!this.character || !activeCharacteristicModifiers(this.character, key).length) return null;
    return this.getCharacterWithCurrentCharacteristics().skills[key];
  }

  characteristicSources(label: string) {
    return this.character ? activeCharacteristicModifiers(this.character, label.toLowerCase() as CharacteristicKey) : [];
  }

  calculation?: CalculationDetails;
  readonly inspectedAttributes: { key: CalculatedAttribute; label: string }[] = [
    {key:'ap', label:'Action Points'}, {key:'luck', label:'Luck Points'}, {key:'magicPoints', label:'Magic Points'},
    {key:'damage', label:'Damage Modifier'}, {key:'init', label:'Initiative'}, {key:'healing', label:'Healing Rate'},
    {key:'expMod', label:'Experience Modifier'},
  ];

  get maximumMagicPoints(): number | '' { return this.character ? magicPointMaximum(this.character) : ''; }

  showCharacteristic(label: string, dialog: HTMLDialogElement): void {
    if (!this.character) return;
    this.calculation = characteristicDetails(this.character, label.toLowerCase() as CharacteristicKey, this.effectSkills);
    dialog.showModal();
  }

  showAttribute(key: CalculatedAttribute, dialog: HTMLDialogElement): void {
    if (!this.character) return;
    this.calculation = attributeDetails(this.character, key);
    dialog.showModal();
  }

  showHp(key: string, dialog: HTMLDialogElement): void {
    if (!this.character) return;
    this.calculation = hpDetails(this.character, key, this.locationLabel(key), this.humanoidHealth);
    dialog.showModal();
  }

  get walkWithEffects(): number {
    if (!this.character) return 0;
    const base = Number(this.character.movementRate) || 0;
    return effectiveMovement(applyAttributeEffect(this.character, 'movement', base), this.fatigue);
  }

  get canMove(): boolean {
    return !this.fatigue.unableToAct && this.fatigue.movement !== 'immobile';
  }

  setDifficultySystem(system: DifficultySystem): void {
    this.difficultySystem = system;
    this.storage.setRaw('viewer-difficulty-system-' + this.character!.id, system);
  }

  private readonly router = inject(Router);
  editCharacter(): void { this.persistCharacter(); if (this.storage.error) return; this.storage.setJson('creation-character', this.character); this.router.navigate(['/character-creation']); }
  download(): void { this.persistCharacter(); downloadJson(this.character, (this.character?.name || 'character') + '.json'); }


  readonly sections: { key: ViewerSection; label: string }[] = [
    { key:'play', label:'Character' },
    { key: 'attributes', label: 'Attributes & Skills' },
    { key: 'extras', label: 'Magic, Notes & Extras' },
  ];
  readonly passionObjects = Passions.map((p) => p.objectOfPassion);
  private traitsRecord: Record<string, any> = {};

  readonly characteristicRows: {
    label: string;
    orig: () => number | string;
    curr: () => number | string;
  }[] = [
    { label: 'STR', orig: () => this.character?.skills?.str ?? '', curr: () => this.getCurrentCharacteristic('str') },
    { label: 'CON', orig: () => this.character?.skills?.con ?? '', curr: () => this.getCurrentCharacteristic('con') },
    { label: 'SIZ', orig: () => this.character?.skills?.siz ?? '', curr: () => this.getCurrentCharacteristic('siz') },
    { label: 'DEX', orig: () => this.character?.skills?.dex ?? '', curr: () => this.getCurrentCharacteristic('dex') },
    { label: 'INT', orig: () => this.character?.skills?.int ?? '', curr: () => this.getCurrentCharacteristic('int') },
    { label: 'POW', orig: () => this.character?.skills?.pow ?? '', curr: () => this.getCurrentCharacteristic('pow') },
    { label: 'CHA', orig: () => this.character?.skills?.cha ?? '', curr: () => this.getCurrentCharacteristic('cha') },
  ];

  ngOnInit(): void {
    this.saveHandle = this.storage.createDebouncedSave(
      () => this.persistCharacter(),
      300
    );
    this.character = this.storage.readCharacter('view-character');
    this.animateDice = this.storage.getRaw('viewer-dice-motion') !== 'off';
    this.difficultySystem = this.storage.getRaw('viewer-difficulty-system-' + this.character.id) === 'simplified' ? 'simplified' : 'standard';
    const section = this.storage.getRaw('viewer-section-' + this.character.id);
    const fromCreation = this.router.getCurrentNavigation()?.extras.state?.['openCharacterOverview'];
    if (!fromCreation) this.activeSection = restoreViewerSection(section);
  }

  setSection(section: ViewerSection, target?: SectionTarget): void {
    this.flushPendingSaves();
    this.activeSection = section;
    this.storage.setRaw('viewer-section-' + this.character!.id, section);
    this.changeDetector.detectChanges();
    const panel = this.sectionPanel?.nativeElement;
    const destination = target ? panel?.querySelector<HTMLElement>(`[data-section-target="${target}"]`) : panel;
    if (destination instanceof HTMLDetailsElement) destination.open = true;
    destination?.scrollIntoView({block:'start'});
    destination?.focus({preventScroll:true});
  }

  matchesSkill(skill: Skill): boolean {
    const query = this.skillQuery.trim().toLocaleLowerCase('ru');
    return [skill.name, this.ru(skill.name)].some(name => name.toLocaleLowerCase('ru').includes(query));
  }
  getSessionStandardSkills(): Skill[] { return this.getStandardSkills().filter(skill=>this.matchesSkill(skill)); }
  getSessionProfessionalSkills(): Skill[] { return this.getSelectedProfessionalSkills().filter(skill=>this.matchesSkill(skill)); }
  skillCharacteristics(skill: Skill): string {
    return Array.isArray(skill.base)
      ? skill.base.filter(key => typeof key === 'string' && key.length > 0).map(key => key.toUpperCase()).join(' · ')
      : '';
  }
  learnProfessionalSkill(name: string): void {
    const skill = this.getActualSkill(name);
    if (skill) this.recordChange(['skills'], {type:'Learn skill', target:name}, () => skill.force = true);
  }
  getUnselectedProfessionalSkills(): string[] {
    const selected=new Set(this.getSelectedProfessionalSkills().map(skill=>skill.name));
    return this.getProfessionalSkillOptions().filter(name=>!selected.has(name)).sort();
  }
  getLanguageRows(): number[] { return Array.from({length:this.getSelectedProfessionalSkills('Language').length+1},(_,index)=>index); }
  getWeaponFields(ranged: boolean) { return ranged ? this.rangedFields : this.meleeFields; }
  getWeaponTraitEntries(index: number, ranged: boolean): {name:string; description:string}[] {
    const traits=this.getWeaponProp(index,ranged,'traits');
    return Array.isArray(traits) ? traits.filter(trait=>trait?.name && trait.description) : [];
  }
  getWeaponEffectNames(index: number, ranged: boolean): string[] {
    return [...new Set(this.getWeaponEffects(index,ranged).split(',').map(name=>name.trim()).filter(Boolean))];
  }
  hasEffectRules(name: string): boolean { return !!this.effects.getSpecialEffect(name); }
  getStyleWeaponText(style: any): string { return Object.values(style.weapons || {}).filter(Boolean).join(', '); }
  trackMagicEntry(index: number, spell: {name:string; tradition:string}): string { return `${spell.tradition}:${spell.name}:${index}`; }
  getMagicEntries(): {name:string; tags:string; description:string; tradition:string}[] {
    if (!this.character) return [];
    const magic=this.character.magic;
    const groups=[{list:magic.folk,label:'Folk magic'}, {list:magic.sorcery,label:'Sorcery'}, {list:magic.miracles,label:'Theism'}, {list:magic.custom,label:'Other magic'},
      {list:magic.path.augmentations,label:'Mysticism · Augmentations'}, {list:magic.path.invocations,label:'Mysticism · Invocations'}, {list:magic.path.enhancements,label:'Mysticism · Enhancements'}];
    const query=this.magicQuery.trim().toLowerCase();
    return groups.flatMap(group=>(group.list || []).map((spell:any)=>({name:typeof spell==='string'?spell:spell.name || 'Unnamed ability',tags:spell.tags || '',description:spell.description || '',tradition:group.label})))
      .filter(spell=>[spell.name,spell.tags,spell.description,spell.tradition,this.ru(spell.tradition)].join(' ').toLowerCase().includes(query));
  }

  setNumberValue(
    obj: Record<string, any> | null | undefined,
    key: string,
    event: any
  ): void {
    if (!obj) {
      return;
    }
    const raw = event?.target?.value;
    const parsed = parseInt(raw, 10);
    obj[key] = Number.isNaN(parsed) ? 0 : parsed;
  }

  setCharacterNumber(field: string, event: any): void {
    this.setNumberValue(this.character as any, field, event);
  }

  setSkillCharacteristic(field: string, event: any): void {
    const raw = event?.target?.value;
    const parsed = parseInt(raw, 10);
    this.setCurrentCharacteristic(field, Number.isNaN(parsed) ? '' : parsed);
  }

  private getCurrentStore(): Record<string, any> {
    const characterAny = this.character as any;
    if (!characterAny) {
      return {};
    }
    if (!characterAny.currentValues) {
      characterAny.currentValues = {};
    }
    return characterAny.currentValues as Record<string, any>;
  }

  getCurrentCharacteristic(field: string): number | string {
    return (this.character as any)?.currentValues?.[field] ?? '';
  }

  editingBaseCharacteristics = false;

  setBaseCharacteristic(label: string, value: number | ''): void {
    if (!this.character) return;
    const key = label.toLowerCase() as CharacteristicKey;
    this.recordChange(['skills'], {type:'Base characteristic', target:label, before:this.character.skills[key], after:value}, () => {
      if (value === '') delete (this.character!.skills as Partial<Character['skills']>)[key];
      else this.character!.skills[key] = value;
    });
  }

  setCurrentCharacteristic(field: string, value: number | string): void {
    if (!this.character) {
      return;
    }
    if (this.getCurrentCharacteristic(field) === value) return;
    const isCharacteristic = this.characteristicRows.some(row => row.label.toLowerCase() === field);
    const target = ({ap:'Action Points', luck:'Luck Points', magicPoints:'Magic Points'} as Record<string,string>)[field] ?? field.toUpperCase();
    this.recordChange(['currentValues'], {type:isCharacteristic ? 'Characteristic' : 'Current resource', target,
      before:this.getCurrentCharacteristic(field), after:value}, () => this.getCurrentStore()[field] = value);
  }

  getSkill(skill: Skill | undefined): number | string {
    return this.character && skill ? sessionValue(this.character, skill) : '';
  }

  getStoredSkill(skill: Skill | undefined): number | string {
    return this.character && skill ? storedSkillValue(this.character, skill) : '';
  }

  getStoredFixedSkill(name: string): number | string { return this.getStoredSkill(this.getActualSkill(name)); }

  getSkillBaseValue(skill: Skill | undefined): number | string {
    if (!this.character || !skill) {
      return '';
    }
    return getSkillBase(withCurrentCharacteristics(this.character), skill);
  }

  setSkill(skill: Skill | undefined, value: any): void {
    if (!skill || !this.character) return;
    const raw = String(value.target.value).trim();
    if (skill === this.character.skills.damage) {
      this.recordChange(['damageModifierOverride'], {type:'Attribute', target:skill.name}, () => this.character!.damageModifierOverride = raw);
      return;
    }
    if (!/^[+-]?\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) return;
    const before = this.getStoredSkill(skill);
    const after = Number(raw);
    if (Number(before) === after) return;
    this.recordChange(['skills'], {type:'Skill or attribute', target:skill.name, before, after}, () => {
      skill.extraBonus = after - Number(before) + orZero(skill.extraBonus);
    });
  }

  getFixedSkill(skill: string): number | string {
    const actual = this.getActualSkill(skill);
    if (!actual) {
      return '';
    }
    return this.getSkill(actual);
  }

  setFixedSkill(skill: string, value: any): void { this.setSkill(this.getActualSkill(skill), value); }

  getActualSkill(skill: string): Skill | undefined {
    if (!this.character) {
      return undefined;
    }
    return this.character.skills.skills
      .concat(this.character.skills.combatstyles)
      .concat(this.character.skills.specialized)
      .concat(this.character.skills.extraProfessionalCultureSkills || [])
      .concat(this.character.skills.extraProfessionalCareerSkills || [])
      .concat([this.character.skills.hobby])
      .find((s) => s && s.name === skill);
  }

  getOrCreateMoney(): string {
    if (!this.character) {
      return '';
    }
    return this.character.moneyOverall || this.generateMoney();
  }

  setMoney(event: any): void {
    if (!this.character) {
      return;
    }
    this.character.moneyOverall = event.target.value;
  }

  generateMoney(): string {
    if (!this.character) {
      return '';
    }
    const money =
      getMoneyAfterClass(this.character) -
      getTotalFromItems(this.character, 'cost');
    const social = this.character.socialClass;
    return `Money: ${Math.floor(money)} S, ${Math.floor(
        (money - Math.floor(money)) * 100
      )} C\n\n${social ? social.resources : ''}`.trim() + '\n';
  }

  getAthletics(): number {
    return orZero(this.getFixedSkill('Athletics') as any);
  }

  getSwimSkill(): number {
    return orZero(this.getFixedSkill('Swim') as any);
  }

  readonly formatMeasurement = formatMeasurement;

  get jumpHeight(): number | '' {
    return heightInMetres(Number(this.character?.height));
  }

  updateJumpHeight(input: HTMLInputElement): void {
    if (!this.character) return;
    if (input.validity.valid && input.valueAsNumber > 0) {
      const metres = input.valueAsNumber;
      this.character.height = metres >= 0.1 ? metres * 100 : metres;
      this.saveHandle?.schedule();
    } else {
      input.value = String(this.jumpHeight);
    }
  }

  get jumpNeedsStep(): boolean {
    return this.getArmorPenalty() > 0 && !(this.normalStep && this.normalStep > 0);
  }

  getRun(): number {
    if (!this.canMove) return 0;
    const mr = this.walkWithEffects;
    return (mr + Math.floor(this.getAthletics() / 25) * 0.5) * 3;
  }

  getSprint(): number {
    if (!this.canMove) return 0;
    const mr = this.walkWithEffects;
    return (mr + Math.floor(this.getAthletics() / 25) * 0.5) * 5;
  }

  getHorizontal(): number | '' {
    return this.getJump('horizontal');
  }

  getVertical(): number | '' {
    return this.getJump('vertical');
  }

  private getJump(direction: 'horizontal' | 'vertical'): number | '' {
    if (!this.canMove) return '';
    return jumpDistance(Number(this.character?.height), this.getAthletics(), direction, {
      runUp: this.jumpRunUp,
      armourPenalty: this.jumpNeedsStep ? 0 : this.getArmorPenalty(),
      normalStep: this.normalStep,
      critical: this.jumpCritical,
    });
  }

  getSwim(): number {
    if (!this.canMove) return 0;
    const mr = this.walkWithEffects;
    return mr + Math.floor(this.getSwimSkill() / 20);
  }

  getStandardSkills(): Skill[] {
    if (!this.character) {
      return [];
    }
    return this.character.skills.skills.filter((s) => s && !s.professional);
  }

  getProffSkills(skill?: string): Skill[] {
    if (!this.character) {
      return [];
    }
    return this.character.skills.skills
      .concat(this.character.skills.specialized)
      .concat(this.character.skills.extraProfessionalCultureSkills || [])
      .concat(this.character.skills.extraProfessionalCareerSkills || [])
      .concat([this.character.skills.hobby])
      .filter(
        (s, index, all) =>
          s && all.findIndex(candidate => candidate?.name === s.name) === index &&
          s.professional &&
          ((!skill && !s.name.includes('Language')) ||
            (skill && s.name.includes(skill) && s.name !== skill))
      );
  }

  getActualProfSkill(index: number, skill?: string): Skill | undefined {
    return this.getSelectedProfessionalSkills(skill)[index];
  }

  getProfSkillName(index: number, skill?: string): string {
    const actual = this.getActualProfSkill(index, skill);
    return actual ? actual.name : '';
  }

  getProfBaseSkill(index: number, skill?: string): number | string {
    const actual = this.getActualProfSkill(index, skill);
    if (!actual || !this.character) {
      return '';
    }
    return getSkillBase(this.getCharacterWithCurrentCharacteristics(), actual);
  }

  getProfSkill(index: number, skill?: string): number | string {
    const actual = this.getActualProfSkill(index, skill);
    if (!actual) {
      return '';
    }
    return this.getStoredSkill(actual);
  }

  setProfSkill(value: any, index: number, skill?: string): void { this.setSkill(this.getActualProfSkill(index, skill), value); }

  setProfSkillNameByValue(value: string, index: number, skill?: string): void {
    this.recordChange(['skills'], {type:'Professional skill', target:value || this.getProfSkillName(index, skill)}, () =>
      this.setProfSkillName({ target: { value } }, index, skill));
  }

  setProfSkillName(value: any, index: number, skill?: string): void {
    const incoming = (value?.target?.value || '').trim();
    if (!incoming) {
      const target = this.getSelectedProfessionalSkills(skill)[index];
      if (target) {
        if (target.force) {
          target.force = false;
        }
        // If the row is being cleared and isn't a career/culture-assigned skill,
        // drop transient extra bonus too so it actually disappears from selection.
        if (!target.careerBonus && !target.cultureBonus) {
          target.extraBonus = 0;
        }
      }
      return;
    }

    const selected = this.getSelectedProfessionalSkills(skill);
    const duplicateAtAnotherRow = selected.some(
      (s, rowIndex) => rowIndex !== index && s.name === incoming
    );
    if (duplicateAtAnotherRow) {
      return;
    }

    const found = this.getActualSkill(incoming);
    if (found && !found.careerBonus && !found.cultureBonus && !found.extraBonus) {
      found.force = true;
    }
  }

  getProfessionalSkillOptions(skill?: string): string[] {
    return this.getProffSkills(skill).map((s) => s.name);
  }

  getProfessionalSkillOptionsForRow(index: number, skill?: string): string[] {
    const selectedNames = this.getSelectedProfessionalSkills(skill)
      .map((s) => s.name);
    const current = this.getProfSkillName(index, skill);
    return this.getProfessionalSkillOptions(skill).filter(
      (name) => name === current || !selectedNames.includes(name)
    );
  }

  private getSelectedProfessionalSkills(skill?: string): Skill[] {
    const chosen=[...(this.character?.skills.extraProfessionalCultureSkills || []), ...(this.character?.skills.extraProfessionalCareerSkills || []), this.character?.skills.hobby];
    return this.getProffSkills(skill).filter(
      (s) => s && (s.force || !(!s.careerBonus && !s.cultureBonus && !s.extraBonus) || chosen.some(selected=>selected?.name===s.name))
    );
  }

  getDevotionSkill(): Skill | undefined {
    if (!this.character) {
      return undefined;
    }
    return this.character.skills.skills
      .concat(this.character.skills.hobby)
      .concat(this.character.skills.specialized)
      .concat(this.character.skills.extraProfessionalCultureSkills || [])
      .concat(this.character.skills.extraProfessionalCareerSkills || [])
      .filter((s) => s && s.name.includes('Devotion'))
      .sort(
        (a, b) =>
          Number(this.getStoredSkill(b)) - Number(this.getStoredSkill(a))
      )[0];
  }

  private getCharacterWithCurrentCharacteristics(): Character {
    return withEffectiveCharacteristics(this.character!);
  }

  getDevotion(): number {
    const skill = this.getDevotionSkill();
    if (!skill) {
      return 0;
    }
    return Number(this.getStoredSkill(skill));
  }

  setDevotion(value: any): void { this.setSkill(this.getDevotionSkill(), value); }

  getPassion(index: number): string {
    if (!this.character) {
      return '';
    }
    if (!this.character.passions) {
      this.character.passions = [];
    }
    const passion = this.character.passions[index];
    return passion?.passion || '';
  }

  setPassion(index: number, event: any): void {
    if (!this.character) {
      return;
    }
    if (!this.character.passions[index] && !event.target.value) return;
    if (!this.character.passions[index] && event.target.value)
      this.character.passions[index] = { passion: '', modifierNumber: 0 } as any;
    this.character.passions[index].passion = event.target.value;
  }

  ensurePassion(index: number): CharacterPassions {
    if (!this.character) {
      return {} as CharacterPassions;
    }
    if (!this.character.passions) {
      this.character.passions = [];
    }
    if (!this.character.passions[index]) {
      this.character.passions[index] = new CharacterPassions();
      this.character.passions[index].passion = '';
      this.character.passions[index].modifier = '';
    }
    return this.character.passions[index];
  }

  setPassionObject(index: number, value: string): void {
    const passion = this.ensurePassion(index);
    passion.objectOfPassion = value;
    passion.modifier = this.getPassionModifierText(value);
  }

  getPassionModifierText(objectOfPassion: string | undefined): string {
    if (!objectOfPassion) {
      return '';
    }
    return (
      Passions.find((p) => p.objectOfPassion === objectOfPassion)?.savingPercentage || ''
    );
  }

  getCombatStyles() {
    if (!this.character) {
      return [];
    }
    return getAllCombatStyles(this.character);
  }

  getActiveStyles() {
    return this.getCombatStyles();
  }

  getStyleName(index: number): string {
    const styles = this.getActiveStyles();
    if (styles.length <= index) return '';
    return styles[index].name;
  }

  getStyleWeapons(index: number): string {
    const styles = this.getActiveStyles();
    if (styles.length <= index) return '';
    const weapons = styles[index].weapons;
    return Object.keys(weapons)
      .map((key) => weapons[key].trim())
      .join(', ')
      .replace(/[.]/g, '');
  }

  getStyleTrait(index: number): string {
    const styles = this.getActiveStyles();
    if (styles.length <= index) return '';
    const trait = styles[index].selectedTrait;
    return trait ? trait.name : '';
  }

  getStyleTraitObject(index: number): any | undefined {
    const styles = this.getActiveStyles();
    if (styles.length <= index) return undefined;
    return styles[index].selectedTrait;
  }

  getStyleSource(index: number): string {
    const styles = this.getActiveStyles();
    if (styles.length <= index) return '';
    return styles[index].source || '';
  }

  setStyleNameByValue(value: string, index: number): void {
    this.setStyle({ target: { value } }, index);
  }

  setStyle(value: any, index: number): void {
    const actualStyle = this.getActiveStyles()[index];
    const incoming = (value?.target?.value || '').trim();
    if (!incoming && actualStyle && actualStyle.force) {
      actualStyle.force = false;
      return;
    }

    const foundStyle = this.getCombatStyles().find(
      (style: any) => style.name === incoming
    );
    if (
      foundStyle &&
      !foundStyle.careerBonus &&
      !foundStyle.cultureBonus &&
      !foundStyle.extraBonus
    ) {
      foundStyle.force = true;
    }
  }

  getWeapon(index: number, ranged: boolean): any {
    if (!this.character?.equipment?.weapons) {
      return undefined;
    }
    return this.character.equipment.weapons.filter((w: any) =>
      w && (ranged ? w.ranged : !w.ranged)
    )[index];
  }

  getWeaponRows(ranged: boolean): number[] {
    const length = this.character?.equipment?.weapons?.filter((w: any) =>
      w && (ranged ? w.ranged : !w.ranged)
      )?.length || 0;
    return Array.from({ length }, (_, i) => i);
  }

  getWeaponProp(index: number, ranged: boolean, prop: string): any {
    const weapon = this.getWeapon(index, ranged);
    if (!weapon) {
      return '';
    }
    return weapon[prop] ?? '';
  }

  setWeaponProp(index: number, ranged: boolean, prop: string, event: any): void {
    const weapon = this.getWeapon(index, ranged);
    if (!weapon) {
      return;
    }
    weapon[prop] = event?.target?.value;
  }

  getWeaponTraits(index: number, ranged: boolean): string {
    let traits = this.getWeaponProp(index, ranged, 'traits');
    if (traits === '') {
      traits = [];
    }
    if (!Array.isArray(traits)) return typeof traits==='string' ? traits : '';
    return traits
      .map((t: any) => t.name)
      .filter((t: any) => t && t !== 'name')
      .join(', ');
  }

  getWeaponEffects(index: number, ranged: boolean): string {
    return [
      this.getWeaponProp(index, ranged, 'offensiveSkills'),
      this.getWeaponProp(index, ranged, 'defensiveSkills'),
    ]
      .filter((e) => e)
      .join(', ');
  }

  getWeaponDamage(index: number, ranged: boolean): string {
    const weapon = this.getWeapon(index, ranged);
    if (!weapon) {
      return '';
    }
    return this.formatWeaponDamage(weapon, ranged);
  }

  getWeaponGrip(weapon: CharacterWeapon): string {
    return weapon.equipped ? weapon.grip || 'legacy' : 'stowed';
  }

  getWeaponGrips(weapon: CharacterWeapon): readonly WeaponGrip[] {
    return weaponGrips(weapon);
  }

  gripLabel(weapon: CharacterWeapon): string {
    return this.ru(this.getWeaponGrip(weapon) === 'legacy' ? 'Equipped · unrecorded grip'
      : weapon.grip && weapon.equipped ? this.gripLabels[weapon.grip] : 'Stowed');
  }

  openWeaponCatalog(ranged: boolean, dialog: HTMLDialogElement): void {
    const options = this.weapons.getWeaponsByMode(ranged).map(weapon => ({
      value: weapon.name,
      label: this.ru(weapon.name),
      description: 'Урон ' + (this.formatWeaponDamage(weapon, ranged) || '—'),
    })).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    this.equipmentPicker = {
      title: ranged ? 'Выбрать дальнобойное оружие' : 'Выбрать оружие ближнего боя или щит',
      description: 'Выбранный предмет будет добавлен в снаряжение.',
      searchable: true,
      options,
      select: name => this.addCatalogWeapon(name),
    };
    this.equipmentQuery = '';
    this.weaponMessage = '';
    this.changeDetector.detectChanges();
    dialog.showModal();
  }

  private addCatalogWeapon(name: string): boolean {
    const character = this.character;
    const weapon = this.weapons.createCharacterWeapon(name);
    if (!character || !weapon) return false;
    return this.recordChange(['equipment'], { type: 'Add weapon', target: weapon.name, after: weapon.name }, () => {
      character.equipment.weapons.push(weapon);
      return true;
    }) ?? false;
  }

  openWeaponPicker(weapon: CharacterWeapon, ranged: boolean, dialog: HTMLDialogElement): void {
    const selected = this.getWeaponGrip(weapon);
    this.equipmentPicker = {
      title: 'Хват оружия', current: this.gripLabel(weapon),
      description: (weapon.name || 'Безымянное оружие') + ' · урон ' + (this.formatWeaponDamage(weapon, ranged) || '—'),
      options: [
        ...(selected === 'legacy' ? [{ value:'legacy', label:this.gripLabel(weapon), selected:true }] : []),
        ...this.getWeaponGrips(weapon).map(grip => ({ value:grip, label:this.ru(this.gripLabels[grip]), selected:grip === selected })),
        { value:'stowed', label:'Убрано', description:'Освободить хват', selected:selected === 'stowed' },
      ],
      select: value => this.selectWeaponGrip(weapon, value),
    };
    this.weaponMessage = '';
    dialog.showModal();
  }

  private selectWeaponGrip(weapon: CharacterWeapon, selection: string): boolean {
    if (!this.character || selection === 'legacy') return false;
    const grip = selection === 'stowed' ? null : selection as WeaponGrip;
    this.weaponMessage = this.recordChange(['equipment'], {type:'Weapon grip', target:weapon.name, before:this.getWeaponGrip(weapon),
      after:grip ?? 'stowed'}, () => changeWeaponGrip(this.character!.equipment.weapons, weapon, grip)) ?? '';
    return !this.weaponMessage;
  }

  formatWeaponDamage(weapon: Weapon & Partial<Pick<CharacterWeapon, 'equipped' | 'grip'>>, ranged = false): string {
    if (weapon.damage) {
      return weapon.damage;
    }
    if (ranged && weapon.ranged) return weapon.ranged;
    if (weapon.equipped && weapon.grip) {
      const damage = weapon.grip === 'both' ? weapon.twoHanded : weapon.oneHanded || weapon.shield;
      if (damage) return damage;
    }
    return [
      weapon.oneHanded,
      weapon.twoHanded,
      weapon.shield,
      weapon.unarmed,
      weapon.ranged,
    ]
      .filter((d) => d)
      .join(' / ');
  }

  getEquipmentInfo(): string {
    if (!this.character?.equipment) {
      return '';
    }
    if (!this.character.equipment.equipmentAndArmor) {
      return this.generateEquipmentInfo();
    }
    return this.character.equipment.equipmentAndArmor;
  }

  generateEquipmentInfo(): string {
    if (!this.character?.equipment) {
      return '';
    }
    const eq = this.character.equipment;
    return [
      [
        Object.assign({ loc: 'Head' }, eq.head),
        Object.assign({ loc: 'Chest' }, eq.chest),
        Object.assign({ loc: 'Abdoment' }, eq.abdoment),
        Object.assign({ loc: 'Left Arm' }, eq.leftArm),
        Object.assign({ loc: 'Right Arm' }, eq.rightArm),
        Object.assign({ loc: 'Left Leg' }, eq.leftLeg),
        Object.assign({ loc: 'Right Leg' }, eq.rightLeg),
      ]
        .filter((e: any) => e && e.type)
        .map((e: any) => `${e.loc}-${e.material}-${e.type}`)
        .join(', '),
      (eq.weapons || [])
        .map((w: any) => (w.quantity ? w.quantity : '1') + 'x ' + w.name)
        .join(', '),
      (eq.items || [])
        .map((i: any) => (i.quantity ? i.quantity : '1') + 'x ' + i.name)
        .join(', '),
    ].join('\n');
  }

  setEquipmentInfo(event: any): void {
    if (!this.character?.equipment) {
      return;
    }
    this.character.equipment.equipmentAndArmor = event?.target?.value;
  }

  getEquipmentEnc(): number {
    if (!this.character?.equipment) {
      return 0;
    }
    if (this.character.equipment.equipmentEnc === undefined) {
      return getButArmor(this.character, 'enc');
    }
    return this.character.equipment.equipmentEnc;
  }

  setEquipmentEnc(event: any): void {
    if (!this.character?.equipment) {
      return;
    }
    let value = event?.target?.value;
    if (value === undefined || value === '' || isNaN(value)) {
      value = undefined;
    }
    this.character.equipment.equipmentEnc = value;
  }

  getArmourEnc(): number {
    return this.character ? wornArmourEnc(this.character) : 0;
  }

  setArmourEnc(event: any): void {
    if (!this.character?.equipment) {
      return;
    }
    let value = event?.target?.value;
    if (value === undefined || value === '' || isNaN(value)) {
      value = undefined;
    }
    this.character.equipment.armourEnc = value;
  }

  getTotalEnc(): number {
    if (!this.character?.equipment) {
      return 0;
    }
    if (this.character.equipment.totalEnc === undefined) {
      return getTotalFromItems(this.character, 'enc', true);
    }
    return this.character.equipment.totalEnc;
  }

  setTotalEnc(event: any): void {
    if (!this.character?.equipment) {
      return;
    }
    let value = event?.target?.value;
    if (value === undefined || value === '' || isNaN(value)) {
      value = undefined;
    }
    this.character.equipment.totalEnc = value;
  }

  getArmorPenalty(): number {
    return this.character ? armourPenalty(this.character) : 0;
  }

  getInitiativeWithArmour(): number | string {
    return this.character ? initiativeWithArmour(this.character) : '';
  }

  setArmorPenalty(event: any): void {
    if (!this.character?.equipment) {
      return;
    }
    let value = event?.target?.value;
    if (value === undefined || value === '' || isNaN(value)) {
      value = undefined;
    }
    this.character.equipment.armorPenalty = value;
  }

  getOrCreateBackground(): string {
    if (!this.character) {
      return '';
    }
    return this.character.backgroundOverall || this.generateBackground();
  }

  setBackground(event: any): void {
    if (!this.character) {
      return;
    }
    this.character.backgroundOverall = event?.target?.value || '';
  }

  generateBackground(): string {
    if (!this.character) {
      return '';
    }
    let background = '';
    if (this.character.backgroundEvents) {
      this.character.backgroundEvents.forEach((b: any) => (background += b.text + '\n'));
    }
    if (this.character.family) {
      background += `${this.character.family.parents}, Siblings: ${
        this.character.family.siblings
      }, Grandparents: ${this.character.family.grands}, Uncles/Aunts: ${
        this.character.family.aunts
      }, Cousins: ${this.character.family.cousins}.\n
Reputation: ${this.character.family.reputation}\n
Connections: ${this.character.family.connections ? this.character.family.connections.trim() : ''}\n

${this.character.family.text}\n\n`;
      if (this.character.background) {
        background += `${this.character.background}\n\n`;
      }
    }
    return background.trim();
  }

  getOrCreateContacts(): string {
    if (!this.character) {
      return '';
    }
    return this.character.contactsOverall || this.generateContacts();
  }

  setContacts(event: any): void {
    if (!this.character) {
      return;
    }
    this.character.contactsOverall = event?.target?.value || '';
  }

  generateContacts(): string {
    if (!this.character?.family) {
      return '';
    }
    const family = this.character.family;
    return `Contacts: ${family.contacts}
Allies: ${family.allies}
Rivals: ${family.rivals}
Enemies: ${family.enemies}`.trim();
  }

  getCultInformation(): string {
    if (!this.character) {
      return '';
    }
    if (!this.character.cultOverall) {
      return this.generateCultInformation();
    }
    return this.character.cultOverall;
  }

  generateCultInformation(): string {
    if (!this.character) {
      return '';
    }
    return [
      Object.assign({ cult: 'Brotherhood' }, this.character.brotherhood),
      Object.assign({ cult: 'Animist Cult' }, this.character.animistCult),
      Object.assign({ cult: 'Theism Cult' }, this.character.theistCult),
      Object.assign({ cult: 'Sorcery Order' }, this.character.sorceryOrder),
      Object.assign({ cult: 'Mystical Order' }, this.character.mysticalOrder),
    ]
      .filter((c: any) => c.name)
      .map((c: any) => [c.cult, c.name, c.level].join('\n'))
      .join('\n');
  }

  setCultInformation(event: any): void {
    if (!this.character) {
      return;
    }
    this.character.cultOverall = event?.target?.value || '';
  }

  getReligion(): string {
    if (!this.character) {
      return '';
    }
    if (!this.character.religion) {
      return this.generateReligion();
    }
    return this.character.religion;
  }

  generateReligion(): string {
    if (!this.character) {
      return '';
    }
    return this.character.theistCult?.name ? this.character.theistCult.name : '';
  }

  setReligion(event: any): void {
    if (!this.character) {
      return;
    }
    this.character.religion = event?.target?.value || '';
  }

  getAbilities(): string {
    if (!this.character?.magic) {
      return '';
    }
    if (!this.character.magic.abilities) {
      return this.generateAbilities();
    }
    return this.character.magic.abilities;
  }

  generateAbilities(): string {
    if (!this.character?.magic) {
      return '';
    }
    const magic = [
      this.getMapOrNull(this.character.magic.folk, 'Folk Spells'),
      this.getMapOrNull(this.character.magic.sorcery, 'Sorcery'),
      this.getMapOrNull(this.character.magic.miracles, 'Miracles'),
      (this.character.magic.custom || []).map(ability => ability.name).filter(Boolean).join(', '),
      this.character.magic.spirits
        ? 'Spirits: ' + this.character.magic.spirits
        : undefined,
    ]
      .concat(
        this.character.magic.path
          ? [
              this.getStringMapOrNull(
                this.character.magic.path.augmentations as any,
                'Augmentations'
              ),
              this.getMapOrNull(
                this.character.magic.path.invocations as any,
                'Invocations'
              ),
              this.getMapOrNull(
                this.character.magic.path.enhancements as any,
                'Enhancements'
              ),
            ]
          : []
      )
      .filter((s) => s && s.length > 0)
        .join('\n\n');
    return magic;
  }

  getMapOrNull(list: Spell[] | undefined, title: string): string | undefined {
    return list && list.length
      ? title + ': ' + list.map((s) => s.name).join(', ')
      : undefined;
  }

  getStringMapOrNull(
    list: string[] | undefined,
    title: string
  ): string | undefined {
    return list && list.length ? title + ': ' + list.join(', ') : undefined;
  }

  setAbilities(event: any): void {
    if (!this.character?.magic) {
      return;
    }
    this.character.magic.abilities = event?.target?.value || '';
  }

  getExtraInformation(): string {
    if (!this.character) {
      return '';
    }
    if (!this.character.extraInformation) {
      return this.generateExtraInformation();
    }
    return this.character.extraInformation;
  }

  generateExtraInformation(): string {
    this.traitsRecord = {};
    this.getCombatStyleTraitsDescription();
    this.getWeaponTraitsDescription();
    this.getWeaponEffectsDescription();
    this.getFolkMagicDescription();
    this.getSorceriesDescription();
    this.getMiracleDescription();
    this.getCustomMagicDescription();
    this.getMysticsDescription();
    return Object.keys(this.traitsRecord)
      .map((k) => this.traitsRecord[k])
      .filter((t: any) => t && t.name !== 'name')
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((t: any) =>
        [t['name'], t['tags'], t['description']]
          .filter((s) => s && s.length > 0)
          .join('\n')
      )
      .filter((s: any) => s && s.length)
      .join('\n\n')
      .replace(/[<]table.*[/]table[>]/g, '');
  }

  getCombatStyleTraitsDescription(): void {
    const cs: any[] = this.getActiveStyles();
    if (!cs) {
      return;
    }
    cs.map((w: any) => (w.selectedTrait ? [w.selectedTrait] : w.traits))
      .flat()
      .map((t: any) => {
        return { name: t.name, tags: t.trait };
      })
      .forEach((t: any) => this.addTrait(t));
  }

  getWeaponTraitsDescription(): void {
    if (!this.character?.equipment?.weapons) {
      return;
    }
    this.character.equipment.weapons
      .map((w: any) => w.traits)
      .flat()
      .forEach((t: any) => this.addTrait(t));
  }

  getWeaponEffectsDescription(): void {
    if (!this.character?.equipment?.weapons) {
      return;
    }
    this.character.equipment.weapons
      .map((w: any) =>
        ((w.offensiveSkills || '') + ',' + (w.defensiveSkills || ''))
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s)
      )
      .flat()
      .map((e: string) => this.mapEffect(e))
      .forEach((t: any) => this.addTrait(t));
  }

  getFolkMagicDescription(): void {
    if (!this.character?.magic?.folk) {
      return;
    }
    this.character.magic.folk.forEach((t: any) => this.addTrait(t));
  }

  getSorceriesDescription(): void {
    if (!this.character?.magic?.sorcery) {
      return;
    }
    this.character.magic.sorcery.forEach((t: any) => this.addTrait(t));
  }

  getMiracleDescription(): void {
    if (!this.character?.magic?.miracles) {
      return;
    }
    this.character.magic.miracles.forEach((t: any) => this.addTrait(t));
  }

  getCustomMagicDescription(): void {
    this.character?.magic.custom?.forEach(spell => this.addTrait(spell));
  }

  getMysticsDescription(): void {
    if (!this.character?.magic?.path) {
      return;
    }
    if (this.character.magic.path.enhancements) {
      this.character.magic.path.enhancements.forEach((t: any) => this.addTrait(t));
    }
    if (this.character.magic.path.invocations) {
      this.character.magic.path.invocations.forEach((t: any) => this.addTrait(t));
    }
  }

  mapEffect(effectName: string): any {
    const effect = this.effects.getSpecialEffect(effectName);
    if (!effect) {
      return undefined;
    }
    return {
      name: effect.effect,
      tags: effect.requirement,
      description: effect.traits.join('\n'),
    };
  }

  addTrait(t: any): void {
    if (t && t.name && !this.traitsRecord[t.name]) {
      this.traitsRecord[t.name] = t;
    }
  }

  setExtraInformation(event: any): void {
    if (!this.character) {
      return;
    }
    this.character.extraInformation = event?.target?.value || '';
  }

  @HostListener('document:input')
  @HostListener('document:click')
  @HostListener('document:change')
  onUserInteraction(): void {
    this.saveHandle?.schedule();
  }

  @HostListener('window:beforeunload')
  @HostListener('window:pagehide')
  flushPendingSaves(): void {
    this.saveHandle?.flush();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void { if (document.hidden) this.flushPendingSaves(); }

  ngOnDestroy(): void {
    this.saveHandle?.flush();
    this.saveHandle?.destroy();
  }

  private persistCharacter(): void {
    if (!this.character) {
      return;
    }
    this.storage.saveCharacter(this.character, 'view-character');
  }
}
