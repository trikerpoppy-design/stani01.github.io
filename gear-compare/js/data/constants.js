'use strict';


// One-handed: dagger, sword, mace, revolver
// Two-handed: everything else
var WEAPON_TYPES = {
    dagger:     { name: 'Dagger',      icon: '../assets/icons/icon_item_equip_dagger_f01.png', twoHanded: false },
    sword:      { name: 'Sword',       icon: '../assets/icons/icon_item_equip_sword_f01.png', twoHanded: false },
    mace:       { name: 'Mace',        icon: '../assets/icons/icon_item_equip_mace_f01.png', twoHanded: false },
    revolver:   { name: 'Revolver',    icon: '../assets/icons/icon_item_equip_gun_f01.png', twoHanded: false },
    greatsword: { name: 'Greatsword',  icon: '../assets/icons/icon_item_equip_2hsword_f01.png', twoHanded: true },
    polearm:    { name: 'Polearm',     icon: '../assets/icons/icon_item_equip_polearm_f01.png', twoHanded: true },
    bow:        { name: 'Bow',         icon: '../assets/icons/icon_item_equip_bow_f01.png', twoHanded: true },
    staff:      { name: 'Staff',       icon: '../assets/icons/icon_item_equip_staff_f01.png', twoHanded: true },
    paintRings: { name: 'Paint Rings', icon: '../assets/icons/icon_item_equip_spray_f01.png', twoHanded: true },
    orb:        { name: 'Orb',         icon: '../assets/icons/icon_item_equip_orb_f01.png', twoHanded: true },
    spellbook:  { name: 'Spellbook',   icon: '../assets/icons/icon_item_equip_book_f01.png', twoHanded: true },
    aetherKey:  { name: 'Aether Key',  icon: '../assets/icons/icon_item_equip_keyblade_f01.png', twoHanded: true },
    cannon:     { name: 'Cannon',      icon: '../assets/icons/icon_item_equip_cannon_f01.png', twoHanded: true },
    harp:       { name: 'Harp',        icon: '../assets/icons/icon_item_equip_harp_f01.png', twoHanded: true }
};

// Shield-compatible main-hand weapons
var SHIELD_WEAPONS = ['dagger', 'sword', 'mace'];

// Get effective off-hand type for a profile (off-hand weapon/fuse disabled when main hand is none)
function getEffectiveOffHandType(profile) {
    if (profile.mainWeapon.set === 'none' && weaponConfig.offHandType !== 'shield') return 'none';
    return weaponConfig.offHandType;
}


// Compute allowed off-hand types for a given main weapon + class
function getAllowedOffHand(mainType, className) {
    var is2H = WEAPON_TYPES[mainType].twoHanded;
    if (is2H) return ['none', 'fuse'];
    if (mainType === 'mace') return ['none', 'shield'];
    if (mainType === 'sword' && className === 'templar') return ['none', 'shield'];
    var opts = ['none', 'weapon'];
    if (SHIELD_WEAPONS.indexOf(mainType) !== -1) opts.push('shield');
    return opts;
}

// Compute default off-hand type when switching main weapon
function getDefaultOffHand(mainType, className) {
    var is2H = WEAPON_TYPES[mainType].twoHanded;
    if (is2H) return 'fuse';
    if (mainType === 'mace') return 'shield';
    if (mainType === 'sword' && className === 'templar') return 'shield';
    return 'weapon';
}

// Compute default off-hand weapon type based on main weapon
function getDefaultOffHandWeapon(mainType, className) {
    if (mainType === 'dagger') return 'sword';
    var cls = CLASS_DATA[className];
    var oneHanded = cls.weapons.filter(function(w) { return !WEAPON_TYPES[w].twoHanded; });
    return oneHanded[0] || cls.weapons[0];
}

var SHIELD_ICON = '../assets/icons/icon_item_equip_shield_f01.png';
var NONE_ICON   = '../assets/icons/icon_frame_2.png';

