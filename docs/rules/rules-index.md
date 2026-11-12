# Mythras Core Rules — локальный индекс

Англоязычная основная книга *Mythras* Пита Нэша и Лоуренса Уитакера, The Design Mechanism, © 2016.
Выходные данные указаны на [печатной с. 1](Mythras%20-%20core%20rules.pdf#page=2), предисловие датировано маем 2016 на [печатной с. 4](Mythras%20-%20core%20rules.pdf#page=5).
Номер тиража или ревизии PDF по этому экземпляру не установлен.

Локальный источник — [Mythras - core rules.pdf](Mythras%20-%20core%20rules.pdf), 306 страниц PDF.
SHA-256 — `7fee2ced5855abf01b77134ccc14957685a2ed34d3d0985d4f7a2ea120eac735`.

## Поиск

- Печатные страницы 1–304 соответствуют страницам PDF 2–305. При ссылке на правило указывайте печатную страницу. Ссылки в последнем столбце используют номер страницы PDF.
- Из корня проекта ищите по локальному текстовому слою. Имя файла сразу показывает оба номера. Например, `pdf-095_book-094.txt` соответствует печатной с. 94.

```powershell
rg --no-ignore -in -- 'Damage Reduction|Attacks and Parries|Closing Range' tmp/rules/mythras-core-pages
```

- На каждой найденной странице сверяйте формулировку, числа и расположение строк таблиц с оригинальным PDF. Текст извлечён с помощью PDFium без OCR и исправления слов. Часть лигатур пропущена, а колонки и строки таблиц могут читаться в другом порядке. Если точная фраза не находится, ищите по отдельным словам или по оглавлению ниже.
- Обложки (PDF 1 и 306) не имеют извлекаемого текста. Бланки на печатных с. 302–304 (PDF 303–305) извлекаются только с колонтитулами. Для этих страниц используйте просмотр PDF.
- Книга и извлечённый текст исключены из Git. Полный текст хранится в игнорируемой папке `tmp/rules/mythras-core-pages/` вне каталога публикации `docs/`. Сборка `build:pages` пересоздаёт `docs/`. Запускайте её в отдельной рабочей копии без локальных PDF.

## Частые ссылки для разработки

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Calculating Characteristics / Attributes | 8 | [9](Mythras%20-%20core%20rules.pdf#page=9) |
| Damage Modifier | 9 | [10](Mythras%20-%20core%20rules.pdf#page=10) |
| Hit Points / Initiative Bonus / Luck Points / Magic Points | 10 | [11](Mythras%20-%20core%20rules.pdf#page=11) |
| How Skills Work / Criticals and Fumbles | 37 | [38](Mythras%20-%20core%20rules.pdf#page=38) |
| Modifying Skills | 38 | [39](Mythras%20-%20core%20rules.pdf#page=39) |
| Opposed Rolls | 50 | [51](Mythras%20-%20core%20rules.pdf#page=51) |
| Differential Rolls | 51 | [52](Mythras%20-%20core%20rules.pdf#page=52) |
| Armour Penalty to Initiative | 58 | [59](Mythras%20-%20core%20rules.pdf#page=59) |
| Initiative / Calculating Initiative | 90 | [91](Mythras%20-%20core%20rules.pdf#page=91) |
| Change Range | 91 | [92](Mythras%20-%20core%20rules.pdf#page=92) |
| Parry | 92 | [93](Mythras%20-%20core%20rules.pdf#page=93) |
| Ward Location / Weapon Size and Reach | 93 | [94](Mythras%20-%20core%20rules.pdf#page=94) |
| Weapon Size Categories / Weapon Reach Categories | 94 | [95](Mythras%20-%20core%20rules.pdf#page=95) |
| Attacks and Parries / Damage Reduction / Parrying a Missed Attack | 94 | [95](Mythras%20-%20core%20rules.pdf#page=95) |
| Unable or Unwilling to Parry / Special Effects | 95 | [96](Mythras%20-%20core%20rules.pdf#page=96) |
| Close Range (Special Effect) | 97 | [98](Mythras%20-%20core%20rules.pdf#page=98) |
| Open Range (Special Effect) | 98 | [99](Mythras%20-%20core%20rules.pdf#page=99) |
| Passive Blocking | 105 | [106](Mythras%20-%20core%20rules.pdf#page=106) |
| Weapon Reach – Closing and Opening Range / Fighting at the Longer Reach / Fighting at the Shorter Reach | 106 | [107](Mythras%20-%20core%20rules.pdf#page=107) |
| Closing Range / Opening Range | 107 | [108](Mythras%20-%20core%20rules.pdf#page=108) |
| Hit Locations | 109 | [110](Mythras%20-%20core%20rules.pdf#page=110) |
| Armed Combat Considerations | 222 | [223](Mythras%20-%20core%20rules.pdf#page=223) |

## Оглавление

Заголовки и начальные страницы сверены с печатным оглавлением [на с. 2](Mythras%20-%20core%20rules.pdf#page=3) и [на с. 3](Mythras%20-%20core%20rules.pdf#page=4).

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Передняя обложка | — | [1](Mythras%20-%20core%20rules.pdf#page=1) |
| Титульная страница и выходные данные | 1 | [2](Mythras%20-%20core%20rules.pdf#page=2) |
| Contents | 2 | [3](Mythras%20-%20core%20rules.pdf#page=3) |

### Introduction

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Introduction | 4 | [5](Mythras%20-%20core%20rules.pdf#page=5) |
| Organisation | 4 | [5](Mythras%20-%20core%20rules.pdf#page=5) |
| Glossary of Terms | 5 | [6](Mythras%20-%20core%20rules.pdf#page=6) |

### 1. Characters

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Characters | 6 | [7](Mythras%20-%20core%20rules.pdf#page=7) |
| Designing A Character | 6 | [7](Mythras%20-%20core%20rules.pdf#page=7) |
| Characteristics | 6 | [7](Mythras%20-%20core%20rules.pdf#page=7) |
| Calculating Characteristics | 8 | [9](Mythras%20-%20core%20rules.pdf#page=9) |
| Attributes | 8 | [9](Mythras%20-%20core%20rules.pdf#page=9) |
| Standard Skills | 11 | [12](Mythras%20-%20core%20rules.pdf#page=12) |

### 2. Culture & Community

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Culture & Community | 13 | [14](Mythras%20-%20core%20rules.pdf#page=14) |
| Culture | 13 | [14](Mythras%20-%20core%20rules.pdf#page=14) |
| Barbarian | 14 | [15](Mythras%20-%20core%20rules.pdf#page=15) |
| Civilised | 14 | [15](Mythras%20-%20core%20rules.pdf#page=15) |
| Nomadic | 15 | [16](Mythras%20-%20core%20rules.pdf#page=16) |
| Primitive | 16 | [17](Mythras%20-%20core%20rules.pdf#page=17) |
| Background Events | 17 | [18](Mythras%20-%20core%20rules.pdf#page=18) |
| Community | 21 | [22](Mythras%20-%20core%20rules.pdf#page=22) |
| Families | 21 | [22](Mythras%20-%20core%20rules.pdf#page=22) |
| Allies, Contacts, Rivals and Enemies | 22 | [23](Mythras%20-%20core%20rules.pdf#page=23) |
| Passions | 22 | [23](Mythras%20-%20core%20rules.pdf#page=23) |

### 3. Careers

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Careers | 28 | [29](Mythras%20-%20core%20rules.pdf#page=29) |
| Age | 33 | [34](Mythras%20-%20core%20rules.pdf#page=34) |
| Bonus Skill Points | 34 | [35](Mythras%20-%20core%20rules.pdf#page=35) |
| Starting Equipment | 34 | [35](Mythras%20-%20core%20rules.pdf#page=35) |
| Magic | 35 | [36](Mythras%20-%20core%20rules.pdf#page=36) |
| Cult Membership | 36 | [37](Mythras%20-%20core%20rules.pdf#page=37) |

### 4. Skills

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Skills | 37 | [38](Mythras%20-%20core%20rules.pdf#page=38) |
| How Skills Work | 37 | [38](Mythras%20-%20core%20rules.pdf#page=38) |
| Standard Skills | 38 | [39](Mythras%20-%20core%20rules.pdf#page=39) |
| Professional Skills | 44 | [45](Mythras%20-%20core%20rules.pdf#page=45) |
| Different Situations | 50 | [51](Mythras%20-%20core%20rules.pdf#page=51) |
| Skills Summaries | 53 | [54](Mythras%20-%20core%20rules.pdf#page=54) |

### 5. Economics & Equipment

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Economics & Equipment | 54 | [55](Mythras%20-%20core%20rules.pdf#page=55) |
| Income, Living Standards and Class | 54 | [55](Mythras%20-%20core%20rules.pdf#page=55) |
| Bartering and Haggling | 55 | [56](Mythras%20-%20core%20rules.pdf#page=56) |
| Equipment | 56 | [57](Mythras%20-%20core%20rules.pdf#page=57) |
| Armour | 57 | [58](Mythras%20-%20core%20rules.pdf#page=58) |
| Accommodation | 58 | [59](Mythras%20-%20core%20rules.pdf#page=59) |
| Clothing | 59 | [60](Mythras%20-%20core%20rules.pdf#page=60) |
| Food | 59 | [60](Mythras%20-%20core%20rules.pdf#page=60) |
| Livestock | 59 | [60](Mythras%20-%20core%20rules.pdf#page=60) |
| Tools | 60 | [61](Mythras%20-%20core%20rules.pdf#page=61) |
| Melee Weapons | 61 | [62](Mythras%20-%20core%20rules.pdf#page=62) |
| Ranged Weapons | 61 | [62](Mythras%20-%20core%20rules.pdf#page=62) |
| Siege Weapons | 62 | [63](Mythras%20-%20core%20rules.pdf#page=63) |
| Vehicles | 62 | [63](Mythras%20-%20core%20rules.pdf#page=63) |
| One Handed Weapons | 63 | [64](Mythras%20-%20core%20rules.pdf#page=64) |
| Shields | 63 | [64](Mythras%20-%20core%20rules.pdf#page=64) |
| Two Handed Weapons | 64 | [65](Mythras%20-%20core%20rules.pdf#page=65) |
| Siege Weapons | 64 | [65](Mythras%20-%20core%20rules.pdf#page=65) |
| Vehicles | 64 | [65](Mythras%20-%20core%20rules.pdf#page=65) |
| Equipment Manufacturing and Quality | 65 | [66](Mythras%20-%20core%20rules.pdf#page=66) |
| Ranged Weapons | 65 | [66](Mythras%20-%20core%20rules.pdf#page=66) |

### 6. Game System

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Game System | 68 | [69](Mythras%20-%20core%20rules.pdf#page=69) |
| Acid | 68 | [69](Mythras%20-%20core%20rules.pdf#page=69) |
| Action, Time and Movement | 69 | [70](Mythras%20-%20core%20rules.pdf#page=70) |
| Ageing | 70 | [71](Mythras%20-%20core%20rules.pdf#page=71) |
| Asphyxiation, Drowning and Suffocation | 71 | [72](Mythras%20-%20core%20rules.pdf#page=72) |
| Blood Loss | 71 | [72](Mythras%20-%20core%20rules.pdf#page=72) |
| Character Improvement | 71 | [72](Mythras%20-%20core%20rules.pdf#page=72) |
| Disease and Poison | 74 | [75](Mythras%20-%20core%20rules.pdf#page=75) |
| Encumbrance | 77 | [78](Mythras%20-%20core%20rules.pdf#page=78) |
| Falling | 78 | [79](Mythras%20-%20core%20rules.pdf#page=79) |
| Fatigue | 78 | [79](Mythras%20-%20core%20rules.pdf#page=79) |
| Fires | 79 | [80](Mythras%20-%20core%20rules.pdf#page=80) |
| Healing from Injury | 80 | [81](Mythras%20-%20core%20rules.pdf#page=81) |
| Inanimate Objects | 81 | [82](Mythras%20-%20core%20rules.pdf#page=82) |
| Luck Points | 81 | [82](Mythras%20-%20core%20rules.pdf#page=82) |
| Passions | 82 | [83](Mythras%20-%20core%20rules.pdf#page=83) |
| Survival | 82 | [83](Mythras%20-%20core%20rules.pdf#page=83) |
| Traps | 82 | [83](Mythras%20-%20core%20rules.pdf#page=83) |
| Visibility | 84 | [85](Mythras%20-%20core%20rules.pdf#page=85) |
| Weather | 84 | [85](Mythras%20-%20core%20rules.pdf#page=85) |

### 7. Combat

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Combat | 86 | [87](Mythras%20-%20core%20rules.pdf#page=87) |
| Components of Combat | 86 | [87](Mythras%20-%20core%20rules.pdf#page=87) |
| Combat Styles | 86 | [87](Mythras%20-%20core%20rules.pdf#page=87) |
| Combat Rounds | 88 | [89](Mythras%20-%20core%20rules.pdf#page=89) |
| Weapon Size and Reach | 93 | [94](Mythras%20-%20core%20rules.pdf#page=94) |
| How Combat Works | 94 | [95](Mythras%20-%20core%20rules.pdf#page=95) |
| Special Effects | 95 | [96](Mythras%20-%20core%20rules.pdf#page=96) |
| Special Effects Summary | 100 | [101](Mythras%20-%20core%20rules.pdf#page=101) |
| Close Combat | 101 | [102](Mythras%20-%20core%20rules.pdf#page=102) |
| Ranged Combat | 107 | [108](Mythras%20-%20core%20rules.pdf#page=108) |
| Hit Locations | 109 | [110](Mythras%20-%20core%20rules.pdf#page=110) |
| Optional Rules: Rabble & Underlings | 111 | [112](Mythras%20-%20core%20rules.pdf#page=112) |

### 8. Magic

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Magic | 112 | [113](Mythras%20-%20core%20rules.pdf#page=113) |
| Tailoring Magic | 112 | [113](Mythras%20-%20core%20rules.pdf#page=113) |
| Magical Disciplines | 112 | [113](Mythras%20-%20core%20rules.pdf#page=113) |
| Magical Traditions | 113 | [114](Mythras%20-%20core%20rules.pdf#page=114) |
| How Many Abilities? | 114 | [115](Mythras%20-%20core%20rules.pdf#page=115) |
| Ritualistic Casting Times | 115 | [116](Mythras%20-%20core%20rules.pdf#page=116) |
| Magical Energy | 115 | [116](Mythras%20-%20core%20rules.pdf#page=116) |
| Characters & Magic | 118 | [119](Mythras%20-%20core%20rules.pdf#page=119) |
| Using Magic | 119 | [120](Mythras%20-%20core%20rules.pdf#page=120) |

### 9. Folk Magic

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Folk Magic | 121 | [122](Mythras%20-%20core%20rules.pdf#page=122) |
| The Nature of Folk Magic | 121 | [122](Mythras%20-%20core%20rules.pdf#page=122) |
| Access to Folk Magic | 121 | [122](Mythras%20-%20core%20rules.pdf#page=122) |
| Ubiquitous Folk Magic | 122 | [123](Mythras%20-%20core%20rules.pdf#page=123) |
| Using Folk Magic | 122 | [123](Mythras%20-%20core%20rules.pdf#page=123) |
| Folk Magic Spells | 123 | [124](Mythras%20-%20core%20rules.pdf#page=124) |
| Spells | 123 | [124](Mythras%20-%20core%20rules.pdf#page=124) |

### 10. Animism

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Animism | 130 | [131](Mythras%20-%20core%20rules.pdf#page=131) |
| Trance and Binding | 130 | [131](Mythras%20-%20core%20rules.pdf#page=131) |
| Spirit Societies, Cults & Traditions | 131 | [132](Mythras%20-%20core%20rules.pdf#page=132) |
| Defining Spirits | 132 | [133](Mythras%20-%20core%20rules.pdf#page=133) |
| Locating and Gaining Spirits | 134 | [135](Mythras%20-%20core%20rules.pdf#page=135) |
| Using Spirits | 136 | [137](Mythras%20-%20core%20rules.pdf#page=137) |
| Spirit Combat | 137 | [138](Mythras%20-%20core%20rules.pdf#page=138) |
| Animism Tricks | 140 | [141](Mythras%20-%20core%20rules.pdf#page=141) |
| Spirit Types | 142 | [143](Mythras%20-%20core%20rules.pdf#page=143) |

### 11. Mysticism

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Mysticism | 154 | [155](Mythras%20-%20core%20rules.pdf#page=155) |
| Seeking the Truth Within | 154 | [155](Mythras%20-%20core%20rules.pdf#page=155) |
| Paths and Talents | 155 | [156](Mythras%20-%20core%20rules.pdf#page=156) |
| Starting Mystics | 155 | [156](Mythras%20-%20core%20rules.pdf#page=156) |
| Using Mysticism | 156 | [157](Mythras%20-%20core%20rules.pdf#page=157) |
| Talent Descriptions | 157 | [158](Mythras%20-%20core%20rules.pdf#page=158) |

### 12. Sorcery

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Sorcery | 161 | [162](Mythras%20-%20core%20rules.pdf#page=162) |
| Manipulating the Cosmos | 161 | [162](Mythras%20-%20core%20rules.pdf#page=162) |
| Schools and Spells | 163 | [164](Mythras%20-%20core%20rules.pdf#page=164) |
| Using Sorcery | 164 | [165](Mythras%20-%20core%20rules.pdf#page=165) |
| Spell Descriptions | 165 | [166](Mythras%20-%20core%20rules.pdf#page=166) |

### 13. Theism

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Theism | 178 | [179](Mythras%20-%20core%20rules.pdf#page=179) |
| Calling on the Gods | 178 | [179](Mythras%20-%20core%20rules.pdf#page=179) |
| Cults and Miracles | 179 | [180](Mythras%20-%20core%20rules.pdf#page=180) |
| Using Theism | 180 | [181](Mythras%20-%20core%20rules.pdf#page=181) |
| Miracle Descriptions | 182 | [183](Mythras%20-%20core%20rules.pdf#page=183) |
| Miracles by Cult Rank | 190 | [191](Mythras%20-%20core%20rules.pdf#page=191) |

### 14. Cults & Brotherhoods

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Cults & Brotherhoods | 192 | [193](Mythras%20-%20core%20rules.pdf#page=193) |
| Cults | 192 | [193](Mythras%20-%20core%20rules.pdf#page=193) |
| Brotherhoods | 193 | [194](Mythras%20-%20core%20rules.pdf#page=194) |
| Why Join? | 194 | [195](Mythras%20-%20core%20rules.pdf#page=195) |
| Membership | 195 | [196](Mythras%20-%20core%20rules.pdf#page=196) |
| Availability by Culture | 196 | [197](Mythras%20-%20core%20rules.pdf#page=197) |
| Progression | 196 | [197](Mythras%20-%20core%20rules.pdf#page=197) |
| Ranks | 196 | [197](Mythras%20-%20core%20rules.pdf#page=197) |
| Benefits | 199 | [200](Mythras%20-%20core%20rules.pdf#page=200) |
| Restrictions | 201 | [202](Mythras%20-%20core%20rules.pdf#page=202) |
| Sample Gifts | 202 | [203](Mythras%20-%20core%20rules.pdf#page=203) |
| Other Aspects | 205 | [206](Mythras%20-%20core%20rules.pdf#page=206) |
| Cult and Brotherhood Centres | 205 | [206](Mythras%20-%20core%20rules.pdf#page=206) |
| Sample Organisations | 206 | [207](Mythras%20-%20core%20rules.pdf#page=207) |
| Example Organisations | 210 | [211](Mythras%20-%20core%20rules.pdf#page=211) |

### 15. Creatures

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Creatures | 214 | [215](Mythras%20-%20core%20rules.pdf#page=215) |
| Intelligence and Instinct | 214 | [215](Mythras%20-%20core%20rules.pdf#page=215) |
| Creature Abilities | 214 | [215](Mythras%20-%20core%20rules.pdf#page=215) |
| Creatures as Characters | 218 | [219](Mythras%20-%20core%20rules.pdf#page=219) |
| The Statistics Block | 219 | [220](Mythras%20-%20core%20rules.pdf#page=220) |
| Creature Competence | 219 | [220](Mythras%20-%20core%20rules.pdf#page=220) |
| Armed Combat Considerations | 222 | [223](Mythras%20-%20core%20rules.pdf#page=223) |
| Designing Your Own Creatures | 223 | [224](Mythras%20-%20core%20rules.pdf#page=224) |
| Creatures | 224 | [225](Mythras%20-%20core%20rules.pdf#page=225) |
| Chaos Features | 275 | [276](Mythras%20-%20core%20rules.pdf#page=276) |
| Non-Human Hit Locations | 276 | [277](Mythras%20-%20core%20rules.pdf#page=277) |

### 16. Games Mastery

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Games Mastery | 278 | [279](Mythras%20-%20core%20rules.pdf#page=279) |
| This is Your Game | 278 | [279](Mythras%20-%20core%20rules.pdf#page=279) |
| The Petersen Rules of Good Gaming | 278 | [279](Mythras%20-%20core%20rules.pdf#page=279) |
| Preparation and Game Aids | 279 | [280](Mythras%20-%20core%20rules.pdf#page=280) |
| Creating Characters | 280 | [281](Mythras%20-%20core%20rules.pdf#page=281) |
| Investigations | 282 | [283](Mythras%20-%20core%20rules.pdf#page=283) |
| Using Passions | 282 | [283](Mythras%20-%20core%20rules.pdf#page=283) |
| Combat | 283 | [284](Mythras%20-%20core%20rules.pdf#page=284) |
| Social Conflict | 287 | [288](Mythras%20-%20core%20rules.pdf#page=288) |
| Using Traps | 288 | [289](Mythras%20-%20core%20rules.pdf#page=289) |
| Creatures as Player Characters | 289 | [290](Mythras%20-%20core%20rules.pdf#page=290) |
| Magic | 289 | [290](Mythras%20-%20core%20rules.pdf#page=290) |
| Cults and Brotherhoods in the Campaign | 290 | [291](Mythras%20-%20core%20rules.pdf#page=291) |

### Index

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Index | 294 | [295](Mythras%20-%20core%20rules.pdf#page=295) |
| Последняя страница предметного указателя | 300 | [301](Mythras%20-%20core%20rules.pdf#page=301) |

### Appendix: Play Aids

| Раздел | Стр. книги | Стр. PDF |
|---|---:|---:|
| Appendix: Play Aids | 301 | [302](Mythras%20-%20core%20rules.pdf#page=302) |
| Лист персонажа, лицевая сторона | 302 | [303](Mythras%20-%20core%20rules.pdf#page=303) |
| Лист персонажа, оборотная сторона | 303 | [304](Mythras%20-%20core%20rules.pdf#page=304) |
| Combat Tracking Sheet | 304 | [305](Mythras%20-%20core%20rules.pdf#page=305) |
| Задняя обложка | — | [306](Mythras%20-%20core%20rules.pdf#page=306) |
