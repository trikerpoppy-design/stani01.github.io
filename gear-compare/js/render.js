'use strict';

function msIndicator(pid, gearKey, setKey, profile) {
    var slots = getManastoneSlotCount(setKey);
    var ms = profile.manastones[gearKey] || [];
    var filled = 0;
    for (var i = 0; i < slots; i++) { if (ms[i] && ms[i] !== 'none') filled++; }
    var icons = '';
    for (var j = 0; j < slots; j++) {
        var isFilled = ms[j] && ms[j] !== 'none';
        var src = isFilled ? MANASTONE_ICON : EMPTY_SLOT_ICON;
        var imgCls = isFilled ? 'gc-ms-ico gc-ms-ico-filled' : 'gc-ms-ico';
        icons += '<img src="' + src + '" class="' + imgCls + '" alt="">';
    }
    var cls = filled === slots ? ' gc-ms-full' : filled > 0 ? ' gc-ms-partial' : '';
    return '<span class="gc-ms-indicator' + cls + '" title="Manastones: ' + filled + '/' + slots + '">' + icons + '</span>';
}

// -- Manastone Modal --
function getGearLabel(gearKey) {
    if (gearKey === 'mainWeapon') return 'Main Weapon';
    if (gearKey === 'offHand') return 'Off-Hand';
    var slot = ARMOR_SLOTS.find(function(s) { return s.key === gearKey; });
    if (slot) return gearKey.charAt(0).toUpperCase() + gearKey.slice(1);
    // Accessory keys
    var accDef = ACCESSORY_SLOTS_UPPER.concat(ACCESSORY_SLOTS_LOWER_L, ACCESSORY_SLOTS_LOWER_R).find(function(s) { return s.key === gearKey; });
    if (accDef) return accDef.name;
    return gearKey;
}

function getGearIcon(pid, gearKey) {
    var profile = state[pid];
    var material = getArmorMaterial(profile.armorType);
    if (gearKey === 'mainWeapon') {
        if (profile.mainWeapon && profile.mainWeapon.set === 'none') return getEmptySlotIcon('mainWeapon');
        return WEAPON_TYPES[weaponConfig.mainType].icon;
    }
    if (gearKey === 'offHand') {
        if (profile.offHand && profile.offHand.set === 'none') return getEmptySlotIcon('offHand');
        if (weaponConfig.offHandType === 'shield') {
            if (profile.shield && profile.shield.set === 'none') return getEmptySlotIcon('shield');
            return '../assets/icons/icon_item_equip_shield_f01.png';
        }
        if (weaponConfig.offHandType === 'fuse') return WEAPON_TYPES[weaponConfig.mainType].icon;
        if (weaponConfig.offHandType === 'weapon') return WEAPON_TYPES[weaponConfig.offHandWeaponType].icon;
        return '';
    }
    var slot = ARMOR_SLOTS.find(function(s) { return s.key === gearKey; });
    if (slot) {
        if (profile.armor[gearKey] && profile.armor[gearKey].set === 'none') return getEmptySlotIcon(gearKey);
        return getArmorIcon(material, slot.iconKey);
    }
    // Accessory keys
    var accDef = ACCESSORY_SLOTS_UPPER.concat(ACCESSORY_SLOTS_LOWER_L, ACCESSORY_SLOTS_LOWER_R).find(function(s) { return s.key === gearKey; });
    if (accDef) {
        if (profile.accessories && profile.accessories[gearKey] && profile.accessories[gearKey].set === 'none') return getEmptySlotIcon(gearKey);
        return accDef.icon;
    }
    return '';
}

function getGearSetKey(pid, gearKey) {
    var profile = state[pid];
    if (gearKey === 'mainWeapon') return profile.mainWeapon.set;
    if (gearKey === 'offHand') return profile.offHand.set;
    if (profile.armor[gearKey]) return profile.armor[gearKey].set;
    if (profile.accessories && profile.accessories[gearKey]) return profile.accessories[gearKey].set;
    return 'fighting-spirit';
}

function renderManaModal(pid, scrollToGear) {
    var profile = state[pid];

    var html = '<div class="gc-mana-overlay" onclick="GC.closeManaModal()"></div>';
    html += '<div class="gc-mana-dialog">';

    // Title bar
    html += '<div class="gc-mana-titlebar">';
    html += '<img src="' + MANASTONE_ICON + '" class="gc-mana-title-icon" alt="">';
    html += '<span class="gc-mana-title">Manastones - ' + getSetName(pid) + '</span>';
    html += '<span class="gc-mana-close" onclick="GC.closeManaModal()">✕</span>';
    html += '</div>';

    // Presets
    html += '<div class="gc-mana-presets">';
    MANASTONE_PRESETS.forEach(function(preset) {
        html += '<button class="gc-mana-preset-btn" onclick="GC.applyManaPreset(' + pid + ',\'' + preset.mana + '\')">' + preset.name + '</button>';
    });
    html += '<button class="gc-mana-preset-btn gc-mana-clear-btn" onclick="GC.clearManastones(' + pid + ')">Clear All</button>';
    html += '</div>';

    // Scrollable body
    html += '<div class="gc-mana-body">';

    // Weapon section label + rows
    var weaponKeys = ['mainWeapon'];
    var effectiveOHForModal = getEffectiveOffHandType(state[pid]);
    if (effectiveOHForModal !== 'none') weaponKeys.push('offHand');
    html += '<div class="gc-mana-section-label">🗡️ Weapons</div>';
    html += '<div class="gc-mana-gear-list">';
    weaponKeys.forEach(function(gk) {
        var setKey = getGearSetKey(pid, gk);
        var slotCount = getManastoneSlotCount(setKey);
        var ms = profile.manastones[gk] || [];
        var icon = getGearIcon(pid, gk);
        var label = getGearLabel(gk);

        html += '<div class="gc-mana-gear-row' + (setKey === 'none' ? ' gc-mana-gear-row-none' : '') + '" id="gc-mana-row-' + gk + '">';
        html += '<div class="gc-mana-gear-info">';
        if (icon) html += '<img src="' + icon + '" class="gc-mana-gear-icon" alt="">';
        html += '<span class="gc-mana-gear-name">' + label + '</span>';
        if (setKey === 'none') {
            html += '<span class="gc-mana-slot-count gc-mana-slot-none">(No weapon)</span>';
        } else {
            html += '<span class="gc-mana-slot-count">(' + slotCount + ' slot' + (slotCount > 1 ? 's' : '') + ')</span>';
        }
        html += '</div>';
        html += '<div class="gc-mana-slots">';
        for (var i = 0; i < slotCount; i++) {
            var currentMana = (ms[i] && ms[i] !== 'none') ? ms[i] : 'none';
            var manaDef = MANASTONES.find(function(m) { return m.key === currentMana; });
            if (manaDef) {
                html += '<div class="gc-mana-slot gc-mana-slot-filled" data-pid="' + pid + '" data-gear="' + gk + '" data-slot="' + i + '">';
                html += '<img src="' + MANASTONE_ICON + '" class="gc-mana-slot-icon" alt="">';
                html += '<span class="gc-mana-slot-label">' + manaDef.name + ' +' + manaDef.value + '</span>';
                html += '</div>';
            } else {
                html += '<div class="gc-mana-slot gc-mana-slot-empty" data-pid="' + pid + '" data-gear="' + gk + '" data-slot="' + i + '">';
                html += '<img src="' + EMPTY_SLOT_ICON + '" class="gc-mana-slot-icon gc-mana-slot-icon-empty" alt="">';
                html += '<span class="gc-mana-slot-empty-label">Empty</span>';
                html += '</div>';
            }
        }
        html += '</div>';
        html += '</div>';
    });
    html += '</div>';

    // Armor section label + rows
    var armorKeys = [];
    ARMOR_SLOTS.forEach(function(s) { armorKeys.push(s.key); });
    html += '<div class="gc-mana-section-label">🛡️ Armor</div>';
    html += '<div class="gc-mana-gear-list">';
    armorKeys.forEach(function(gk) {
        var setKey = getGearSetKey(pid, gk);
        var slotCount = getManastoneSlotCount(setKey);
        var ms = profile.manastones[gk] || [];
        var icon = getGearIcon(pid, gk);
        var label = getGearLabel(gk);

        html += '<div class="gc-mana-gear-row' + (setKey === 'none' ? ' gc-mana-gear-row-none' : '') + '" id="gc-mana-row-' + gk + '">';
        html += '<div class="gc-mana-gear-info">';
        if (icon) html += '<img src="' + icon + '" class="gc-mana-gear-icon" alt="">';
        html += '<span class="gc-mana-gear-name">' + label + '</span>';
        if (setKey === 'none') {
            html += '<span class="gc-mana-slot-count gc-mana-slot-none">(No armor)</span>';
        } else {
            html += '<span class="gc-mana-slot-count">(' + slotCount + ' slot' + (slotCount !== 1 ? 's' : '') + ')</span>';
        }
        html += '</div>';
        html += '<div class="gc-mana-slots">';
        for (var i = 0; i < slotCount; i++) {
            var currentMana = (ms[i] && ms[i] !== 'none') ? ms[i] : 'none';
            var manaDef = MANASTONES.find(function(m) { return m.key === currentMana; });
            if (manaDef) {
                html += '<div class="gc-mana-slot gc-mana-slot-filled" data-pid="' + pid + '" data-gear="' + gk + '" data-slot="' + i + '">';
                html += '<img src="' + MANASTONE_ICON + '" class="gc-mana-slot-icon" alt="">';
                html += '<span class="gc-mana-slot-label">' + manaDef.name + ' +' + manaDef.value + '</span>';
                html += '</div>';
            } else {
                html += '<div class="gc-mana-slot gc-mana-slot-empty" data-pid="' + pid + '" data-gear="' + gk + '" data-slot="' + i + '">';
                html += '<img src="' + EMPTY_SLOT_ICON + '" class="gc-mana-slot-icon gc-mana-slot-icon-empty" alt="">';
                html += '<span class="gc-mana-slot-empty-label">Empty</span>';
                html += '</div>';
            }
        }
        html += '</div>';
        html += '</div>';
    });
    html += '</div>';

    // Accessory manastone rows
    html += '<div class="gc-mana-section-label">💎 Accessories</div>';
    html += '<div class="gc-mana-gear-list">';
    ALL_ACCESSORY_KEYS.forEach(function(accKey) {
        var ms = profile.manastones[accKey] || [];
        var accDef = ACCESSORY_SLOTS_UPPER.concat(ACCESSORY_SLOTS_LOWER_L, ACCESSORY_SLOTS_LOWER_R).find(function(s) { return s.key === accKey; });
        var icon = accDef ? accDef.icon : '';
        var label = accDef ? accDef.name : accKey;
        var accState = profile.accessories ? profile.accessories[accKey] : null;
        var accSetKey = accState ? accState.set : 'fighting-spirit';
        var slotCount = getManastoneSlotCount(accSetKey);

        if (accSetKey === 'none') icon = getEmptySlotIcon(accKey);

        html += '<div class="gc-mana-gear-row' + (accSetKey === 'none' ? ' gc-mana-gear-row-none' : '') + '" id="gc-mana-row-' + accKey + '">';
        html += '<div class="gc-mana-gear-info">';
        if (icon) html += '<img src="' + icon + '" class="gc-mana-gear-icon" alt="">';
        html += '<span class="gc-mana-gear-name">' + label + '</span>';
        if (accSetKey === 'none') {
            html += '<span class="gc-mana-slot-count gc-mana-slot-none">(No accessory)</span>';
        } else {
            html += '<span class="gc-mana-slot-count">(' + slotCount + ' slot' + (slotCount !== 1 ? 's' : '') + ')</span>';
        }
        html += '</div>';
        html += '<div class="gc-mana-slots">';
        for (var i = 0; i < slotCount; i++) {
            var currentMana = (ms[i] && ms[i] !== 'none') ? ms[i] : 'none';
            var manaDef = MANASTONES.find(function(m) { return m.key === currentMana; });
            if (manaDef) {
                html += '<div class="gc-mana-slot gc-mana-slot-filled" data-pid="' + pid + '" data-gear="' + accKey + '" data-slot="' + i + '">';
                html += '<img src="' + MANASTONE_ICON + '" class="gc-mana-slot-icon" alt="">';
                html += '<span class="gc-mana-slot-label">' + manaDef.name + ' +' + manaDef.value + '</span>';
                html += '</div>';
            } else {
                html += '<div class="gc-mana-slot gc-mana-slot-empty" data-pid="' + pid + '" data-gear="' + accKey + '" data-slot="' + i + '">';
                html += '<img src="' + EMPTY_SLOT_ICON + '" class="gc-mana-slot-icon gc-mana-slot-icon-empty" alt="">';
                html += '<span class="gc-mana-slot-empty-label">Empty</span>';
                html += '</div>';
            }
        }
        html += '</div>';
        html += '</div>';
    });
    html += '</div>';

    html += '</div>'; // close gc-mana-body
    html += '</div>'; // dialog
    return html;
}

