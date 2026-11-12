import { Weapon } from './weapon';
export type WeaponGrip = 'main' | 'off' | 'both';
export class CharacterWeapon extends Weapon {
    equipped: boolean;
    grip?: WeaponGrip;
}