// Build flat list of off-hand choices: [{key, icon, label}]
// key format: 'none', 'shield', 'fuse', 'weapon:dagger', 'weapon:sword', etc.
function getOffHandChoices(mainType, className) {
    var choices = [];
    var allowed = getAllowedOffHand(mainType, className);
    choices.push({ key: 'none', icon: NONE_ICON, label: 'None' });
    if (allowed.indexOf('shield') !== -1) {
        choices.push({ key: 'shield', icon: SHIELD_ICON, label: 'Shield' });
    }
    if (allowed.indexOf('fuse') !== -1) {
        choices.push({ key: 'fuse', icon: WEAPON_TYPES[mainType].icon, label: 'Fuse' });
    }
    if (allowed.indexOf('weapon') !== -1) {
        var cls = CLASS_DATA[className];
        var oneHanded = cls.weapons.filter(function(w) { return !WEAPON_TYPES[w].twoHanded; });
        oneHanded.forEach(function(wKey) {
            choices.push({ key: 'weapon:' + wKey, icon: WEAPON_TYPES[wKey].icon, label: WEAPON_TYPES[wKey].name });
        });
    }
    return choices;
}

// Get current off-hand choice key from weaponConfig
function getCurrentOffHandKey() {
    if (weaponConfig.offHandType === 'weapon') return 'weapon:' + weaponConfig.offHandWeaponType;
    return weaponConfig.offHandType;
}

// Armor slots (matches Excel order)
var ARMOR_SLOTS = [
    { key: 'shoulders', iconKey: 'shoulder' },
    { key: 'helmet',    iconKey: 'head' },
    { key: 'chest',     iconKey: 'torso' },
    { key: 'pants',     iconKey: 'pants' },
    { key: 'gloves',    iconKey: 'glove' },
    { key: 'boots',     iconKey: 'shoes' }
];

// Armor material -> icon URL prefix
var ARMOR_MAT_PREFIX = { plate: 'pl', chain: 'ch', leather: 'lt', cloth: 'rb' };

function getArmorIcon(material, slotIconKey) {
    return '../assets/icons/icon_item_equip_' + ARMOR_MAT_PREFIX[material] + '_' + slotIconKey + '_f01.png';
}
function getArmorMaterial(armorType) {
    return armorType.split('-')[1]; // 'physical-plate' -> 'plate'
}

var ARMOR_TYPE_OPTIONS = [
    { key: 'physical-plate',   name: 'Phys. Plate',   material: 'plate' },
    { key: 'magical-plate',    name: 'Mag. Plate',    material: 'plate' },
    { key: 'physical-chain',   name: 'Phys. Chain',   material: 'chain' },
    { key: 'magical-chain',    name: 'Mag. Chain',    material: 'chain' },
    { key: 'physical-leather', name: 'Phys. Leather', material: 'leather' },
    { key: 'magical-leather',  name: 'Mag. Leather',  material: 'leather' },
    { key: 'physical-cloth',   name: 'Phys. Cloth',   material: 'cloth' },
    { key: 'magical-cloth',    name: 'Mag. Cloth',    material: 'cloth' }
];

var ARMOR_SETS = [
    { key: 'none',            name: 'None' },
    { key: 'fighting-spirit', name: 'Fighting Spirit' },
    { key: 'acrimony',        name: 'Acrimony' },
    { key: 'presumption',     name: 'Presumption' },
    { key: 'obstinacy',       name: 'Obstinacy', slots: ['helmet', 'pants', 'gloves'] }
];

var EMPTY_ARMOR_ICON = '../assets/icons/icon_empty_slot.svg';