// -- Panel-to-prefix mapping for set view containers --
var SET_PANEL_MAP = {
    equipment:   'profile',
    transforms:  'transform',
    collections: 'collections',
    relic:       'relic',
    trait:       'trait',
    'skill-buffs': 'buffs'
};

// -- Build set tabs and view containers for all panels --
function renderSetTabs() {
    document.querySelectorAll('.gc-set-tabs').forEach(function(tabBar) {
        var html = '';
        setOrder.forEach(function(id) {
            var active = id === activeSetId ? ' gc-set-tab-active' : '';
            var name = getSetName(id);
            html += '<button class="gc-set-tab' + active + '" data-set="' + id + '" draggable="true">';
            html += '<span class="gc-set-tab-name" data-set="' + id + '">' + name + '</span>';
            if (setOrder.length > 2) {
                html += '<span class="gc-set-tab-remove" data-remove="' + id + '" title="Remove ' + name + '">✕</span>';
            }
            html += '</button>';
        });
        if (setOrder.length < MAX_SETS) {
            html += '<button class="gc-set-tab gc-set-tab-add" title="Add new set">+</button>';
        }
        tabBar.innerHTML = html;
    });
    // Ensure view containers exist for all panels
    Object.keys(SET_PANEL_MAP).forEach(function(panel) {
        var prefix = SET_PANEL_MAP[panel];
        var content = document.querySelector('.gc-set-content[data-panel="' + panel + '"]');
        if (!content) return;
        // Remove old containers that no longer exist in setOrder
        content.querySelectorAll('.gc-set-view').forEach(function(v) {
            var sid = parseInt(v.getAttribute('data-set'));
            if (setOrder.indexOf(sid) === -1) v.remove();
        });
        // Create containers for new sets
        setOrder.forEach(function(id) {
            var elId = prefix + '-' + id;
            if (!document.getElementById(elId)) {
                var div = document.createElement('div');
                div.className = 'gc-profile gc-set-view';
                div.id = elId;
                div.setAttribute('data-set', id);
                content.appendChild(div);
            }
        });
        // Set active class
        content.querySelectorAll('.gc-set-view').forEach(function(v) {
            var sid = parseInt(v.getAttribute('data-set'));
            if (sid === activeSetId) {
                v.classList.add('gc-set-view-active');
            } else {
                v.classList.remove('gc-set-view-active');
            }
        });
    });
}

function activateSetView(setId) {
    activeSetId = setId;
    // Sync all tab bars
    document.querySelectorAll('.gc-set-tabs').forEach(function(tabBar) {
        tabBar.querySelectorAll('.gc-set-tab').forEach(function(b) {
            var bSet = parseInt(b.getAttribute('data-set'));
            if (bSet === setId) b.classList.add('gc-set-tab-active');
            else b.classList.remove('gc-set-tab-active');
        });
    });
    // Sync all view containers
    document.querySelectorAll('.gc-set-content').forEach(function(content) {
        content.querySelectorAll('.gc-set-view').forEach(function(v) {
            var sid = parseInt(v.getAttribute('data-set'));
            if (sid === setId) v.classList.add('gc-set-view-active');
            else v.classList.remove('gc-set-view-active');
        });
    });
    saveState();
}

function renderAll() {
    renderSetTabs();
    renderClassSelector();
    renderWeaponConfig();
    setOrder.forEach(function(id) {
        renderProfile(id);
        renderTransform(id);
        renderCollections(id);
        renderRelic(id);
        renderSkillBuffs(id);
    });
    renderTraitTab();
    updateComparison();
}

// -- Skill Buffs rendering --
function renderSkillBuffs(pid) {
    var el = document.getElementById('buffs-' + pid);
    if (!el) return;
    var profile = state[pid];
    if (!profile.skillBuffs) {
        profile.skillBuffs = {};
        var allBuffs = getSkillBuffsForClass(selectedClass);
        allBuffs.forEach(function(buff) { profile.skillBuffs[buff.key] = !!buff.defaultActive; });
    }
    var sb = profile.skillBuffs;

    var html = '<div class="gc-profile-header">';
    html += '<span class="gc-set-title" data-set="' + pid + '">' + getSetName(pid) + '</span>';
    html += '<button class="gc-reset-btn" onclick="GC.resetSkillBuffs(' + pid + ')" title="Reset skill buffs">↺</button>';
    html += '</div>';

    html += '<div class="info-box">✅ Database Updated.<br>Skills and buffs for all primary classes are now live. Found a discrepancy? Let us know!</div>';
    // Universal buffs
    var universalBuffs = GC_SKILL_BUFFS.universal;
    if (universalBuffs.length > 0) {
        var uniqId = 'gc-buffs-grid-universal-' + pid;
        var isCollapsed = false;
        try { isCollapsed = localStorage.getItem('gcBuffCollapsed_universal_' + pid) === '1'; } catch (e) {}
        html += '<div class="gc-buff-section">';
        html += '<div class="gc-buff-section-label gc-collapsible-label' + (isCollapsed ? ' gc-collapsed' : '') + '" style="color: var(--green);" onclick="GC.toggleBuffSection(\'' + uniqId + '\',\'universal\',' + pid + ')">';
        html += '<span class="gc-collapse-arrow"></span>Universal Buffs (All Classes)</div>';
        html += '<div class="gc-buffs-grid' + (isCollapsed ? ' collapsed' : '') + '" id="' + uniqId + '">';
        universalBuffs.forEach(function(buff) {
            html += renderBuffItem(pid, buff, sb);
        });
        html += '</div></div>';
    }

    // Physical / Magical universal buffs
    var isPhys = isPhysicalClass(selectedClass);
    var typedBuffs = isPhys ? GC_SKILL_BUFFS.universal_phys : GC_SKILL_BUFFS.universal_mag;
    if (typedBuffs.length > 0) {
        var typedLabel = isPhys ? 'Physical Buffs' : 'Magical Buffs';
        var typedColor = isPhys ? 'var(--danger)' : 'var(--accent)';
        var typedId = 'gc-buffs-grid-typed-' + pid;
        var isTypedCollapsed = false;
        try { isTypedCollapsed = localStorage.getItem('gcBuffCollapsed_typed_' + pid) === '1'; } catch (e) {}
        html += '<div class="gc-buff-section">';
        html += '<div class="gc-buff-section-label gc-collapsible-label' + (isTypedCollapsed ? ' gc-collapsed' : '') + '" style="color: ' + typedColor + ';" onclick="GC.toggleBuffSection(\'' + typedId + '\',\'typed\',' + pid + ')">';
        html += '<span class="gc-collapse-arrow"></span>' + typedLabel + '</div>';
        html += '<div class="gc-buffs-grid' + (isTypedCollapsed ? ' collapsed' : '') + '" id="' + typedId + '">';
        typedBuffs.forEach(function(buff) {
            html += renderBuffItem(pid, buff, sb);
        });
        html += '</div></div>';
    }

    // Class-specific buffs
    var classBuffs = GC_SKILL_BUFFS[selectedClass] || [];
    if (classBuffs.length > 0) {
        var className = CLASS_DATA[selectedClass] ? CLASS_DATA[selectedClass].name : selectedClass;
        var classId = 'gc-buffs-grid-class-' + pid;
        var isClassCollapsed = false;
        try { isClassCollapsed = localStorage.getItem('gcBuffCollapsed_class_' + pid) === '1'; } catch (e) {}
        html += '<div class="gc-buff-section">';
        html += '<div class="gc-buff-section-label gc-collapsible-label' + (isClassCollapsed ? ' gc-collapsed' : '') + '" style="color: var(--warning);" onclick="GC.toggleBuffSection(\'' + classId + '\',\'class\',' + pid + ')">';
        html += '<span class="gc-collapse-arrow"></span>' + className + ' Buffs</div>';
        html += '<div class="gc-buffs-grid' + (isClassCollapsed ? ' collapsed' : '') + '" id="' + classId + '">';
        classBuffs.forEach(function(buff) {
            html += renderBuffItem(pid, buff, sb);
        });
        html += '</div></div>';
    }

    el.innerHTML = html;
}

function renderBuffItem(pid, buff, sb) {
    var skill = GC_SKILL_DATABASE[buff.key];
    if (!skill) return '';
    var active = !!sb[buff.key];
    var sbe = state[pid].skillBuffEnchants || {};
    var cls = 'gc-buff-item' + (active ? ' active' : '');
    var html = '<div class="' + cls + '" id="gc-buff-' + pid + '-' + buff.key + '" onclick="GC.toggleSkillBuff(' + pid + ',\'' + buff.key + '\')">';
    html += '<img src="' + skill.icon + '" class="gc-buff-icon" alt="">';
    html += '<div class="gc-buff-info">';
    html += '<div class="gc-buff-name">' + skill.name + '</div>';
    // Show dynamic value if enchantable, otherwise static value
    if (buff.enchant) {
        var enchLvl = typeof sbe[buff.key] === 'number' ? sbe[buff.key] : buff.enchant.defaultLevel;
        var baseVal = buff.stats[buff.enchant.stat] || 0;
        var totalVal = baseVal + (enchLvl * buff.enchant.perLevel);
        // Build dynamic display: replace base value with enchanted value
        var dynValue = buff.value.replace('+' + baseVal, '+' + totalVal);
        html += '<div class="gc-buff-value">' + dynValue + '</div>';
    } else {
        html += '<div class="gc-buff-value">' + buff.value + '</div>';
    }
    html += '</div>';
    // Enchant level selector (inline, before the info button)
    if (buff.enchant) {
        var currentLvl = typeof sbe[buff.key] === 'number' ? sbe[buff.key] : buff.enchant.defaultLevel;
        html += '<select class="gc-buff-enchant-select" onclick="event.stopPropagation()" onchange="GC.setSkillBuffEnchant(' + pid + ',\'' + buff.key + '\',parseInt(this.value))">';
        SKILL_ENCHANT_LEVELS.forEach(function(lvl) {
            if (lvl <= buff.enchant.maxLevel) {
                html += '<option value="' + lvl + '"' + (lvl === currentLvl ? ' selected' : '') + '>+' + lvl + '</option>';
            }
        });
        html += '</select>';
    }
    html += '<button class="gc-skill-info-btn" onclick="GC.showSkillInfo(event,\'' + buff.key + '\')" title="Skill Information">i</button>';
    html += '</div>';
    return html;
}

// -- Tab switching --
// activeTab declared earlier, restored from loadState
var formsActiveGrade = {};

// -- Forms Collection rendering --
// Returns HTML string for the forms picker (used inline in renderCollections)
function renderFormsPickerHTML(pid) {
    var profile = state[pid];
    if (!profile.ownedForms) profile.ownedForms = {};
    var owned = profile.ownedForms;
    var activeGrade = formsActiveGrade[pid] || 'ultimate';

    var totalOwned = ALL_FORM_IDS.filter(function(id) { return !!owned[id]; }).length;
    var html = '<div class="gc-section-label gc-coll-section-label" style="margin-top:16px">';
    html += '\uD83D\uDD04 Owned Forms <span class="gc-coll-count">(' + totalOwned + '/' + ALL_FORM_IDS.length + ')</span>';
    //html += '<button class="gc-form-action-btn" style="margin-left:auto" onclick="GC.resetForms(' + pid + ')" title="Reset owned forms">Reset</button>';
    html += '</div>';

    // Grade sub-tabs + actions in one row
    html += '<div class="gc-form-grade-tabs">';
    FORM_GRADES.forEach(function(g) {
        var gradeForms = TRANSFORMS_BY_GRADE[g.key] || [];
        var ownedCount = gradeForms.filter(function(f) { return !!owned[f.id]; }).length;
        var activeCls = activeGrade === g.key ? ' gc-form-grade-active' : '';
        html += '<button class="gc-form-grade-tab' + activeCls + '" '
              + 'style="--grade-color: ' + g.color + ';" '
              + 'onclick="GC.setFormsGrade(' + pid + ',\'' + g.key + '\')">' 
              + g.name + ' <span class="gc-form-grade-count">(' + ownedCount + '/' + gradeForms.length + ')</span>'
              + '</button>';
    });
    html += '<div class="gc-form-actions">';
    html += '<button class="gc-form-action-btn" onclick="GC.selectAllForms(' + pid + ')">Select All</button>';
    html += '<button class="gc-form-action-btn" onclick="GC.deselectAllForms(' + pid + ')">Deselect All</button>';
    html += '</div>';
    html += '</div>';

    // Form icons grid
    var gradeForms = TRANSFORMS_BY_GRADE[activeGrade] || [];
    html += '<div class="gc-forms-grid">';
    gradeForms.forEach(function(form) {
        var isOwned = !!owned[form.id];
        var cls = 'gc-form-icon' + (isOwned ? ' gc-form-owned' : '');
        html += '<div class="' + cls + '" onclick="GC.toggleForm(' + pid + ',' + form.id + ')" '
              + 'onmouseenter="GC.showFormTooltip(event,' + form.id + ')" '
              + 'onmouseleave="GC.hideFormTooltip()">';
        html += '<img src="' + form.icon + '" alt="' + form.name + '">';
        html += '</div>';
    });
    html += '</div>';

    return html;
}

function activateTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.gc-tab').forEach(function(b) { b.classList.remove('gc-tab-active'); });
    var btn = document.querySelector('.gc-tab[data-tab="' + tab + '"]');
    if (btn) btn.classList.add('gc-tab-active');
    document.querySelectorAll('.gc-tab-panel').forEach(function(p) { p.classList.remove('gc-tab-panel-active'); });
    document.getElementById('tab-' + tab).classList.add('gc-tab-panel-active');
}
document.getElementById('gc-tab-bar').addEventListener('click', function(e) {
    var btn = e.target.closest('.gc-tab');
    if (!btn) return;
    var tab = btn.getAttribute('data-tab');
    if (tab === activeTab) return;
    activateTab(tab);
    saveState();
});

// -- Set Sub-Tab switching --
// Delegated listener on body for all set-tab buttons (synced across panels)
document.addEventListener('click', function(e) {
    // Handle add set button
    if (e.target.closest('.gc-set-tab-add')) {
        e.preventDefault();
        GC.addSet();
        return;
    }
    // Handle remove set button
    var removeBtn = e.target.closest('.gc-set-tab-remove');
    if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        var removeId = parseInt(removeBtn.getAttribute('data-remove'));
        GC.removeSet(removeId);
        return;
    }
    var btn = e.target.closest('.gc-set-tab');
    if (!btn || btn.classList.contains('gc-set-tab-add')) return;
    var setId = parseInt(btn.getAttribute('data-set'));
    if (!setId || setId === activeSetId) return;
    activateSetView(setId);
});

// -- Set tab rename (double-click) --
document.addEventListener('dblclick', function(e) {
    var nameSpan = e.target.closest('.gc-set-tab-name');
    if (!nameSpan) return;
    var setId = parseInt(nameSpan.getAttribute('data-set'));
    if (!setId) return;
    e.preventDefault();
    var currentName = getSetName(setId);
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'gc-set-tab-rename-input';
    input.value = currentName;
    input.maxLength = 16;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();
    function finishRename() {
        var val = input.value.trim();
        if (!val) val = 'Set ' + setId;
        if (val.length > 16) val = val.substring(0, 16);
        setNames[setId] = val;
        saveState();
        renderSetTabs();
        updateComparison();
    }
    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', function(evt) {
        if (evt.key === 'Enter') { evt.preventDefault(); input.blur(); }
        if (evt.key === 'Escape') { input.value = currentName; input.blur(); }
    });
});

// -- Double-click rename on set titles inside profile panels --
document.addEventListener('dblclick', function(e) {
    var titleSpan = e.target.closest('.gc-set-title');
    if (!titleSpan) return;
    var setId = parseInt(titleSpan.getAttribute('data-set'));
    if (!setId) return;
    e.preventDefault();
    var currentName = getSetName(setId);
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'gc-set-tab-rename-input';
    input.value = currentName;
    input.maxLength = 16;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    function finishRename() {
        var val = input.value.trim();
        if (!val) val = 'Set ' + setId;
        if (val.length > 16) val = val.substring(0, 16);
        setNames[setId] = val;
        saveState();
        renderSetTabs();
        renderAll();
    }
    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', function(evt) {
        if (evt.key === 'Enter') { evt.preventDefault(); input.blur(); }
        if (evt.key === 'Escape') { input.value = currentName; input.blur(); }
    });
});

// -- Set tab drag-to-reorder --
var dragSetId = null;

document.addEventListener('dragstart', function(e) {
    var btn = e.target.closest('.gc-set-tab');
    if (!btn || btn.classList.contains('gc-set-tab-add')) return;
    var setId = parseInt(btn.getAttribute('data-set'));
    if (!setId) return;
    dragSetId = setId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(setId));
    setTimeout(function() { btn.classList.add('gc-set-tab-dragging'); }, 0);
});

document.addEventListener('dragover', function(e) {
    if (!dragSetId) return;
    var btn = e.target.closest('.gc-set-tab');
    if (!btn || btn.classList.contains('gc-set-tab-add')) return;
    var targetId = parseInt(btn.getAttribute('data-set'));
    if (!targetId || targetId === dragSetId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.gc-set-tab-drop-before, .gc-set-tab-drop-after').forEach(function(b) {
        b.classList.remove('gc-set-tab-drop-before', 'gc-set-tab-drop-after');
    });
    var rect = btn.getBoundingClientRect();
    btn.classList.add(e.clientX < rect.left + rect.width / 2 ? 'gc-set-tab-drop-before' : 'gc-set-tab-drop-after');
});

document.addEventListener('dragleave', function(e) {
    var tabs = e.target.closest('.gc-set-tabs');
    if (!tabs) return;
    if (!e.relatedTarget || !tabs.contains(e.relatedTarget)) {
        tabs.querySelectorAll('.gc-set-tab-drop-before, .gc-set-tab-drop-after').forEach(function(b) {
            b.classList.remove('gc-set-tab-drop-before', 'gc-set-tab-drop-after');
        });
    }
});

document.addEventListener('drop', function(e) {
    if (!dragSetId) return;
    var btn = e.target.closest('.gc-set-tab');
    if (!btn || btn.classList.contains('gc-set-tab-add')) return;
    var targetId = parseInt(btn.getAttribute('data-set'));
    if (!targetId || targetId === dragSetId) { dragSetId = null; return; }
    e.preventDefault();
    var rect = btn.getBoundingClientRect();
    var insertBefore = e.clientX < rect.left + rect.width / 2;
    var fromIdx = setOrder.indexOf(dragSetId);
    setOrder.splice(fromIdx, 1);
    var toIdx = setOrder.indexOf(targetId);
    setOrder.splice(insertBefore ? toIdx : toIdx + 1, 0, dragSetId);
    dragSetId = null;
    renderSetTabs();
    updateComparison();
    saveState();
});