// Per-slot empty icons
var EMPTY_SLOT_ICONS = {
    // Weapons
    mainWeapon:  EMPTY_ARMOR_ICON,
    offHand:     EMPTY_ARMOR_ICON,
    shield:      EMPTY_ARMOR_ICON,
    // Armor
    shoulders:   EMPTY_ARMOR_ICON,
    helmet:      EMPTY_ARMOR_ICON,
    chest:       EMPTY_ARMOR_ICON,
    pants:       EMPTY_ARMOR_ICON,
    gloves:      EMPTY_ARMOR_ICON,
    boots:       EMPTY_ARMOR_ICON,
    // Accessories
    feather:     EMPTY_ARMOR_ICON,
    wings:       EMPTY_ARMOR_ICON,
    bracelet:    EMPTY_ARMOR_ICON,
    earring1:    EMPTY_ARMOR_ICON,
    earring2:    EMPTY_ARMOR_ICON,
    necklace:    EMPTY_ARMOR_ICON,
    ring1:       EMPTY_ARMOR_ICON,
    ring2:       EMPTY_ARMOR_ICON,
    belt:        EMPTY_ARMOR_ICON,
    // Glyph
    glyph:       EMPTY_ARMOR_ICON
};

function getEmptySlotIcon(slotKey) {
    return EMPTY_SLOT_ICONS[slotKey] || EMPTY_ARMOR_ICON;
}

var WEAPON_SETS = [
    { key: 'none',            name: 'None' },
    { key: 'acrimony',        name: 'Acrimony' },
    { key: 'presumption',     name: 'Presumption' },
    { key: 'salvation',       name: 'Salvation (Upgraded FS)' },
    { key: 'fighting-spirit', name: 'Fighting Spirit' },
    { key: 'spiked',          name: 'Spiked (PvP)' },
    { key: 'ciclonica-helper',name: 'Ciclonica/Helper (PvE)' },
    { key: 'jorgoth-t4-v1',   name: 'Jorgoth T4 v1' },
    { key: 'jorgoth-t4-v2',   name: 'Jorgoth T4 v2' },
    { key: 'jorgoth-t4-v3',   name: 'Jorgoth T4 v3' },
    { key: 'jorgoth-t3-v1',   name: 'Jorgoth T3 v1' },
    { key: 'jorgoth-t3-v2',   name: 'Jorgoth T3 v2' },
    { key: 'jorgoth-t3-v3',   name: 'Jorgoth T3 v3' },
    { key: 'vision',          name: 'Vision' }
];

// Weapon set levels used for fuse eligibility.
// Rule: for 2H fuse, off-hand set level cannot be higher than main-hand set level.
var WEAPON_SET_LEVELS = {
    'acrimony': 80,
    'presumption': 80,
    'jorgoth-t3-v1': 80,
    'jorgoth-t3-v2': 80,
    'jorgoth-t3-v3': 80,
    'jorgoth-t4-v1': 81,
    'jorgoth-t4-v2': 81,
    'jorgoth-t4-v3': 81,
    'fighting-spirit': 81,
    'salvation': 83,
    'spiked': 80,
    'ciclonica-helper': 80,
    'vision': 80,
    'none': 0
};

// Sets that are main-hand exclusive (not available for off-hand/fuse)
var OFFHAND_EXCLUDED_SETS = ['acrimony', 'presumption', 'vision'];

// Sets available only for off-hand/fuse (not main-hand)
var MAINHAND_EXCLUDED_SETS = ['jorgoth-t3-v1', 'jorgoth-t3-v2', 'jorgoth-t3-v3'];

function getWeaponSetLevel(setKey) {
    return WEAPON_SET_LEVELS[setKey] || 0;
}

function isOffHandSetAllowed(mainSetKey, offHandSetKey, mainType, offHandType) {
    if (!offHandSetKey || WEAPON_SET_KEYS.indexOf(offHandSetKey) === -1) return false;
    if (OFFHAND_EXCLUDED_SETS.indexOf(offHandSetKey) !== -1) return false;

    var mainWeapon = WEAPON_TYPES[mainType];
    var isFuse = offHandType === 'fuse';
    if (!mainWeapon || !isFuse || !mainWeapon.twoHanded) return true;

    var mainLv = getWeaponSetLevel(mainSetKey);
    var offLv = getWeaponSetLevel(offHandSetKey);
    if (!mainLv || !offLv) return true;
    return offLv <= mainLv;
}

function getAllowedOffHandWeaponSets(mainSetKey, mainType, offHandType) {
    return WEAPON_SETS.filter(function(ws) {
        return isOffHandSetAllowed(mainSetKey, ws.key, mainType, offHandType);
    });
}

function getDefaultOffHandSet(mainSetKey, mainType, offHandType) {
    var allowedSets = getAllowedOffHandWeaponSets(mainSetKey, mainType, offHandType);
    var preferred = allowedSets.find(function(ws) { return ws.key === 'fighting-spirit'; });
    if (preferred) return preferred.key;
    var firstReal = allowedSets.find(function(ws) { return ws.key !== 'none'; });
    return firstReal ? firstReal.key : 'none';
}

var OATH_OPTIONS = [
    { key: 'none',         name: 'None',         rank: 0 },
    { key: 'silent-skill', name: 'Silent Skill', rank: 0 },
    { key: 'legendary-1',  name: 'Legendary 1',  rank: 1 },
    { key: 'legendary-2',  name: 'Legendary 2',  rank: 2 },
    { key: 'legendary-3',  name: 'Legendary 3',  rank: 3 },
    { key: 'ultimate-1',   name: 'Ultimate 1',   rank: 4 },
    { key: 'ultimate-2',   name: 'Ultimate 2',   rank: 5 },
    { key: 'ultimate-3',   name: 'Ultimate 3',   rank: 6 }
];

// -- Manastone System --
var MANASTONE_ICON = '../assets/icons/icon_item_matter_option_f01.png';
var EMPTY_SLOT_ICON = '../assets/icons/icon_option_slot.png';

var MANASTONES = [
    { key: 'attack',      name: 'Attack',       stat: 'attack',      value: 23 },
    { key: 'crit',        name: 'Crit',         stat: 'crit',        value: 86 },
    { key: 'accuracy',    name: 'Accuracy',     stat: 'accuracy',    value: 94 },
    { key: 'hp',          name: 'HP',            stat: 'hp',          value: 290 },
    { key: 'evasion',     name: 'Evasion',      stat: 'evasion',     value: 94 },
    { key: 'healBoost',   name: 'Healing Boost', stat: 'healingBoost', value: 12 },
    { key: 'pdef',        name: 'Physical Def',  stat: 'physicalDef', value: 24 },
    { key: 'mdef',        name: 'Magical Def',   stat: 'magicalDef',  value: 24 },
    { key: 'magicResist', name: 'Magic Resist',  stat: 'magicResist', value: 94 },
    { key: 'block',       name: 'Block',         stat: 'block',       value: 94 },
    { key: 'parry',       name: 'Parry',         stat: 'parry',       value: 94 }
];

var MANASTONE_KEYS = MANASTONES.map(function(m) { return m.key; });

var MANASTONE_PRESETS = [
    { key: 'full-attack',   name: 'Full Attack',      mana: 'attack' },
    { key: 'full-crit',     name: 'Full Crit',        mana: 'crit' },
    { key: 'full-accuracy', name: 'Full Accuracy',    mana: 'accuracy' },
    { key: 'full-hp',       name: 'Full HP',          mana: 'hp' },
    { key: 'full-evasion',  name: 'Full Evasion',     mana: 'evasion' },
    { key: 'full-mresist',  name: 'Full Magic Resist', mana: 'magicResist' },
    { key: 'full-pdef',     name: 'Full Phys. Def',   mana: 'pdef' },
    { key: 'full-mdef',     name: 'Full Mag. Def',    mana: 'mdef' },
    { key: 'full-block',    name: 'Full Block',       mana: 'block' },
    { key: 'full-parry',    name: 'Full Parry',       mana: 'parry' }
];

// Get number of manastone slots for a gear piece
function getManastoneSlotCount(setKey) {
    if (setKey === 'none') return 0;
    if (setKey === 'acrimony' || setKey === 'presumption' || setKey === 'obstinacy') return 1;
    return 3;
}