document.addEventListener('dragend', function() {
    dragSetId = null;
    document.querySelectorAll('.gc-set-tab').forEach(function(b) {
        b.classList.remove('gc-set-tab-dragging', 'gc-set-tab-drop-before', 'gc-set-tab-drop-after');
    });
});

// -- Transform rendering --
function renderTransform(pid) {
    var el = document.getElementById('transform-' + pid);
    var profile = state[pid];
    var currentKey = profile.transform || 'none';
    var currentTf = TRANSFORMS.find(function(t) { return t.key === currentKey; }) || TRANSFORMS[0];
    var enchLvl = profile.transformEnchant != null ? profile.transformEnchant : 0;

    var html = '<div class="gc-profile-header">';
    html += '<span class="gc-set-title" data-set="' + pid + '">' + getSetName(pid) + '</span>';
    html += '<button class="gc-reset-btn" onclick="GC.resetTransform(' + pid + ')" title="Reset transform">↺</button>';
    html += '</div>';

    // Icon picker grid
    html += '<div class="gc-section-label" style="margin-bottom:8px">Select Transformation</div>';
    html += '<div class="gc-tf-grid">';
    ULTIMATE_TRANSFORMS.forEach(function(tf) {
        var sel = currentKey === tf.key ? ' gc-tf-icon-selected' : '';
        var noneCls = tf.key === 'none' ? ' gc-tf-icon-none' : '';
        html += '<div class="gc-tf-icon' + sel + noneCls + '" onclick="GC.setTransform(' + pid + ',\'' + tf.key + '\')" title="' + tf.name + '">';
        if (tf.key === 'none') {
            html += '<span class="gc-tf-none-dash">-</span>';
        } else {
            html += '<img src="' + tf.icon + '" alt="' + tf.name + '">';
            html += '<span class="gc-tf-icon-label">' + tf.name + '</span>';
        }
        html += '</div>';
    });
    html += '</div>';

    // Enchant + stat preview (only when a transform is selected)
    if (currentKey !== 'none') {
        // Enchant row
        html += '<div class="gc-tf-enchant-row">';
        html += '<span class="gc-tf-enchant-label">Enchant</span>';
        html += '<span class="gc-enchant-trigger" onclick="GC.openEnchantPicker(' + pid + ',\'tf\',this)">+' + enchLvl + '</span>';
        html += '</div>';

        // Stat preview
        html += '<div class="gc-tf-stats">';
        html += '<div class="gc-tf-stats-title">';
        html += '<img src="' + currentTf.icon + '" class="gc-tf-stats-icon" alt=""> ';
        html += currentTf.name + ' +' + enchLvl;
        html += '</div>';
        var phys = isPhysicalClass(selectedClass);
        TRANSFORM_STAT_DEFS.forEach(function(sd) {
            var raw = currentTf.stats[sd.key];
            if (raw === undefined) return;
            var val = tfStatVal(raw, enchLvl);
            if (val === 0) return;
            var dimmed = '';
            if ((sd.key === 'accuracy' && !phys) || (sd.key === 'magicAccuracy' && phys) ||
                (sd.key === 'critStrike' && !phys) || (sd.key === 'critSpell' && phys)) {
                dimmed = ' gc-tf-stat-dimmed';
            }
            var displayVal = sd.unit === '%' ? val + '%' : val.toLocaleString();
            var perEnch = Array.isArray(raw) && raw[1] ? ' <span class="gc-tf-stat-per">(+' + raw[1] + '/ench)</span>' : '';
            html += '<div class="gc-tf-stat-row' + dimmed + '">';
            html += '<span class="gc-tf-stat-name">' + sd.name + '</span>';
            html += '<span class="gc-tf-stat-val">+' + displayVal + perEnch + '</span>';
            html += '</div>';
        });
        html += '</div>';
    }

    el.innerHTML = html;
}

// -- Collections rendering --
function renderCollections(pid) {
    var el = document.getElementById('collections-' + pid);
    var scrollParent = el.querySelector('.gc-coll-tf-scroll');
    var scrollTop = scrollParent ? scrollParent.scrollTop : 0;
    var profile = state[pid];
    if (!profile.collections) {
        profile.collections = { itemColl: {} };
        ITEM_COLL_STATS.forEach(function(cs) { profile.collections.itemColl[cs.key] = cs.max; });
    }
    var itemColl  = profile.collections.itemColl;
    var ownedForms = profile.ownedForms || {};

    if (!profile.collLevels) {
        profile.collLevels = { normal: 7, large: 7, powerful: 7 };
    }

    var html = '<div class="gc-profile-header">';
    html += '<span class="gc-set-title" data-set="' + pid + '">' + getSetName(pid) + '</span>';
    html += '<button class="gc-reset-btn" onclick="GC.resetCollections(' + pid + ')" title="Reset collections">&#x21BA;</button>';
    html += '</div>';

    // -- Owned Forms picker (inline) --
    html += renderFormsPickerHTML(pid);
    html += '<br>';

    // -- Item Collections --
    html += '<div class="gc-section-label gc-coll-section-label">\uD83C\uDF92 Item Collections</div>';
    html += '<div class="gc-coll-header">';
    html += '<div class="gc-coll-levels">';
    html += buildCollDropdown(pid,'normal','Normal');
    html += buildCollDropdown(pid,'large','Large');
    html += buildCollDropdown(pid,'powerful','Powerful');
    html += '</div>';
    html += '</div><br>';

    html += '<div class="gc-coll-item-grid">';
    ITEM_COLL_STATS.forEach(function(cs) {
        var currentVal = parseInt(itemColl[cs.key]) || 0;
        html += '<div class="gc-coll-item-row">';
        html += '<label class="gc-coll-item-label" for="ic-' + pid + '-' + cs.key + '">' + cs.name + '</label>';
        html += '<input type="number" id="ic-' + pid + '-' + cs.key + '" class="gc-coll-item-input"';
        html += ' min="0" max="' + cs.max + '" value="' + currentVal + '"';
        html += ' oninput="GC.setItemColl(' + pid + ',\'' + cs.key + '\',this.value)"';
        html += ' onblur="GC.clampItemCollDisplay(' + pid + ',\'' + cs.key + '\',this)">';
        html += '<span class="gc-coll-item-max">/ ' + cs.max + '</span>';
        html += '</div>';
    });
    html += '</div>';

    // -- Transformation Collections (auto-activated from owned forms) --
    var completedCount = TF_COLLECTIONS.filter(function(coll) { return isCollectionComplete(coll, ownedForms); }).length;
    var tfMax = TF_COLLECTIONS.length;
    html += '<div class="gc-section-label gc-coll-section-label" style="margin-top:16px">\uD83D\uDD2E Transformation Collections <span class="gc-coll-count">(' + completedCount + '/' + tfMax + ')</span>';
    html += '</div>';
    html += '<div class="gc-coll-tf-scroll">';
    html += '<div class="gc-coll-tf-grid">';
    TF_COLLECTIONS.forEach(function(coll) {
        var progress = getCollectionProgress(coll, ownedForms);
        var isComplete = progress.owned >= progress.total;
        var statDef = COMPARISON_STATS.find(function(s) { return s.key === coll.stat; });
        var statName = statDef ? statDef.name : coll.stat;
        var formNames = getCollectionFormNames(coll);

        html += '<div class="gc-coll-card' + (isComplete ? ' gc-coll-card-complete' : '') + '">';
        // Title + stat
        html += '<div class="gc-coll-card-title">' + coll.name + '</div>';
        html += '<div class="gc-coll-card-stat">+' + coll.value.toLocaleString() + ' ' + statName + '</div>';
        if (coll.bonus) {
            html += '<div class="gc-coll-card-bonus">' + coll.bonus + '</div>';
        }
        // Progress bar
        html += '<div class="gc-coll-card-progress">';
        html += '<div class="gc-coll-card-bar">';
        html += '<div class="gc-coll-card-bar-fill" style="width: ' + progress.pct + '%;"></div>';
        html += '</div>';
        html += '<span class="gc-coll-card-pct">' + progress.owned + ' / ' + progress.total + ' (' + progress.pct + '%)</span>';
        html += '</div>';
        // Required forms (icons or text for grade-based)
        if (coll.forms) {
            html += '<div class="gc-coll-card-forms">';
            coll.forms.forEach(function(id) {
                var f = TRANSFORMS_BY_ID[id];
                if (!f) return;
                var isOwned = !!ownedForms[id];
                html += '<img src="' + f.icon + '" class="gc-coll-form-icon' + (isOwned ? ' gc-coll-form-owned' : '') + '" title="' + f.name + (isOwned ? ' ✓' : '') + '">';
            });
            html += '</div>';
        } else {
            html += '<div class="gc-coll-card-forms-text">' + formNames + '</div>';
        }
        html += '</div>';
    });
    html += '</div></div>';

    el.innerHTML = html;
    var newScrollParent = el.querySelector('.gc-coll-tf-scroll');
    if (newScrollParent) newScrollParent.scrollTop = scrollTop;
}

// -- Relic rendering (in-game style) --
function renderRelic(pid) {
    var isPhy = isPhysicalClass(selectedClass);
    var el = document.getElementById('relic-' + pid);
    var profile = state[pid];
    if (!profile.relic) profile.relic = { level: 0 };
    var level = profile.relic.level || 0;
    var relicStats = getRelicLevelStats(level);

    var html = '<div class="gc-relic-panel">';

    // --- Header: stone icon + title + reset ---
    html += '<div class="gc-relic-header">';
    html += '<img src="../assets/icons/icon_item_sacredstone_levelup.png" class="gc-relic-header-icon" alt="Relic">';
    html += '<div class="gc-relic-header-info">';
    html += '<span class="gc-relic-header-title">Lord\'s Relic</span>';
    html += '<span class="gc-relic-header-subtitle">' + getSetName(pid) + '</span>';
    html += '</div>';
    html += '<button class="gc-reset-btn" onclick="GC.resetRelic(' + pid + ')" title="Reset relic">&#x21BA;</button>';
    html += '</div>';

    // --- Level row: number input + slider ---
    html += '<div class="gc-relic-level-row">';
    html += '<span class="gc-relic-level-label">Level</span>';
    html += '<input type="number" class="gc-relic-level-input" min="0" max="300" value="' + level + '"';
    html += ' oninput="GC.setRelicLevelLight(' + pid + ',this.value)"';
    html += ' onblur="GC.finalizeRelicLevel(' + pid + ',this)">';
    html += '<input type="range" class="gc-relic-level-slider" min="0" max="300" value="' + level + '"';
    html += ' oninput="GC.setRelicLevelSliderLight(' + pid + ',this.value)"';
    html += ' onchange="GC.finalizeRelicSlider(' + pid + ',this.value)">';
    html += '<span class="gc-relic-level-max">/ 300</span>';
    html += '</div>';

    // --- Special skills row ---
    html += '<div class="gc-relic-skills-label">Relic Skill</div>';
    html += '<div class="gc-relic-skills-row">';
    RELIC_MILESTONES.filter(function(ms) {
        return (
            !ms.type || ms.type === 'both' ||
            (ms.type === 'physical' && isPhy) ||
            (ms.type === 'magical' && !isPhy)
        );
    }).forEach(function(ms) {
        var isActive = level >= ms.level;
        var tooltip = ms.name + '\nLv. ' + ms.level;
        if (ms.stats) {
            var statStrs = [];
            COMPARISON_STATS.forEach(function(st) {
                if (ms.stats[st.key]) statStrs.push('+' + ms.stats[st.key].toLocaleString() + ' ' + st.name);
            });
            if (statStrs.length) tooltip += '\n' + statStrs.join(', ');
        }
        //html += '<div class="gc-relic-skill' + (isActive ? ' gc-relic-skill-active' : ' gc-relic-skill-locked') + '" title="' + tooltip + '">';
        html += '<div class="gc-relic-skill' + (isActive ? ' gc-relic-skill-active' : ' gc-relic-skill-locked') + '" data-tooltip="' + tooltip + '">';
        if (ms.icon) {
            html += '<img src="' + ms.icon + '" class="gc-relic-skill-icon' + (isActive ? '' : ' gc-relic-skill-icon-dim') + '" alt="' + ms.name + '">';
        }
        html += '<span class="gc-relic-skill-lvl">' + ms.level + '</span>';
        html += '</div>';
    });
    html += '</div>';

    // --- Stats grid ---
    html += '<div class="gc-relic-stats-label">Stats at Level ' + level + '</div>';
    html += '<div class="gc-relic-stats-grid">';
    RELIC_STAT_DEFS.forEach(function(def) {
        var val = relicStats[def.stat] || 0;
        var pct = def.max > 0 ? Math.min(100, Math.round(val / def.max * 100)) : 0;
        html += '<div class="gc-relic-stat-row">';
        html += '<span class="gc-relic-stat-name">' + def.name + '</span>';
        html += '<div class="gc-relic-stat-bar-wrap">';
        html += '<div class="gc-relic-stat-bar" style="width:' + pct + '%"></div>';
        html += '</div>';
        html += '<span class="gc-relic-stat-val">' + val.toLocaleString() + '<span class="gc-relic-stat-max"> / ' + def.max.toLocaleString() + '</span></span>';
        html += '</div>';
    });
    html += '</div>';

    html += '</div>'; // gc-relic-panel
    el.innerHTML = html;
}