// Oath stat bonuses per pair type
// shoulders+helmet -> HP + ACC (accuracy + magicalAccuracy)
// chest+pants      -> HP + DEF (physicalDef + magicalDef)
// gloves+boots     -> HP + ATK (attack)
// Both slots must have a real oath (not none/silent-skill) to activate
var OATH_BONUS = {
    'none':         { hp: 0,    def: 0,   attack: 0,   acc: 0 },
    'silent-skill': { hp: 0,    def: 0,   attack: 0,   acc: 0 },
    'legendary-1':  { hp: 1000, def: 100, attack: 100, acc: 300 },
    'legendary-2':  { hp: 1250, def: 125, attack: 125, acc: 375 },
    'legendary-3':  { hp: 1500, def: 150, attack: 150, acc: 450 },
    'ultimate-1':   { hp: 2500, def: 250, attack: 250, acc: 750 },
    'ultimate-2':   { hp: 3500, def: 350, attack: 350, acc: 1050 },
    'ultimate-3':   { hp: 5000, def: 500, attack: 500, acc: 1500 }
};

// Oath icon URL parts per slot
var OATH_SLOT_ICON = {
    shoulders: 'shoulder', helmet: 'head', chest: 'torso',
    pants: 'leg', gloves: 'glove', boots: 'foot'
};

// Oath pairs: the two slots in each pair share one oath bonus
var OATH_PAIRS = [
    ['shoulders', 'helmet'],
    ['chest', 'pants'],
    ['gloves', 'boots']
];

function getOathIconTier(oathKey) {
    if (oathKey === 'ultimate-3') return 'g6';
    if (oathKey === 'ultimate-1' || oathKey === 'ultimate-2') return 'g4';
    if (oathKey === 'legendary-1' || oathKey === 'legendary-2' || oathKey === 'legendary-3') return 'g1';
    return null;
}

var SILENT_SKILL_ICONS = {
    shoulders: '../assets/icons/icon_item_rb_shoulder_s01.png',
    helmet:    '../assets/icons/icon_item_ac_head_s05.png',
    chest:     '../assets/icons/icon_item_rb_torso_s01.png',
    pants:     '../assets/icons/icon_item_rb_pants_s01.png',
    gloves:    '../assets/icons/icon_item_rb_glove_s01.png',
    boots:     '../assets/icons/icon_item_rb_shoes_s01.png'
};


function getOathIcon(slotKey, oathKey) {
    if (oathKey === 'silent-skill') return SILENT_SKILL_ICONS[slotKey] || null;
    var tier = getOathIconTier(oathKey);
    if (!tier) return null;
    return '../assets/icons/vs_armor_' + OATH_SLOT_ICON[slotKey] + '_a_' + tier + '.png';
}

function getOathRank(oathKey) {
    var opt = OATH_OPTIONS.find(function(o) { return o.key === oathKey; });
    return opt ? opt.rank : 0;
}

// For a pair, both slots must have a real oath to activate
function isRealOath(oathKey) {
    return oathKey !== 'none' && oathKey !== 'silent-skill';
}

function getEffectiveOath(oath, slot1, slot2) {
    if (!isRealOath(oath[slot1]) || !isRealOath(oath[slot2])) return 'none';
    var r1 = getOathRank(oath[slot1]);
    var r2 = getOathRank(oath[slot2]);
    return r1 >= r2 ? oath[slot1] : oath[slot2];
}

var CLASS_DATA = {
    gladiator:    { name: 'Gladiator',    icon: '../assets/icons/gladiator.png',    weapons: ['dagger', 'sword', 'greatsword', 'polearm'], armorTypes: ['physical-plate'] },
    templar:      { name: 'Templar',      icon: '../assets/icons/templar.png',      weapons: ['sword', 'greatsword'],                      armorTypes: ['physical-plate'] },
    assassin:     { name: 'Assassin',     icon: '../assets/icons/assassin.png',     weapons: ['dagger', 'sword'],                          armorTypes: ['physical-leather', 'magical-leather'] },
    ranger:       { name: 'Ranger',       icon: '../assets/icons/ranger.png',       weapons: ['bow'],                                      armorTypes: ['physical-leather'] },
    sorcerer:     { name: 'Sorcerer',     icon: '../assets/icons/sorcerer.png',     weapons: ['orb', 'spellbook'],                         armorTypes: ['magical-cloth'] },
    spiritmaster: { name: 'Spiritmaster', icon: '../assets/icons/spiritmaster.png', weapons: ['orb', 'spellbook'],                         armorTypes: ['magical-cloth'] },
    cleric:       { name: 'Cleric',       icon: '../assets/icons/cleric.png',       weapons: ['mace'],                                     armorTypes: ['magical-chain', 'physical-chain'] },
    chanter:      { name: 'Chanter',      icon: '../assets/icons/chanter.png',      weapons: ['staff', 'mace'],                            armorTypes: ['physical-chain', 'magical-chain'] },
    aethertech:   { name: 'Aethertech',   icon: '../assets/icons/aethertech.png',   weapons: ['aetherKey'],                                armorTypes: ['magical-plate'] },
    gunner:       { name: 'Gunner',       icon: '../assets/icons/gunner.png',       weapons: ['revolver', 'cannon'],                       armorTypes: ['magical-leather'] },
    bard:         { name: 'Bard',         icon: '../assets/icons/bard.png',         weapons: ['harp'],                                     armorTypes: ['magical-cloth'] },
    painter:      { name: 'Painter',      icon: '../assets/icons/painter.png',      weapons: ['paintRings'],                               armorTypes: ['physical-cloth'] }
};

var CLASS_ORDER = ['gladiator', 'templar', 'assassin', 'ranger', 'sorcerer', 'spiritmaster',
                   'cleric', 'chanter', 'aethertech', 'gunner', 'bard', 'painter'];

// Stats that items provide (used for comparison)
var COMPARISON_STATS = [
    { key: 'hp',              name: 'HP' },
    { key: 'attack',          name: 'Attack' },
    { key: 'physicalAttack',  name: 'Physical Attack' },
    { key: 'magicAttack',     name: 'Magic Attack' },
    { key: 'accuracy',        name: 'Accuracy' },
    { key: 'crit',            name: 'Crit' },
    { key: 'critDmg',         name: 'Crit Dmg' },
    { key: 'healingBoost',    name: 'Healing Boost' },
    { key: 'pvpAttack',       name: 'Add. PvP Atk' },
    { key: 'pveAttack',       name: 'Add. PvE Atk' },
    { key: 'weaponAttack',    name: 'Weapon Attack' },

    { key: 'physicalDef',     name: 'Physical Def' },
    { key: 'strikeFortitude', name: 'Strike Fortitude' },
    { key: 'evasion',         name: 'Evasion' },
    { key: 'increasedRegen',  name: 'Increased Regeneration' },
    { key: 'magicalDef',      name: 'Magical Def' },
    { key: 'spellFortitude',  name: 'Spell Fortitude' },
    { key: 'magicResist',     name: 'Magic Resist' },
    { key: 'block',           name: 'Block' },
    { key: 'parry',           name: 'Parry' },
    { key: 'pvpDefence',      name: 'Add. PvP Def' },
    { key: 'pveDefence',      name: 'Add. PvE Def' },

    { key: 'dp',              name: 'DP' },
];

const STAT_GROUPS = [
    {
        label : "Vitality",
        keys: ["hp"]

    },
    {
        label: "Offensive",
        keys: ["attack", "accuracy", "crit", "critDmg", "healingBoost", "pvpAttack", "pveAttack"]
    },
    {
        label: "Defensive",
        keys: ["physicalDef", "strikeFortitude", "evasion", "increasedRegen", "magicalDef", "spellFortitude", "magicResist", "block", "parry", "pvpDefence", "pveDefence"]
    },
    {
        label: "Others",
        keys: ["dp"]
    }
];

var STAT_KEYS = COMPARISON_STATS.map(function(s) { return s.key; });


// emptyStats helper (used across all modules)

function emptyStats() {
    var s = {};
    STAT_KEYS.forEach(function(k) { s[k] = 0; });
    return s;
}