function renderTraitTab() {
    setOrder.forEach(pid => {
        const el = document.getElementById('trait-' + pid);
        if (!el) return;
        // Normalize class name to match your object keys (lowercase)
        const className = (typeof selectedClass === 'string' ? selectedClass.toLowerCase().trim() : "gladiator");
        // Use the selected class data, or fallback to gladiator if not found
        const classSkills = DAEVANION_SKILLS[className] || DAEVANION_SKILLS["gladiator"];
        if (!traitSelections[pid]) {
            traitSelections[pid] = {};
            [81,82,83,84,85].forEach(function(lvl) { traitSelections[pid][lvl] = 0; });
        }
        let html = '';
        html += '<div class="gc-profile-header">';
        html += '<span class="gc-set-title" data-set="' + pid + '">' + getSetName(pid) + '</span>';
        html += '<button class="gc-reset-btn" onclick="GC.resetTrait(' + pid + ')" title="Reset traits">↺</button>';
                // Reset all traits for a set to first column
                window.GC = window.GC || {};
                GC.resetTrait = function(pid) {
                    if (!traitSelections[pid]) traitSelections[pid] = {};
                    [81, 82, 83, 84, 85].forEach(function(lvl) {
                        traitSelections[pid][lvl] = 0;
                    });
                    renderTraitTab();
                    if (typeof updateComparison === 'function') updateComparison();
                };
        html += '</div>';
        html += '<div class="gc-section-label gc-relic-stats-label" style="text-align:center;margin-bottom:8px">Daevanion Traits</div>';
        html += '<div class="gc-trait-column">';
        html += '<table class="gc-trait-table">';
        html += '<thead><tr><th>LVL</th><th colspan="3">Trait Skill</th></tr></thead>';
        html += '<tbody>';
        [81, 82, 83, 84, 85].forEach(lvl => {
            html += '<tr><td class="gc-trait-lvl">' + lvl + '</td>';
            const levelSkills = classSkills[lvl] || ["-", "-", "-"];
            levelSkills.forEach((skill, idx) => {
                const isActive = traitSelections[pid][lvl] === idx ? 'selected' : '';
                html += '<td class="gc-trait-skill ' + isActive + '" onclick="selectTrait(' + pid + ',' + lvl + ',' + idx + ')">';
                html += '<div style="display:flex;align-items:center;gap:8px;justify-content:flex-start;">';
                html += '<div class="gc-trait-icon-box"><img src="' + skill.icon + '" alt="" /></div>';
                html += '<div class="gc-skill-name">' + skill.id + '</div>';
                html += '</div>';
                html += '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        html += '</div>';
        el.innerHTML = html;
    });
}

// Global function to handle clicks
window.selectTrait = function(pid, lvl, idx) {
    // If clicking same skill, do nothing (always keep one selected)
    if (traitSelections[pid][lvl] === idx) return;
    traitSelections[pid][lvl] = idx;
    saveTraitSelections();
    renderTraitTab();
    if (typeof updateComparison === 'function') updateComparison();
};

function renderClassSelector() {
    var el = document.getElementById('class-selector');
    var html = '<div class="gc-section-label" style="margin-bottom:10px">Choose Class</div>';
    html += '<div class="gc-class-grid">';
    CLASS_ORDER.forEach(function(cn) {
        var cls = CLASS_DATA[cn];
        var sel = cn === selectedClass ? ' selected' : '';
        html += '<div class="gc-class-btn' + sel + '" onclick="GC.selectClass(\'' + cn + '\')" title="' + cls.name + '">';
        html += '<img src="' + cls.icon + '" alt="' + cls.name + '">';
        html += '<span class="gc-class-label">' + cls.name + '</span>';
        html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
}

// -- Jorgoth Weapon Stats Legend --
function buildJorgothLegend(weaponType) {
    var data = JORGOTH_WEAPONS[weaponType];
    if (!data) return '';
    var je = JORGOTH_ENCHANT;
    var is2H = WEAPON_TYPES[weaponType].twoHanded;
    var enchAtk = is2H ? je.enchAtk2h : je.enchAtk1h;
    var enchDef = is2H ? je.enchDef2h : je.enchDef1h;
    var hasHeal = data.v1.healingBoost || data.v2.healingBoost || data.v3.healingBoost;

    // Build T4 variants
    var variants = [
        { key: 'v1', label: 'T4 v1', data: data.v1 },
        { key: 'v2', label: 'T4 v2', data: data.v2 },
        { key: 'v3', label: 'T4 v3', data: data.v3 }
    ];

    // T3 alternatives for all variants (baseAtk: 5200->4700, 2250->2000)
    var t3Variants = ['v1', 'v2', 'v3'].map(function(vk) {
        return { key: vk, label: 'T3 ' + vk, data: data[vk], isT3: true };
    });

    // Compute per-variant display values (T4 only for highlighting)
    var rows = variants.map(function(v) {
        var d = v.data;
        return {
            label: v.label, data: d, tag: d.tag || null, isT3: false,
            bonusAtk: d.bonusAtk, crit: d.crit, acc: 2568 + d.acc,
            def: 170 + d.bonusDef + enchDef, hp: d.hp,
            heal: d.healingBoost || 0
        };
    });

    // T3 display rows (same bonus stats, lower baseAtk)
    var t3Rows = t3Variants.map(function(v) {
        var d = v.data;
        var t3BaseAtk = d.baseAtk === 2250 ? 2000 : 4700;
        return {
            label: v.label, data: d, tag: d.tag || null, isT3: true,
            t3BaseAtk: t3BaseAtk,
            bonusAtk: d.bonusAtk, crit: d.crit, acc: 2568 + d.acc,
            def: 170 + d.bonusDef + enchDef, hp: d.hp,
            heal: d.healingBoost || 0,
            fuseAtk: Math.floor(t3BaseAtk / 10)
        };
    });

    // For each stat column, find the max and whether values differ (T4 only)
    var statCols = ['bonusAtk', 'crit', 'acc', 'def', 'hp'];
    if (hasHeal) statCols.push('heal');
    var best = {};
    var allSame = {};
    statCols.forEach(function(col) {
        var vals = rows.map(function(r) { return r[col]; });
        best[col] = Math.max.apply(null, vals);
        allSame[col] = vals[0] === vals[1] && vals[1] === vals[2];
    });

    function hlClass(col, val) {
        if (allSame[col] || val <= 0) return '';
        return val === best[col] ? ' class="gc-jorgoth-highlight"' : '';
    }

    var html = '<div class="gc-jorgoth-legend">';
    html += '<div class="gc-jorgoth-legend-title">Jorgoth Variants - ' + WEAPON_TYPES[weaponType].name + '</div>';
    html += '<table class="gc-jorgoth-table">';
    html += '<thead><tr>';
    html += '<th></th><th>Bonus Atk</th><th>Crit</th><th>Acc</th><th>Def</th><th>HP</th>';
    if (hasHeal) html += '<th>Heal</th>';
    html += '<th></th>';
    html += '</tr></thead><tbody>';

    rows.forEach(function(r) {
        var isMasterpiece = r.tag === 'masterpiece';
        var isExtended = r.tag === 'extended';
        var isHighAtk = !allSame.bonusAtk && r.bonusAtk > 0 && r.bonusAtk === best.bonusAtk;

        var rowClass = isMasterpiece ? ' gc-jorgoth-row-mp' : '';
        html += '<tr class="gc-jorgoth-row' + rowClass + '">';
        html += '<td class="gc-jorgoth-variant">' + r.label + '</td>';
        html += '<td' + hlClass('bonusAtk', r.bonusAtk) + '>' + (r.bonusAtk || '-') + '</td>';
        html += '<td' + hlClass('crit', r.crit) + '>' + (r.crit || '-') + '</td>';
        html += '<td' + hlClass('acc', r.acc) + '>' + (r.acc || '-') + '</td>';
        html += '<td' + hlClass('def', r.def) + '>' + r.def + '</td>';
        html += '<td' + hlClass('hp', r.hp) + '>' + r.hp.toLocaleString() + '</td>';
        if (hasHeal) {
            html += '<td' + hlClass('heal', r.heal) + '>' + (r.heal || '-') + '</td>';
        }
        // Tags
        html += '<td class="gc-jorgoth-tags">';
        if (isMasterpiece) html += '<span class="gc-jorgoth-tag-mp">✦ Masterpiece</span>';
        if (isExtended) html += '<span class="gc-jorgoth-tag-ext">⟐ Extended</span>';
        if (isHighAtk && is2H) html += '<span class="gc-jorgoth-tag-fuse">⚔ Best Fuse</span>';
        html += '</td>';
        html += '</tr>';
    });

    // T3 rows (cheaper alternatives)
    var t3Best = {};
    var t3AllSame = {};
    statCols.forEach(function(col) {
        var vals = t3Rows.map(function(r) { return r[col]; });
        t3Best[col] = Math.max.apply(null, vals);
        t3AllSame[col] = vals[0] === vals[1] && vals[1] === vals[2];
    });

    function t3HlClass(col, val) {
        if (t3AllSame[col] || val <= 0) return '';
        return val === t3Best[col] ? ' class="gc-jorgoth-highlight gc-jorgoth-highlight-dim"' : '';
    }

    var colCount = hasHeal ? 8 : 7;
    html += '<tr class="gc-jorgoth-t3-separator"><td colspan="' + colCount + '"></td></tr>';
    t3Rows.forEach(function(r) {
        var isMasterpiece = r.tag === 'masterpiece';
        var isExtended = r.tag === 'extended';
        var rowClass = isMasterpiece ? ' gc-jorgoth-row-mp' : '';
        html += '<tr class="gc-jorgoth-row gc-jorgoth-row-t3' + rowClass + '">';
        html += '<td class="gc-jorgoth-variant">' + r.label + '</td>';
        html += '<td' + t3HlClass('bonusAtk', r.bonusAtk) + '>' + (r.bonusAtk || '-') + '</td>';
        html += '<td' + t3HlClass('crit', r.crit) + '>' + (r.crit || '-') + '</td>';
        html += '<td' + t3HlClass('acc', r.acc) + '>' + (r.acc || '-') + '</td>';
        html += '<td' + t3HlClass('def', r.def) + '>' + r.def + '</td>';
        html += '<td' + t3HlClass('hp', r.hp) + '>' + r.hp.toLocaleString() + '</td>';
        if (hasHeal) {
            html += '<td' + t3HlClass('heal', r.heal) + '>' + (r.heal || '-') + '</td>';
        }
        html += '<td class="gc-jorgoth-tags">';
        if (isMasterpiece) html += '<span class="gc-jorgoth-tag-mp">✦ Masterpiece</span>';
        if (isExtended) html += '<span class="gc-jorgoth-tag-ext">⟐ Extended</span>';
        if (is2H) {
            var atkDiff = Math.floor(r.data.baseAtk / 10) - r.fuseAtk;
            if (atkDiff > 0) html += '<span class="gc-jorgoth-tag-t3">⚔ Fuse −' + atkDiff + ' atk</span>';
        }
        html += '</td>';
        html += '</tr>';
    });

    html += '</tbody></table>';

    // T2 Requirements section
    var t2Sources = (typeof JORGOTH_T2_SOURCES !== 'undefined') && JORGOTH_T2_SOURCES[weaponType];
    if (t2Sources) {
        html += '<div class="gc-jorgoth-t2-section">';
        html += '<div class="gc-jorgoth-t2-section-title">T2 Weapons Needed to Upgrade to T3</div>';
        html += '<div class="gc-jorgoth-t2-cards">';
        ['v1', 'v2', 'v3'].forEach(function(vk) {
            var t2 = t2Sources[vk];
            if (!t2) return;
            html += '<div class="gc-jorgoth-t2-card">';
            html += '<div class="gc-jorgoth-t2-card-header">T3 ' + vk + ' needs</div>';
            html += '<div class="gc-jorgoth-t2-card-name">' + t2.name + '</div>';
            html += '<div class="gc-jorgoth-t2-card-stats">';
            if (t2.attack) html += '<span class="gc-jorgoth-t2-stat">Attack +<b>' + t2.attack + '</b></span>';
            if (t2.crit)   html += '<span class="gc-jorgoth-t2-stat">Crit +<b>' + t2.crit + '</b></span>';
            if (t2.acc)    html += '<span class="gc-jorgoth-t2-stat">Accuracy +<b>' + t2.acc + '</b></span>';
            if (t2.healingBoost) html += '<span class="gc-jorgoth-t2-stat">Healing Boost +<b>' + t2.healingBoost + '</b></span>';
            if (t2.physicalDef)  html += '<span class="gc-jorgoth-t2-stat">Physical Defence +<b>' + t2.physicalDef + '</b></span>';
            if (t2.magicalDef)   html += '<span class="gc-jorgoth-t2-stat">Magical Defence +<b>' + t2.magicalDef + '</b></span>';
            if (t2.hp)     html += '<span class="gc-jorgoth-t2-stat">HP +<b>' + t2.hp.toLocaleString() + '</b></span>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function buildCollDropdown(pid, key, label) {
    var lvl = (state[pid].collLevels && state[pid].collLevels[key]) || 7;
    
    var html = '<div class="gc-coll-level-box" style="display:flex; flex-direction:column; align-items:center; gap:4px;">';
    html += '<span class="gc-coll-level-label">' + label + '</span>';
    
    // Added gc-coll-select class and data-type
    html += '<select class="gc-coll-select gc-coll-level-select" data-type="' + key + '" onchange="GC.setCollectionLevel(' + pid + ',\'' + key + '\',this.value)">';
    
    for (var i = 1; i <= 7; i++) {
        var sel = (i == lvl) ? ' selected' : '';
        // Initially show ONLY the level number for the closed state
        html += '<option value="' + i + '"' + sel + '>' + i + '</option>';
    }
    
    html += '</select>';
    html += '</div>';
    return html;
}

// Helper to get Aion-specific collection stats based on your calculation arrays
function getCollectionStatDescription(type, level) {
    // These match your sources.collections logic exactly
    var statsMap = {
        'normal':   { name: 'Accuracy', values: [0, 10, 15, 20, 30, 45, 60] },
        'large':    { name: 'Defences', values: [0, 6, 10, 12, 14, 18, 22] },
        'powerful': { name: 'Attack',   values: [0, 8, 12, 16, 20, 24, 28] }
    };
    
    var data = statsMap[type];
    if (!data) return "Lv. " + level;

    // Conver level to a Number to be safe
    var lvlIdx = parseInt(level);

    // level is 1-6, but array is 0-indexed. 
    // If level is 1, it takes values[1], which is the first non-zero bonus.
    var bonus = data.values[level-1] || 0;
    
    return "Lv. " + lvlIdx + " (+" + bonus + " " + data.name + ")";
}

// Listener to swap text when clicking the dropdown
document.addEventListener('focusin', function(e) {
    if (e.target.classList.contains('gc-coll-select')) {
        var type = e.target.getAttribute('data-type');
        Array.from(e.target.options).forEach(function(opt) {
            opt.text = getCollectionStatDescription(type, opt.value);
        });
    }
});

// Listener to revert to just the number when closed
document.addEventListener('focusout', function(e) {
    if (e.target.classList.contains('gc-coll-select')) {
        Array.from(e.target.options).forEach(function(opt) {
            opt.text = opt.value; 
        });
    }
});

function renderWeaponConfig() {
    var el = document.getElementById('weapon-config');
    var classInfo = CLASS_DATA[selectedClass];
    var mainType = weaponConfig.mainType;
    var mainIs2H = WEAPON_TYPES[mainType].twoHanded;
    var wt = WEAPON_TYPES[mainType];
    var ohType = weaponConfig.offHandType;

    var html = '<div class="gc-profile-header"><span class="gc-wc-title">⚔️ Weapon Setup</span><button class="gc-reset-btn" onclick="GC.resetWeapons()" title="Reset to defaults">↺</button></div>';
    html += '<div class="gc-wc-slots">';

    // Main weapon - icon picker
    html += '<div class="gc-wc-item">';
    html += '<div class="gc-wc-item-label">Main</div>';
    html += '<div class="gc-icon-picker" onclick="GC.togglePicker(\'main-picker\')">';
    html += '<img src="' + wt.icon + '" alt="' + wt.name + '" title="' + wt.name + '">';
    html += '</div>';
    html += '<div class="gc-icon-picker-menu" id="main-picker">';
    classInfo.weapons.forEach(function(wKey) {
        var w = WEAPON_TYPES[wKey];
        var sel = mainType === wKey ? ' gc-picker-selected' : '';
        html += '<div class="gc-picker-option' + sel + '" onclick="GC.pickMainWeapon(\'' + wKey + '\')" title="' + w.name + '">';
        html += '<img src="' + w.icon + '" alt="' + w.name + '">';
        html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    // Off-hand - icon picker (unified: none/shield/fuse/weapons)
    var ohChoices = getOffHandChoices(mainType, selectedClass);
    var ohKey = getCurrentOffHandKey();
    var ohChoice = ohChoices.find(function(c) { return c.key === ohKey; }) || ohChoices[0];
    html += '<div class="gc-wc-item">';
    html += '<div class="gc-wc-item-label">Off-Hand</div>';
    html += '<div class="gc-icon-picker' + (ohChoice.key === 'none' ? ' gc-icon-picker-empty' : '') + '" onclick="GC.togglePicker(\'off-picker\')">';
    if (ohChoice.key !== 'none') {
        html += '<img src="' + ohChoice.icon + '" alt="' + ohChoice.label + '" title="' + ohChoice.label + '">';
    }
    html += '</div>';
    html += '<div class="gc-icon-picker-menu" id="off-picker">';
    ohChoices.forEach(function(c) {
        var sel = c.key === ohKey ? ' gc-picker-selected' : '';
        html += '<div class="gc-picker-option' + sel + (c.key === 'none' ? ' gc-picker-none' : '') + '" onclick="GC.pickOffHand(\'' + c.key + '\')" title="' + c.label + '">';
        if (c.key === 'none') {
            html += '<span class="gc-picker-x">✕</span>';
        } else {
            html += '<img src="' + c.icon + '" alt="' + c.label + '">';
        }
        html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    // -- Jorgoth button (inline with weapon pickers) --
    if (JORGOTH_WEAPONS[mainType]) {
        html += '<button class="gc-jorgoth-btn" onclick="GC.openJorgothModal()" title="View Jorgoth weapon variants">📊 Jorgoth Variants</button>';
    }

    html += '</div>';

    el.innerHTML = html;

    // Update the Jorgoth modal content for the current weapon type
    var modalBody = document.getElementById('gc-jorgoth-modal-body');
    if (modalBody) modalBody.innerHTML = buildJorgothLegend(mainType);
}

function renderProfile(id) {
    var container = document.getElementById('profile-' + id);
    var profile = state[id];
    var classInfo = CLASS_DATA[selectedClass];
    var material = getArmorMaterial(profile.armorType);
    var html = '';

    // -- Header --
    html += '<div class="gc-profile-header">';
    html += '<span class="gc-set-title" data-set="' + id + '">' + getSetName(id) + '</span>';
    html += '<button class="gc-reset-btn" onclick="GC.resetProfile(' + id + ')" title="Reset ' + getSetName(id) + ' to defaults">↺</button>';
    html += '</div>';

    // -- Weapons Section --
    html += '<div class="gc-section">';
    html += '<div class="gc-section-label-row">';
    html += '<span class="gc-section-label">🗡️ Weapons</span>';
    html += '<button class="gc-ms-btn" onclick="GC.openMinionModal(' + id + ')">Minions</button>';
    html += '<span class="gc-ms-btn" onclick="GC.openManaModal(' + id + ')" title="Manastones"><img src="' + MANASTONE_ICON + '" alt="Manastones"> Manastones</span>';
    html += '</div>';
    html += '<div class="gc-armor-columns">';
    // -- Left: Main Weapon --
    html += '<div class="gc-armor-col">';
    var mwt = WEAPON_TYPES[weaponConfig.mainType];
    html += '<div class="gc-armor-row">';
    var mwSetObj = WEAPON_SETS.find(function(s){return s.key===profile.mainWeapon.set;});
    html += '<div class="gc-set-trigger" onclick="GC.openSetPicker(' + id + ',\'main-weapon\',this)">';
    if (profile.mainWeapon.set === 'none') {
        html += '<div class="gc-slot-icon gc-slot-icon-none"><img src="' + getEmptySlotIcon('mainWeapon') + '" alt="None" title="None"></div>';
    } else {
        html += '<div class="gc-slot-icon"><img src="' + mwt.icon + '" alt="' + mwt.name + '" title="' + mwt.name + '"></div>';
    }
    html += '<div class="gc-set-text">';
    html += '<span class="gc-set-name">' + mwSetObj.name + '</span>';
    if (profile.mainWeapon.set !== 'none') {
        html += msIndicator(id, 'mainWeapon', profile.mainWeapon.set, profile);
    }
    html += '</div>';
    html += '</div>';
    if (profile.mainWeapon.set !== 'none') {
        var hasMwEnchant = (profile.mainWeapon.set === 'acrimony' || profile.mainWeapon.set === 'presumption');
        if (hasMwEnchant) {
            html += '<span class="gc-enchant-trigger" onclick="GC.openEnchantPicker(' + id + ',\'main-weapon\',this)">+' + profile.mainWeapon.enchant + '</span>';
        }
        var mwTag = getJorgothTag(weaponConfig.mainType, profile.mainWeapon.set);
        if (mwTag) {
            var tagClass = mwTag === 'masterpiece' ? 'gc-weapon-tag-masterpiece' : 'gc-weapon-tag-extended';
            var tagLabel = mwTag === 'masterpiece' ? '✦ Masterpiece' : '⟐ Extended';
            html += '<span class="gc-weapon-tag ' + tagClass + '">' + tagLabel + '</span>';
        }
        // Main weapon bonus trigger
        var mwFixed = WEAPON_STATS_FIXED[profile.mainWeapon.set];
        if (mwFixed && mwFixed.bonuses) {
            var mwMaxB = mwFixed.maxBonuses;
            var mwPicked = profile.mainWeapon.bonuses || [];
            html += '<span class="gc-acc-bonus-trigger" onclick="GC.openWeaponBonusPopup(' + id + ',\'mainWeapon\',this)" title="Click to edit bonuses">';
            html += 'Bonuses (' + mwPicked.length + '/' + mwMaxB + ')';
            html += '</span>';
        }
    }
    html += '</div>';
    html += '</div>';
    // -- Right: Off-Hand / Shield / Fuse --
    html += '<div class="gc-armor-col">';
    var effectiveOH = getEffectiveOffHandType(profile);
    if (effectiveOH !== 'none') {
        var ohType = effectiveOH;
        if (ohType === 'shield') {
            // -- Shield section --
            var sh = profile.shield;
            var shData = SHIELD_STATS[sh.set];
            var shSetObj = SHIELD_SETS.find(function(s) { return s.key === sh.set; }) || SHIELD_SETS[0];

            html += '<div class="gc-armor-row">';
            html += '<div class="gc-set-trigger" onclick="GC.openSetPicker(' + id + ',\'shield\',this)">';
            if (sh.set === 'none') {
                html += '<div class="gc-slot-icon gc-slot-icon-none"><img src="' + getEmptySlotIcon('shield') + '" alt="None" title="None"></div>';
            } else {
                html += '<div class="gc-slot-icon"><img src="../assets/icons/icon_item_equip_shield_f01.png" alt="Shield" title="Shield"></div>';
            }
            html += '<span class="gc-set-name">' + shSetObj.name + '</span>';
            html += '</div>';
            if (sh.set !== 'none') {
                var shTypeLabel = sh.type === 'scale' ? 'Scale (Magical)' : 'Battle (Physical)';
                html += '<span class="gc-enchant-trigger gc-shield-trigger" onclick="GC.openShieldTypePicker(' + id + ',this)">' + shTypeLabel + '</span>';
                // Shield bonus trigger
                if (shData) {
                    var maxB = shData.maxBonuses;
                    var typeKey = sh.type === 'scale' ? 'scale' : 'battle';
                    var picked = sh.bonuses || [];
                    html += '<span class="gc-acc-bonus-trigger" onclick="GC.openShieldBonusPopup(' + id + ',this)" title="Click to edit bonuses">';
                    html += 'Bonuses (' + picked.length + '/' + maxB + ')';
                    html += '</span>';
                }
            }
            html += '</div>';
        } else {
            // Non-shield off-hand (fuse / weapon)
            var ohIcon, ohLabel;
            if (ohType === 'fuse') {
                ohIcon = mwt.icon;
                ohLabel = 'Fuse';
            } else {
                var ohWt = WEAPON_TYPES[weaponConfig.offHandWeaponType];
                ohIcon = ohWt.icon;
                ohLabel = ohWt.name;
            }
            var ohSets = getAllowedOffHandWeaponSets(profile.mainWeapon.set, weaponConfig.mainType, weaponConfig.offHandType);
            html += '<div class="gc-armor-row">';
            var ohSetObj = ohSets.find(function(s){return s.key===profile.offHand.set;}) || ohSets[0];
            html += '<div class="gc-set-trigger" onclick="GC.openSetPicker(' + id + ',\'off-weapon\',this)">';
            if (profile.offHand.set === 'none') {
                html += '<div class="gc-slot-icon gc-slot-icon-none"><img src="' + getEmptySlotIcon('offHand') + '" alt="None" title="None"></div>';
            } else {
                html += '<div class="gc-slot-icon"><img src="' + ohIcon + '" alt="' + ohLabel + '" title="' + ohLabel + '"></div>';
            }
            html += '<div class="gc-set-text">';
            html += '<span class="gc-set-name">' + ohSetObj.name + '</span>';
            if (profile.offHand.set !== 'none') {
                html += msIndicator(id, 'offHand', profile.offHand.set, profile);
            }
            html += '</div>';
            html += '</div>';
            if (profile.offHand.set !== 'none') {
                var hasOhEnchant = (profile.offHand.set === 'acrimony' || profile.offHand.set === 'presumption');
                if (hasOhEnchant && ohType !== 'fuse') {
                    html += '<span class="gc-enchant-trigger" onclick="GC.openEnchantPicker(' + id + ',\'off-weapon\',this)">+' + profile.offHand.enchant + '</span>';
                }
                // Off-hand weapon bonus trigger
                var ohFixed = WEAPON_STATS_FIXED[profile.offHand.set];
                if (ohFixed && ohFixed.bonuses) {
                    var ohMaxB = ohFixed.maxBonuses;
                    var ohPicked = profile.offHand.bonuses || [];
                    html += '<span class="gc-acc-bonus-trigger" onclick="GC.openWeaponBonusPopup(' + id + ',\'offHand\',this)" title="Click to edit bonuses">';
                    html += 'Bonuses (' + ohPicked.length + '/' + ohMaxB + ')';
                    html += '</span>';
                }
            }
            html += '</div>';
        }
    }
    html += '</div>';
    html += '</div></div>';

    // -- Armor Section --
    html += '<div class="gc-section">';
    html += '<div class="gc-section-label-row">';
    html += '<span class="gc-section-label">🛡️ Armor</span>';
    if (classInfo.armorTypes.length > 1) {
        var currentAtOpt = ARMOR_TYPE_OPTIONS.find(function(o) { return o.key === profile.armorType; });
        html += '<span class="gc-enchant-trigger gc-shield-trigger" onclick="GC.openArmorTypePicker(' + id + ',this)">' + currentAtOpt.name + '</span>';
    } else {
        var singleOpt = ARMOR_TYPE_OPTIONS.find(function(o) { return o.key === classInfo.armorTypes[0]; });
        html += '<span class="gc-armor-type-badge">' + singleOpt.name + '</span>';
    }
    html += '</div>';

    var LEFT_SLOTS  = ['helmet', 'chest', 'pants'];
    var RIGHT_SLOTS = ['shoulders', 'gloves', 'boots'];
    html += '<div class="gc-armor-columns">';
    html += '<div class="gc-armor-col">';
    LEFT_SLOTS.forEach(function(key) {
        var slot = ARMOR_SLOTS.find(function(s) { return s.key === key; });
        html += renderArmorSlot(id, slot, profile.armor[slot.key], profile, material);
    });
    html += '</div>';
    html += '<div class="gc-armor-col">';
    RIGHT_SLOTS.forEach(function(key) {
        var slot = ARMOR_SLOTS.find(function(s) { return s.key === key; });
        html += renderArmorSlot(id, slot, profile.armor[slot.key], profile, material);
    });
    html += '</div>';
    html += '</div></div>';

    // -- Accessories Section --
    html += '<div class="gc-section">';
    html += '<div class="gc-section-label">💎 Accessories</div>';
    // Upper row: feather, wings, bracelet
    html += '<div class="gc-acc-upper">';
    ACCESSORY_SLOTS_UPPER.forEach(function(sl) {
        html += '<div class="gc-acc-upper-item">';
        html += renderAccessorySlot(id, sl, profile.accessories[sl.key], profile);
        html += '</div>';
    });
    html += '</div>';
    // Lower: 2 columns
    html += '<div class="gc-armor-columns">';
    html += '<div class="gc-armor-col">';
    ACCESSORY_SLOTS_LOWER_L.forEach(function(sl) {
        html += renderAccessorySlot(id, sl, profile.accessories[sl.key], profile);
    });
    html += '</div>';
    html += '<div class="gc-armor-col">';
    ACCESSORY_SLOTS_LOWER_R.forEach(function(sl) {
        html += renderAccessorySlot(id, sl, profile.accessories[sl.key], profile);
    });
    html += '</div>';
    html += '</div>';
    html += renderGlyphSlot(id, { key: 'glyph', name: 'Glyph', icon: '../assets/icons/icon_item_equip_badge_a01.png' }, profile.glyph, profile);
    // Starshine set bonus indicators (both below all accessories)
    if (profile.accessories.feather.set === 'starshine' &&
        profile.accessories.wings.set === 'starshine' &&
        profile.accessories.bracelet.set === 'starshine') {
        html += '<div class="gc-acc-setbonus">✦ Set (3/3): +190 Atk, +' + (isPhysicalClass(selectedClass) ? '375 PDef, +650 MDef' : '650 PDef, +375 MDef') + '</div>';
    }
    var _hsE = profile.accessories.earring1.set === 'starshine' || profile.accessories.earring2.set === 'starshine';
    var _hsR = profile.accessories.ring1.set === 'starshine' || profile.accessories.ring2.set === 'starshine';
    if (_hsE && profile.accessories.necklace.set === 'starshine' && _hsR && profile.accessories.belt.set === 'starshine') {
        html += '<div class="gc-acc-setbonus">✦ Set (4/4): +335 Atk</div>';
    }
    html += '</div>';

    container.innerHTML = html;
}

function renderAccessorySlot(pid, slotDef, accState, profile) {
    var setObj = ACCESSORY_SETS.find(function(s) { return s.key === accState.set; });
    var isFramed = accState.set === 'starshine';
    var isNone = accState.set === 'none';
    var html = '<div class="gc-armor-row">';
    html += '<div class="gc-set-trigger" onclick="GC.openSetPicker(' + pid + ',\'acc:' + slotDef.key + '\',this)">';
    if (isNone) {
        html += '<div class="gc-slot-icon gc-slot-icon-none"><img src="' + getEmptySlotIcon(slotDef.key) + '" alt="None" title="None"></div>';
    } else if (isFramed) {
        html += '<div class="gc-slot-icon gc-slot-icon-framed">';
        html += '<img src="' + slotDef.icon + '" alt="' + slotDef.name + '" title="' + slotDef.name + '">';
        html += '<img src="../assets/icons/icon_frame_2.png" class="gc-slot-icon-frame">';
        html += '</div>';
    } else {
        html += '<div class="gc-slot-icon"><img src="' + slotDef.icon + '" alt="' + slotDef.name + '" title="' + slotDef.name + '"></div>';
    }
    html += '<div class="gc-set-text">';
    html += '<span class="gc-set-name">' + setObj.name + '</span>';
    if (!isNone) {
        html += msIndicator(pid, slotDef.key, accState.set, profile);
    }
    html += '</div>';
    html += '</div>'; // close gc-set-trigger
    if (!isNone) {
        // Bonus popup trigger (selectable sets)
        var statsType = ACC_STATS_TYPE[slotDef.key];
        var setData = ACCESSORY_STATS[accState.set];
        if (setData) {
            var slotData = setData[statsType];
            if (slotData && slotData.bonuses) {
                var maxB = slotData.maxBonuses;
                var picked = accState.bonuses || [];
                html += '<span class="gc-acc-bonus-trigger" onclick="GC.openAccBonusPopup(' + pid + ',\'' + slotDef.key + '\',this)" title="Click to edit bonuses">';
                html += 'Bonuses (' + picked.length + '/' + maxB + ')';
                html += '</span>';
            }
        }
    }
    html += '</div>'; // close gc-armor-row
    return html;
}

function renderGlyphSlot(pid, slotDef, accState, profile)
{
    // Special handling for glyph
    if (slotDef.key === 'glyph') {
        var glyphEnabled = accState.enabled !== false;
        var html = '<div class="gc-armor-row">';
        html += '<div class="gc-set-trigger gc-glyph-label" onclick="GC.toggleGlyph(' + pid + ')" style="cursor:pointer">';
        if (glyphEnabled) {
            html += '<div class="gc-slot-icon"><img src="' + slotDef.icon + '" alt="Glyph" title="Glyph"></div>';
        } else {
            html += '<div class="gc-slot-icon gc-slot-icon-none"><img src="' + getEmptySlotIcon('glyph') + '" alt="None" title="None"></div>';
        }
        html += '<div class="gc-set-text">';
        html += '<span class="gc-set-name">' + (glyphEnabled ? 'Glyph' : 'None') + '</span>';
        html += '</div>';
        html += '</div>';

        if (glyphEnabled) {
            // Single selectable bonus (radio-style)
            var glyphBonuses = ACC_BONUSES_GLYPH;
            var picked = accState.bonuses && accState.bonuses.length ? accState.bonuses[0] : null;
            html += '<div class="gc-glyph-bonus-row">';
            html += '<span class="gc-glyph-bonus-label">Bonus:</span>';
            glyphBonuses.forEach(function(b) {
                var isOn = picked === b.key;
                html += '<label class="gc-glyph-bonus-radio">';
                html += '<input type="radio" name="glyph-bonus-' + pid + '" value="' + b.key + '"'
                    + (isOn ? ' checked' : '')
                    + ' onchange="GC.setGlyphBonus(' + pid + ',\'' + b.key + '\')">';
                if (isOn) {
                    var cv = (accState.bonusValues && typeof accState.bonusValues[b.key] === 'number') ? accState.bonusValues[b.key] : b.value;
                    html += '<span>' + b.name + ' <b>+</b></span>';
                    html += '<input type="number" class="gc-bonus-val-input gc-glyph-bonus-val-input" min="0" max="' + b.value + '" value="' + cv + '" onclick="event.stopPropagation()" onchange="GC.setBonusValue(' + pid + ',\'glyph\',\'\',\'' + b.key + '\',this.value,' + b.value + ')">';
                } else {
                    html += '<span>' + b.name + ' <b>+' + b.value + '</b></span>';
                }
                html += '</label>';
            });
            html += '</div>';

            // Extra numeric inputs for attack, physicalDef, magicalDef
            var glyphExtra = accState.extra || { attack: 0, physicalDef: 0, magicalDef: 0 };
            html += '<div class="gc-glyph-extra-row">';
            html += '<span class="gc-glyph-bonus-label">Enchant:</span>';
            ['attack', 'physicalDef', 'magicalDef'].forEach(function(stat) {
                var label = stat === 'attack' ? 'Attack' : (stat === 'physicalDef' ? 'Phys. Def' : 'Mag. Def');
                var val = glyphExtra[stat] || 0;
                html += '<label class="gc-glyph-extra-label">' + label +
                    ' <input type="number" min="0" max="250" value="' + val + '"'
                    + ' oninput="GC.setGlyphExtra(' + pid + ',\'' + stat + '\',this.value)"></label>';
            });
            html += '</div>';
        }

        html += '</div>'; // close gc-armor-row
        return html;
    }
}

function renderArmorSlot(pid, slot, armor, profile, material) {
    var iconUrl = getArmorIcon(material, slot.iconKey);
    var slotOath = profile.oath[slot.key];
    var oathIconUrl = getOathIcon(slot.key, slotOath);
    var apsuInfo = APSU_DATA[selectedClass];
    var isApsuSlot = !!(apsuInfo && apsuInfo.slot === slot.key);
    var html = '<div class="gc-armor-row">';

    // Armor set picker (icon + name)
    var armorSetObj = ARMOR_SETS.find(function(s){return s.key===armor.set;});
    html += '<div class="gc-set-trigger" onclick="GC.openSetPicker(' + pid + ',\'armor:' + slot.key + '\',this)">';
    if (armor.set === 'none') {
        html += '<div class="gc-slot-icon gc-slot-icon-none"><img src="' + getEmptySlotIcon(slot.key) + '" alt="None" title="None"></div>';
    } else {
        html += '<div class="gc-slot-icon"><img src="' + iconUrl + '" alt="' + slot.key + '" title="' + armorSetObj.name + '"></div>';
    }
    html += '<div class="gc-set-text">';
    var armorSetName = armorSetObj.name;
    if (isApsuSlot && profile.apsuEnabled && armor.set === 'fighting-spirit') {
        armorSetName = 'Apsu';
    }
    html += '<span class="gc-set-name">' + armorSetName + '</span>';
    if (armor.set !== 'none') {
        html += msIndicator(pid, slot.key, armor.set, profile);
    }
    html += '</div>';
    html += '</div>';

    // Skip enchant, bonuses, and oath for empty slot
    if (armor.set === 'none') {
        html += '</div>';
        return html;
    }

    // Enchant (only for acrimony/presumption)
    var hasArmorEnchant = (armor.set === 'acrimony' || armor.set === 'presumption' || armor.set === 'obstinacy');
    if (hasArmorEnchant) {
        html += '<span class="gc-enchant-trigger" onclick="GC.openEnchantPicker(' + pid + ',\'armor:' + slot.key + '\',this)">+' + armor.enchant + '</span>';
    }
    // Bonus popup trigger (only for fighting spirit, which has selectable bonuses)
    if (armor.set === 'fighting-spirit') {
        var picked = armor.bonuses || [];
        var label = 'Bonuses (' + picked.length + '/4)';
        html += '<span class="gc-acc-bonus-trigger" onclick="GC.openArmorBonusPopup(' + pid + ',\'' + slot.key + '\',this)" title="Click to edit bonuses">' + label + '</span>';
    }
    // Oath icon trigger
    html += '<div class="gc-oath-picker-wrap">';
    if (oathIconUrl) {
        var isFramed = (slotOath === 'silent-skill');
        html += '<div class="gc-icon-picker gc-oath-pick" onclick="GC.openOathPicker(' + pid + ',\'' + slot.key + '\',this)">';
        html += '<img src="' + oathIconUrl + '" alt="' + slotOath + '" title="' + (OATH_OPTIONS.find(function(o){return o.key===slotOath;})||{}).name + '"' + (isFramed ? ' class="gc-oath-img-framed"' : '') + '>';
        html += '</div>';
    } else {
        html += '<div class="gc-icon-picker gc-oath-pick gc-icon-picker-empty" onclick="GC.openOathPicker(' + pid + ',\'' + slot.key + '\',this)">';
        html += '</div>';
    }
    html += '</div>';

    html += '</div>';
    return html;
}
