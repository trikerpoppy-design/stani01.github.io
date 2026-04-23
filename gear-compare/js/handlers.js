'use strict';


window.GC = {
    selectClass: function(className) {
        var prevClass = selectedClass;
        selectedClass = className;
        var cls = CLASS_DATA[className];
        // Always reset weapon config to class defaults
        weaponConfig = createDefaultWeaponConfig(className);
        setOrder.forEach(function(id) {
            var p = state[id];
            if (cls.armorTypes.indexOf(p.armorType) === -1) {
                p.armorType = cls.armorTypes[0];
            }

            // Clamp bonus values that were elevated by a previous class's Apsu bonusOverride
            var prevApsu = APSU_DATA[prevClass];
            if (prevApsu && prevApsu.bonusOverride && p.apsuEnabled) {
                var piece = p.armor[prevApsu.slot];
                if (piece && piece.bonusValues) {
                    var isHigh = (prevApsu.slot === 'helmet' || prevApsu.slot === 'chest' || prevApsu.slot === 'pants');
                    var fsBonusList = isHigh ? FS_BONUSES_HIGH : FS_BONUSES_LOW;
                    for (var bk in prevApsu.bonusOverride) {
                        var fsDef = fsBonusList.find(function(b) { return b.key === bk; });
                        if (fsDef && typeof piece.bonusValues[bk] === 'number' && piece.bonusValues[bk] > fsDef.value) {
                            piece.bonusValues[bk] = fsDef.value;
                        }
                    }
                }
            }
            // If the new class has Apsu with bonusOverride and Apsu is enabled, raise values
            var newApsu = APSU_DATA[className];
            if (newApsu && newApsu.bonusOverride && p.apsuEnabled) {
                var newPiece = p.armor[newApsu.slot];
                if (newPiece) {
                    if (!newPiece.bonusValues) newPiece.bonusValues = {};
                    var isHighNew = (newApsu.slot === 'helmet' || newApsu.slot === 'chest' || newApsu.slot === 'pants');
                    var fsListNew = isHighNew ? FS_BONUSES_HIGH : FS_BONUSES_LOW;
                    for (var bk2 in newApsu.bonusOverride) {
                        var fsDefNew = fsListNew.find(function(b) { return b.key === bk2; });
                        if (fsDefNew) {
                            var cur = newPiece.bonusValues[bk2];
                            if (cur === undefined || cur === fsDefNew.value) {
                                newPiece.bonusValues[bk2] = newApsu.bonusOverride[bk2];
                            }
                        }
                    }
                }
            }

            var classApsu = APSU_DATA[className];
            if (!classApsu || !p.armor[classApsu.slot] || p.armor[classApsu.slot].set !== 'fighting-spirit') {
                p.apsuEnabled = false;
            }
        });
        renderAll();
        saveState();
    },

    setArmorType: function(pid, armorType) {
        state[pid].armorType = armorType;
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    toggleApsu: function(pid, slotKey) {
        var p = state[pid];
        var apsuInfo = APSU_DATA[selectedClass];
        if (!apsuInfo) return;
        if (slotKey && slotKey !== apsuInfo.slot) return;

        var piece = p.armor[apsuInfo.slot];
        if (!piece || piece.set !== 'fighting-spirit') {
            p.apsuEnabled = false;
            renderProfile(pid);
            updateComparison();
            saveState();
            return;
        }

        p.apsuEnabled = !p.apsuEnabled;
        if (apsuInfo && apsuInfo.bonusOverride) {
            if (piece) {
                if (!piece.bonusValues) piece.bonusValues = {};
                var isHigh = (apsuInfo.slot === 'helmet' || apsuInfo.slot === 'chest' || apsuInfo.slot === 'pants');
                var fsBonusList = isHigh ? FS_BONUSES_HIGH : FS_BONUSES_LOW;
                for (var bk in apsuInfo.bonusOverride) {
                    var fsDef = fsBonusList.find(function(b) { return b.key === bk; });
                    if (!fsDef) continue;
                    if (p.apsuEnabled) {
                        // Upgrade: if at FS default (or unset), raise to Apsu max
                        var cur = piece.bonusValues[bk];
                        if (cur === undefined || cur === fsDef.value) {
                            piece.bonusValues[bk] = apsuInfo.bonusOverride[bk];
                        }
                    } else {
                        // Downgrade: clamp back to FS max
                        if (typeof piece.bonusValues[bk] === 'number' && piece.bonusValues[bk] > fsDef.value) {
                            piece.bonusValues[bk] = fsDef.value;
                        }
                    }
                }
            }
        }
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    setArmor: function(pid, slotKey, setKey) {
        state[pid].armor[slotKey].set = setKey;
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    setArmorEnchant: function(pid, slotKey, level) {
        state[pid].armor[slotKey].enchant = parseInt(level);
        updateComparison();
        saveState();
    },

    setOath: function(pid, slotKey, oath) {
        state[pid].oath[slotKey] = oath;
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    // Shared weapon config handlers
    setMainWeaponType: function(type) {
        weaponConfig.mainType = type;
        var allowed = getAllowedOffHand(type, selectedClass);
        // If current off-hand type is no longer allowed, reset to default
        if (allowed.indexOf(weaponConfig.offHandType) === -1) {
            weaponConfig.offHandType = getDefaultOffHand(type, selectedClass);
        }
        // Update off-hand weapon type default
        weaponConfig.offHandWeaponType = getDefaultOffHandWeapon(type, selectedClass);
        renderWeaponConfig();
        setOrder.forEach(function(id) { renderProfile(id); });
        updateComparison();
        saveState();
    },

    setOffHandType: function(type) {
        weaponConfig.offHandType = type;
        setOrder.forEach(function(id) {
            // Validate off-hand set against new type and main weapon level
            if (type !== 'none' && !isOffHandSetAllowed(state[id].mainWeapon.set, state[id].offHand.set, weaponConfig.mainType, type)) {
                state[id].offHand.set = getDefaultOffHandSet(state[id].mainWeapon.set, weaponConfig.mainType, type);
            }
        });
        renderWeaponConfig();
        setOrder.forEach(function(id) { renderProfile(id); });
        updateComparison();
        saveState();
    },

    setOffHandWeaponType: function(type) {
        weaponConfig.offHandWeaponType = type;
        renderWeaponConfig();
        setOrder.forEach(function(id) { renderProfile(id); });
        updateComparison();
        saveState();
    },

    // Per-profile weapon set/enchant
    setWeaponSet: function(pid, slot, setKey) {
        if (slot === 'main') {
            state[pid].mainWeapon.set = setKey;
            // When main weapon changes, validate off-hand set against new main weapon level
            if (weaponConfig.offHandType !== 'none' && !isOffHandSetAllowed(setKey, state[pid].offHand.set, weaponConfig.mainType, weaponConfig.offHandType)) {
                state[pid].offHand.set = getDefaultOffHandSet(setKey, weaponConfig.mainType, weaponConfig.offHandType);
            }
        } else {
            // For off-hand, validate against current eligibility rules
            if (weaponConfig.offHandType !== 'none') {
                if (!isOffHandSetAllowed(state[pid].mainWeapon.set, setKey, weaponConfig.mainType, weaponConfig.offHandType)) {
                    // Fallback to default allowed set
                    setKey = getDefaultOffHandSet(state[pid].mainWeapon.set, weaponConfig.mainType, weaponConfig.offHandType);
                }
            }
            state[pid].offHand.set = setKey;
        }
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    setWeaponEnchant: function(pid, slot, level) {
        if (slot === 'main') {
            state[pid].mainWeapon.enchant = parseInt(level);
        } else {
            state[pid].offHand.enchant = parseInt(level);
        }
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    copyProfile: function(from, to) {
        if (!from || !to) return;
        state[to] = JSON.parse(JSON.stringify(state[from]));
        traitSelections[to] = JSON.parse(JSON.stringify(traitSelections[from] || {}));
        saveTraitSelections();
        renderAll();
        saveState();
        showShareToast('\u2713 ' + getSetName(from) + ' copied to ' + getSetName(to));
    },

    openCopyPopup: function() {
        var existing = document.getElementById('gc-copy-popup');
        if (existing) { existing.remove(); document.removeEventListener('click', closeCopyPopupOutside, true); return; }
        var btn = document.getElementById('gc-copy-btn');
        var popup = document.createElement('div');
        popup.id = 'gc-copy-popup';
        popup.className = 'gc-copy-popup';
        var html = '<div class="gc-copy-popup-title">Copy Set</div>';
        html += '<div class="gc-copy-popup-row">';
        html += '<label>From</label><select id="gc-copy-from">';
        setOrder.forEach(function(id) {
            html += '<option value="' + id + '">' + getSetName(id) + '</option>';
        });
        html += '</select>';
        html += '<span class="gc-copy-arrow">\u2192</span>';
        html += '<label>To</label><select id="gc-copy-to">';
        setOrder.forEach(function(id, i) {
            html += '<option value="' + id + '"' + (i === 1 ? ' selected' : '') + '>' + getSetName(id) + '</option>';
        });
        html += '</select>';
        html += '</div>';
        html += '<button class="gc-copy-popup-go" onclick="GC.doCopy()">Copy</button>';
        popup.innerHTML = html;
        btn.parentElement.style.position = 'relative';
        btn.parentElement.appendChild(popup);
        setTimeout(function() {
            document.addEventListener('click', closeCopyPopupOutside, true);
        }, 0);
    },

    doCopy: function() {
        var from = parseInt(document.getElementById('gc-copy-from').value);
        var to = parseInt(document.getElementById('gc-copy-to').value);
        var popup = document.getElementById('gc-copy-popup');
        if (popup) popup.remove();
        document.removeEventListener('click', closeCopyPopupOutside, true);
        if (from === to) { showShareToast('Source and target are the same', true); return; }
        GC.copyProfile(from, to);
    },

    addSet: function() {
        var id = addSet();
        if (!id) { showShareToast('Maximum ' + MAX_SETS + ' sets reached', true); return; }
        saveTraitSelections();
        renderAll();
        activateSetView(id);
        saveState();
        showShareToast('\u2713 ' + getSetName(id) + ' added');
    },

    removeSet: function(id) {
        if (setOrder.length <= 2) return;
        var name = getSetName(id);
        if (!removeSet(id)) return;
        saveTraitSelections();
        renderAll();
        saveState();
        showShareToast('\u2713 ' + name + ' removed');
    },

    setComparisonPair: function(side, setId) {
        if (setOrder.indexOf(setId) === -1) return;
        comparisonPair[side] = setId;
        updateComparison();
        saveState();
    },

    resetAll: function() {
        // Clean up any extra sets from localStorage
        setOrder.forEach(function(id) {
            if (id !== 1 && id !== 2) {
                try {
                    ['universal', 'typed', 'class'].forEach(function(sec) {
                        localStorage.removeItem('gcBuffCollapsed_' + sec + '_' + id);
                    });
                } catch (e) {}
                if (typeof formsActiveGrade !== 'undefined') delete formsActiveGrade[id];
            }
        });
        // Reset set metadata to defaults
        setOrder = [1, 2];
        setNames = { 1: 'Set 1', 2: 'Set 2' };
        comparisonPair = { a: 1, b: 2 };
        nextSetId = 3;
        activeSetId = 1;
        // Reset weapon config and profiles
        weaponConfig = createDefaultWeaponConfig(selectedClass);
        state = {};
        setOrder.forEach(function(id) {
            state[id] = createDefaultProfile(selectedClass);
            if (typeof formsActiveGrade !== 'undefined') formsActiveGrade[id] = 'ultimate';
        });
        traitSelections = {};
        setOrder.forEach(function(pid) {
            traitSelections[pid] = {};
            [81,82,83,84,85].forEach(function(lvl) { traitSelections[pid][lvl] = 0; });
        });
        saveTraitSelections();
        renderAll();
        saveState();
        var btn = document.querySelector('.gc-reset-all-btn');
        if (btn) {
            btn.classList.remove('gc-reset-flash');
            void btn.offsetWidth;
            btn.classList.add('gc-reset-flash');
        }
    },

    resetWeapons: function() {
        weaponConfig = createDefaultWeaponConfig(selectedClass);
        renderWeaponConfig();
        setOrder.forEach(function(id) { renderProfile(id); });
        updateComparison();
        saveState();
    },

    resetProfile: function(pid) {
        state[pid] = createDefaultProfile(selectedClass);
        renderProfile(pid);
        renderTransform(pid);
        updateComparison();
        saveState();
    },

    setTransform: function(pid, tfKey) {
        state[pid].transform = tfKey;
        if (tfKey === 'none') state[pid].transformEnchant = 0;
        renderTransform(pid);
        updateComparison();
        saveState();
    },

    setTransformEnchant: function(pid, lvl) {
        state[pid].transformEnchant = lvl;
        renderTransform(pid);
        updateComparison();
        saveState();
    },

    resetTransform: function(pid) {
        state[pid].transform = 'none';
        state[pid].transformEnchant = 0;
        renderTransform(pid);
        updateComparison();
        saveState();
    },

    // -- Forms Collection handlers --
    toggleForm: function(pid, formId) {
        if (!state[pid].ownedForms) state[pid].ownedForms = {};
        state[pid].ownedForms[formId] = !state[pid].ownedForms[formId];
        renderCollections(pid);
        updateComparison();
        saveState();
    },

    setFormsGrade: function(pid, grade) {
        formsActiveGrade[pid] = grade;
        renderCollections(pid);
        saveState();
    },

    selectAllForms: function(pid) {
        if (!state[pid].ownedForms) state[pid].ownedForms = {};
        ALL_FORM_IDS.forEach(function(id) { state[pid].ownedForms[id] = true; });
        renderCollections(pid);
        updateComparison();
        saveState();
    },

    deselectAllForms: function(pid) {
        if (!state[pid].ownedForms) state[pid].ownedForms = {};
        ALL_FORM_IDS.forEach(function(id) { state[pid].ownedForms[id] = false; });
        renderCollections(pid);
        updateComparison();
        saveState();
    },

    resetForms: function(pid) {
        state[pid].ownedForms = {};
        renderCollections(pid);
        updateComparison();
        saveState();
    },

    showFormTooltip: function(evt, formId) {
        var form = TRANSFORMS_BY_ID[formId];
        if (!form) return;
        var tooltip = document.getElementById('gcFormTooltip');
        var grade = FORM_GRADES.find(function(g) { return g.key === form.grade; });

        var html = '<div class="gc-form-tt-header">';
        html += '<img src="' + form.icon + '" class="gc-form-tt-icon" alt="">';
        html += '<div class="gc-form-tt-info">';
        html += '<div class="gc-form-tt-name">' + form.name + '</div>';
        html += '<div class="gc-form-tt-grade" style="color: ' + (grade ? grade.color : '#ccc') + ';">' + (grade ? grade.name : form.grade) + '</div>';
        html += '</div></div>';

        if (form.stats && Object.keys(form.stats).length > 0) {
            html += '<div class="gc-form-tt-divider"></div>';
            html += '<div class="gc-form-tt-stats">';
            TRANSFORM_STAT_DEFS.forEach(function(sd) {
                var raw = form.stats[sd.key];
                if (raw === undefined) return;
                var base = Array.isArray(raw) ? raw[0] : raw;
                var perEnch = Array.isArray(raw) ? raw[1] : 0;
                var suffix = sd.unit === '%' ? '%' : '';
                var perStr = perEnch ? ' <span class="gc-form-tt-per">(+' + perEnch + ')</span>' : '';
                html += '<div class="gc-form-tt-stat">' + sd.name + ': +' + base + suffix + perStr + '</div>';
            });
            html += '</div>';
        }

        tooltip.innerHTML = html;
        tooltip.style.display = 'block';

        // Position near the mouse cursor
        var mx = evt.clientX;
        var my = evt.clientY;
        var ttW = tooltip.offsetWidth;
        var ttH = tooltip.offsetHeight;
        var left = mx + 12;
        var top = my - ttH - 8;
        // If tooltip goes off the right edge, flip to left of cursor
        if (left + ttW > window.innerWidth - 8) left = mx - ttW - 12;
        // If tooltip goes above viewport, show below cursor
        if (top < 8) top = my + 16;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    },

    hideFormTooltip: function() {
        var tooltip = document.getElementById('gcFormTooltip');
        if (tooltip) tooltip.style.display = 'none';
    },

    // -- Collections handlers --


    setItemColl: function(pid, key, rawVal) {
        var p = state[pid];
        if (!p.collections) { p.collections = { itemColl: {} }; }
        var cs  = ITEM_COLL_STATS.find(function(c) { return c.key === key; });
        var max = cs ? cs.max : 9999;
        var val = Math.max(0, Math.min(max, parseInt(rawVal) || 0));
        p.collections.itemColl[key] = val;
        updateComparison();
        saveState();
    },

    clampItemCollDisplay: function(pid, key, el) {
        var p = state[pid];
        var stored = (p && p.collections && p.collections.itemColl) ? (p.collections.itemColl[key] || 0) : 0;
        el.value = stored;
    },

    resetCollections: function(pid) {
        var p = state[pid];
        p.collections = { itemColl: {} };
        p.collLevels = { normal: 7, large: 7, powerful: 7 };
        ITEM_COLL_STATS.forEach(function(cs) { p.collections.itemColl[cs.key] = cs.max; });
        renderCollections(pid);
        updateComparison();
        saveState();
    },

    // -- Relic handlers --
    // Light: syncs sibling control + comparison, no DOM rebuild (keeps focus)
    setRelicLevelLight: function(pid, rawVal) {
        var val = Math.max(0, Math.min(300, parseInt(rawVal) || 0));
        state[pid].relic.level = val;
        var slider = document.querySelector('#relic-' + pid + ' .gc-relic-level-slider');
        if (slider) slider.value = val;
        updateComparison();
    },

    setRelicLevelSliderLight: function(pid, rawVal) {
        var val = Math.max(0, Math.min(300, parseInt(rawVal) || 0));
        state[pid].relic.level = val;
        var numInput = document.querySelector('#relic-' + pid + ' .gc-relic-level-input');
        if (numInput) numInput.value = val;
        updateComparison();
    },

    // Final: clamp display, full re-render, save (called on blur / slider release)
    finalizeRelicLevel: function(pid, el) {
        var val = Math.max(0, Math.min(300, parseInt(el.value) || 0));
        state[pid].relic.level = val;
        renderRelic(pid);
        updateComparison();
        saveState();
    },

    finalizeRelicSlider: function(pid, rawVal) {
        var val = Math.max(0, Math.min(300, parseInt(rawVal) || 0));
        state[pid].relic.level = val;
        renderRelic(pid);
        updateComparison();
        saveState();
    },

    // Legacy aliases kept in case called from older saved state / share links
    setRelicLevel: function(pid, rawVal) { this.finalizeRelicLevel(pid, { value: rawVal }); },
    setRelicLevelSlider: function(pid, rawVal) { this.finalizeRelicSlider(pid, rawVal); },

    resetRelic: function(pid) {
        state[pid].relic = { level: 300 };
        renderRelic(pid);
        updateComparison();
        saveState();
    },

    // -- Skill Buff handlers --
    toggleBuffSection: function(gridId, sectionKey, pid) {
        var grid = document.getElementById(gridId);
        if (!grid) return;
        var collapsed = grid.classList.toggle('collapsed');
        // Toggle arrow on the label (sibling before the grid)
        var label = grid.previousElementSibling;
        if (label) label.classList.toggle('gc-collapsed', collapsed);
        try { localStorage.setItem('gcBuffCollapsed_' + sectionKey + '_' + pid, collapsed ? '1' : '0'); } catch (e) {}
    },

    toggleSkillBuff: function(pid, skillKey) {
        var p = state[pid];
        if (!p.skillBuffs) p.skillBuffs = {};
        p.skillBuffs[skillKey] = !p.skillBuffs[skillKey];
        // Update UI class
        var el = document.getElementById('gc-buff-' + pid + '-' + skillKey);
        if (el) el.classList.toggle('active', !!p.skillBuffs[skillKey]);
        // Enforce mutual exclusions: if this buff was turned ON, turn OFF excluded skills
        if (p.skillBuffs[skillKey]) {
            var allBuffs = getSkillBuffsForClass(selectedClass);
            var entry = allBuffs.find(function(b) { return b.key === skillKey; });
            if (entry && entry.excludes) {
                entry.excludes.forEach(function(exKey) {
                    if (p.skillBuffs[exKey]) {
                        p.skillBuffs[exKey] = false;
                        var exEl = document.getElementById('gc-buff-' + pid + '-' + exKey);
                        if (exEl) exEl.classList.remove('active');
                    }
                });
            }
        }
        updateComparison();
        saveState();
    },

    setSkillBuffEnchant: function(pid, skillKey, level) {
        var p = state[pid];
        if (!p.skillBuffEnchants) p.skillBuffEnchants = {};
        p.skillBuffEnchants[skillKey] = level;
        renderSkillBuffs(pid);
        updateComparison();
        saveState();
    },

    resetSkillBuffs: function(pid) {
        var p = state[pid];
        p.skillBuffs = {};
        p.skillBuffEnchants = {};
        var allBuffs = getSkillBuffsForClass(selectedClass);
        allBuffs.forEach(function(buff) {
            p.skillBuffs[buff.key] = !!buff.defaultActive;
            if (buff.enchant) {
                p.skillBuffEnchants[buff.key] = buff.enchant.defaultLevel;
            }
        });
        renderSkillBuffs(pid);
        updateComparison();
        saveState();
    },

    showSkillInfo: function(evt, skillKey) {
        if (evt) evt.stopPropagation();
        var skill = GC_SKILL_DATABASE[skillKey];
        if (!skill) return;

        // Handle multiple classes
        var classes = skill.class.split('+').map(function(c) { return c.trim(); });
        var classDisplay = '';
        if (classes.length > 0 && classes[0] !== '-' && classes[0] !== 'TBD') {
            classDisplay = classes.map(function(className) {
                var classKey = className.toLowerCase();
                var classData = CLASS_DATA[classKey];
                if (classData && classData.icon) {
                    return '<span class="skill-info-class-item"><img src="' + classData.icon + '" class="skill-info-class-icon" alt="' + className + '" title="' + className + '"><span class="skill-info-class-text">' + className + '</span></span>';
                }
                return className;
            }).join('');
        } else {
            classDisplay = skill.class;
        }

        var linkType = skill.id.toString().length > 4 ? 'item' : (skill.category === 'Title' ? 'title' : 'skill');
        var linksHtml = '';
        if (skill.id !== '-') {
            linksHtml = '<div class="skill-info-links">' +
                '<a href="https://aioncodex.com/en/' + linkType + '/' + skill.id + '/" target="_blank" class="skill-info-link">AionCodex</a>' +
                '<a href="https://aionpowerbook.com/powerbook/' + linkType + '/' + skill.id + '" target="_blank" class="skill-info-link">PowerBook</a>' +
                '</div>';
        }

        var content = '<div class="skill-info-header">' +
            '<img src="' + skill.icon + '" class="skill-info-icon" alt="' + skill.name + '">' +
            '<div class="skill-info-title-section">' +
                '<div class="skill-info-name">' + skill.name + '</div>' +
                '<div class="skill-info-id">ID: ' + skill.id + '</div>' +
            '</div>' +
            '<button class="skill-info-close" onclick="GC.closeSkillInfo()">*</button>' +
        '</div>' +
        '<div class="skill-info-body">' +
            '<div class="skill-info-row"><div class="skill-info-label">Class:</div><div class="skill-info-value skill-info-class-container">' + classDisplay + '</div></div>' +
            '<div class="skill-info-row"><div class="skill-info-label">Category:</div><div class="skill-info-value">' + skill.category + '</div></div>' +
            '<div class="skill-info-row"><div class="skill-info-label">Usage Cost:</div><div class="skill-info-value">' + skill.usageCost + '</div></div>' +
            '<div class="skill-info-row"><div class="skill-info-label">Cast Time:</div><div class="skill-info-value">' + skill.castTime + '</div></div>' +
            '<div class="skill-info-row"><div class="skill-info-label">Cooldown:</div><div class="skill-info-value">' + skill.cooldown + '</div></div>' +
            '<div class="skill-info-description"><div class="skill-info-label">Description:</div><div class="skill-info-value">' + skill.description + '</div></div>' +
            linksHtml +
        '</div>';

        document.getElementById('gcSkillInfoContent').innerHTML = content;
        document.getElementById('gcSkillInfoModal').classList.add('active');
    },

    closeSkillInfo: function() {
        document.getElementById('gcSkillInfoModal').classList.remove('active');
    },

    openJorgothModal: function() {
        var modal = document.getElementById('gc-jorgoth-modal');
        if (modal) modal.style.display = 'flex';
    },

    closeJorgothModal: function() {
        var modal = document.getElementById('gc-jorgoth-modal');
        if (modal) modal.style.display = 'none';
    },

    toggleT2Source: function(rowId) {
        var row = document.getElementById(rowId);
        if (!row) return;
        var isHidden = row.style.display === 'none' || row.style.display === '';
        row.style.display = isHidden ? 'table-row' : 'none';
        var btn = document.querySelector('[data-t2-target="' + rowId + '"]');
        if (btn) btn.classList.toggle('gc-jorgoth-t2-btn-active', isHidden);
    },

    togglePicker: function(pickerId) {
        var menu = document.getElementById(pickerId);
        var wasOpen = menu.classList.contains('gc-picker-open');
        // Close all pickers first
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) {
            m.classList.remove('gc-picker-open');
        });
        if (!wasOpen) menu.classList.add('gc-picker-open');
    },

    pickMainWeapon: function(wKey) {
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) { m.classList.remove('gc-picker-open'); });
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        weaponConfig.mainType = wKey;
        var allowed = getAllowedOffHand(wKey, selectedClass);
        if (allowed.indexOf(weaponConfig.offHandType) === -1) {
            weaponConfig.offHandType = getDefaultOffHand(wKey, selectedClass);
        }
        weaponConfig.offHandWeaponType = getDefaultOffHandWeapon(wKey, selectedClass);
        renderWeaponConfig();
        setOrder.forEach(function(id) { renderProfile(id); });
        updateComparison();
        saveState();
    },

    pickOffHand: function(choiceKey) {
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) { m.classList.remove('gc-picker-open'); });
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        if (choiceKey.indexOf('weapon:') === 0) {
            var wType = choiceKey.substring(7);
            weaponConfig.offHandType = 'weapon';
            weaponConfig.offHandWeaponType = wType;
        } else {
            weaponConfig.offHandType = choiceKey;
        }
        setOrder.forEach(function(id) {
            if (weaponConfig.offHandType !== 'none' && OFFHAND_EXCLUDED_SETS.indexOf(state[id].offHand.set) !== -1) {
                state[id].offHand.set = 'fighting-spirit';
            }
        });
        renderWeaponConfig();
        setOrder.forEach(function(id) { renderProfile(id); });
        updateComparison();
        saveState();
    },

    pickOath: function(pid, slotKey, oathKey) {
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) { m.classList.remove('gc-picker-open'); });
        closeOathPopup();
        state[pid].oath[slotKey] = oathKey;
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    openSetPicker: function(pid, slotType, triggerEl) {
        var popup = document.getElementById('gc-set-popup');
        var isOpen = popup.style.display === 'flex';
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) { m.classList.remove('gc-picker-open'); });
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        closeAccBonusPopup();
        if (isOpen && popup.dataset.pid == pid && popup.dataset.slot === slotType) return;

        var sets, currentSet;
        if (slotType === 'main-weapon') {
            sets = WEAPON_SETS.filter(function(ws) { return MAINHAND_EXCLUDED_SETS.indexOf(ws.key) === -1; });
            currentSet = state[pid].mainWeapon.set;
        } else if (slotType === 'off-weapon') {
            sets = getAllowedOffHandWeaponSets(state[pid].mainWeapon.set, weaponConfig.mainType, weaponConfig.offHandType);
            currentSet = state[pid].offHand.set;
        } else if (slotType === 'shield') {
            sets = SHIELD_SETS;
            currentSet = state[pid].shield.set;
        } else if (slotType.indexOf('armor:') === 0) {
            var armorSlotKey = slotType.substring(6);
            sets = ARMOR_SETS.filter(function(s) {
                return !s.slots || s.slots.indexOf(armorSlotKey) !== -1;
            });
            currentSet = state[pid].armor[armorSlotKey].set;

            var apsuInfo = APSU_DATA[selectedClass];
            if (apsuInfo && apsuInfo.slot === armorSlotKey) {
                var fsSet = sets.find(function(s) { return s.key === 'fighting-spirit'; });
                if (fsSet) {
                    sets = sets.slice();
                    sets.push({ key: 'fighting-spirit-apsu', name: 'Apsu' });
                    if (currentSet === 'fighting-spirit' && state[pid].apsuEnabled) {
                        currentSet = 'fighting-spirit-apsu';
                    }
                }
            }
        } else if (slotType.indexOf('acc:') === 0) {
            sets = ACCESSORY_SETS;
            currentSet = state[pid].accessories[slotType.substring(4)].set;
        } else {
            return;
        }

        var isWeaponSlot = (slotType === 'main-weapon' || slotType === 'off-weapon');
        var html = '';
        sets.forEach(function(set) {
            var sel = currentSet === set.key ? ' gc-set-option-selected' : '';
            html += '<div class="gc-set-option' + sel + '" onclick="GC.pickSet(' + pid + ',\'' + slotType + '\',\'' + set.key + '\')">';
            html += '<span class="gc-set-option-label">' + set.name + '</span>';
            if (isWeaponSlot && weaponConfig && weaponConfig.mainType) {
                var jTag = getJorgothTag(weaponConfig.mainType, set.key);
                if (jTag === 'masterpiece') {
                    html += ' <span class="gc-set-tag gc-set-tag-mp">✦ Masterpiece</span>';
                } else if (jTag === 'extended') {
                    html += ' <span class="gc-set-tag gc-set-tag-ext">⟐ Ext</span>';
                }
                // Best fuse label for 2H weapons (highest bonusAtk variant among T4)
                if (WEAPON_TYPES[weaponConfig.mainType] && WEAPON_TYPES[weaponConfig.mainType].twoHanded && JORGOTH_WEAPONS[weaponConfig.mainType]) {
                    var vKey = null;
                    if (set.key.indexOf('-v1') !== -1) vKey = 'v1';
                    else if (set.key.indexOf('-v2') !== -1) vKey = 'v2';
                    else if (set.key.indexOf('-v3') !== -1) vKey = 'v3';
                    if (vKey) {
                        var jw = JORGOTH_WEAPONS[weaponConfig.mainType];
                        var thisAtk = jw[vKey] ? jw[vKey].bonusAtk : 0;
                        var maxAtk = Math.max(jw.v1.bonusAtk, jw.v2.bonusAtk, jw.v3.bonusAtk);
                        if (thisAtk > 0 && thisAtk === maxAtk && jw.v1.bonusAtk !== jw.v2.bonusAtk) {
                            html += ' <span class="gc-set-tag gc-set-tag-fuse">⚔ Best Fuse</span>';
                        }
                    }
                }
            }
            html += '</div>';
        });
        popup.innerHTML = html;
        popup.dataset.pid = pid;
        popup.dataset.slot = slotType;

        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'flex';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.top - popH - 6;
        if (top < 4) top = rect.bottom + 6;
        var left = rect.left + rect.width / 2 - popW / 2;
        if (left < 4) left = 4;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    pickSet: function(pid, slotType, setKey) {
        closeSetPopup();
        var bc = state[pid].bonusCollapsed || {};
        if (slotType === 'main-weapon') {
            state[pid].mainWeapon.set = setKey;
            state[pid].mainWeapon.bonuses = getDefaultWeaponBonuses(setKey);
            state[pid].mainWeapon.bonusValues = {};
            if (setKey === 'none') {
                delete state[pid].mainWeapon.enchant;
                // Force off-hand weapon/fuse to none (shield is still allowed)
                if (weaponConfig.offHandType !== 'shield') {
                    state[pid].offHand.set = 'none';
                    state[pid].offHand.bonuses = [];
                    state[pid].offHand.bonusValues = {};
                    delete state[pid].offHand.enchant;
                }
            }
            bc.mainWeapon = false;
        } else if (slotType === 'off-weapon') {
            state[pid].offHand.set = setKey;
            state[pid].offHand.bonuses = getDefaultWeaponBonuses(setKey);
            state[pid].offHand.bonusValues = {};
            if (setKey === 'none') {
                delete state[pid].offHand.enchant;
            }
            bc.offHand = false;
        } else if (slotType === 'shield') {
            state[pid].shield.set = setKey;
            state[pid].shield.bonusValues = {};
            if (setKey === 'none') {
                state[pid].shield.bonuses = [];
            } else {
                state[pid].shield.bonuses = getDefaultShieldBonuses(setKey, state[pid].shield.type === 'scale' ? 'scale' : 'battle');
            }
            bc.shield = false;
        } else if (slotType.indexOf('armor:') === 0) {
            var slotKey = slotType.substring(6);
            var pickedApsuVariant = (setKey === 'fighting-spirit-apsu');
            if (pickedApsuVariant) setKey = 'fighting-spirit';

            state[pid].armor[slotKey].set = setKey;
            state[pid].armor[slotKey].bonusValues = {};

            var apsuInfo = APSU_DATA[selectedClass];
            if (apsuInfo && apsuInfo.slot === slotKey) {
                state[pid].apsuEnabled = pickedApsuVariant;
            }

            if (setKey === 'none') {
                state[pid].armor[slotKey].bonuses = [];
                delete state[pid].armor[slotKey].enchant;
            } else if (setKey === 'fighting-spirit') {
                state[pid].armor[slotKey].bonuses = getDefaultArmorBonuses(slotKey);
                delete state[pid].armor[slotKey].enchant;
            } else {
                state[pid].armor[slotKey].bonuses = [];
                if (typeof state[pid].armor[slotKey].enchant !== 'number') {
                    state[pid].armor[slotKey].enchant = 9;
                }
            }
        } else if (slotType.indexOf('acc:') === 0) {
            var accKey = slotType.substring(4);
            state[pid].accessories[accKey].set = setKey;
            state[pid].accessories[accKey].bonuses = getDefaultAccBonuses(setKey, accKey);
            state[pid].accessories[accKey].bonusValues = {};
            bc[accKey] = false;
        }
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    openEnchantPicker: function(pid, slotType, triggerEl) {
        var popup = document.getElementById('gc-enchant-popup');
        var isOpen = popup.style.display === 'flex';
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) { m.classList.remove('gc-picker-open'); });
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        closeAccBonusPopup();
        if (isOpen && popup.dataset.pid == pid && popup.dataset.slot === slotType) return;

        var currentEnchant, minLvl, maxLvl;
        if (slotType === 'main-weapon') {
            currentEnchant = state[pid].mainWeapon.enchant;
            minLvl = 8; maxLvl = 15;
        } else if (slotType === 'off-weapon') {
            currentEnchant = state[pid].offHand.enchant;
            minLvl = 8; maxLvl = 15;
        } else if (slotType.indexOf('armor:') === 0) {
            currentEnchant = state[pid].armor[slotType.substring(6)].enchant;
            minLvl = 8; maxLvl = 15;
        } else if (slotType === 'tf') {
            currentEnchant = state[pid].transformEnchant != null ? state[pid].transformEnchant : 0;
            minLvl = 0; maxLvl = 20;
        } else { return; }

        popup.classList.toggle('gc-enchant-popup-wrap', slotType === 'tf');

        var html = '';
        for (var lvl = minLvl; lvl <= maxLvl; lvl++) {
            var sel = currentEnchant === lvl ? ' gc-set-option-selected' : '';
            html += '<div class="gc-set-option' + sel + '" onclick="GC.pickEnchant(' + pid + ',\'' + slotType + '\',' + lvl + ')">';
            html += '<span class="gc-set-option-label">+' + lvl + '</span>';
            html += '</div>';
        }
        popup.innerHTML = html;
        popup.dataset.pid = pid;
        popup.dataset.slot = slotType;

        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'flex';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.top - popH - 6;
        if (top < 4) top = rect.bottom + 6;
        var left = rect.left + rect.width / 2 - popW / 2;
        if (left < 4) left = 4;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    pickEnchant: function(pid, slotType, level) {
        closeEnchantPopup();
        if (slotType === 'main-weapon') {
            state[pid].mainWeapon.enchant = level;
        } else if (slotType === 'off-weapon') {
            state[pid].offHand.enchant = level;
        } else if (slotType.indexOf('armor:') === 0) {
            state[pid].armor[slotType.substring(6)].enchant = level;
        } else if (slotType === 'tf') {
            state[pid].transformEnchant = level;
        }
        if (slotType === 'tf') {
            renderTransform(pid);
        } else {
            renderProfile(pid);
        }
        updateComparison();
        saveState();
    },

    openShieldTypePicker: function(pid, triggerEl) {
        var popup = document.getElementById('gc-enchant-popup');
        var isOpen = popup.style.display === 'flex';
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) { m.classList.remove('gc-picker-open'); });
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        closeAccBonusPopup();
        if (isOpen && popup.dataset.pid == pid && popup.dataset.slot === 'shield-type') return;

        var current = state[pid].shield.type || 'battle';
        var html = '';
        var types = [{key: 'battle', name: 'Battle (Physical)'}, {key: 'scale', name: 'Scale (Magical)'}];
        types.forEach(function(t) {
            var sel = current === t.key ? ' gc-set-option-selected' : '';
            html += '<div class="gc-set-option' + sel + '" onclick="GC.pickShieldType(' + pid + ',\'' + t.key + '\')">';
            html += '<span class="gc-set-option-label">' + t.name + '</span>';
            html += '</div>';
        });
        popup.innerHTML = html;
        popup.dataset.pid = pid;
        popup.dataset.slot = 'shield-type';

        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'flex';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.top - popH - 6;
        if (top < 4) top = rect.bottom + 6;
        var left = rect.left + rect.width / 2 - popW / 2;
        if (left < 4) left = 4;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    pickShieldType: function(pid, type) {
        closeEnchantPopup();
        state[pid].shield.type = type;
        // Reset bonuses when changing type (battle↔scale may have different bonus lists)
        state[pid].shield.bonuses = getDefaultShieldBonuses(state[pid].shield.set, type === 'scale' ? 'scale' : 'battle');
        state[pid].shield.bonusValues = {};
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    toggleShieldBonus: function(pid, bonusKey) {
        var sh = state[pid].shield;
        var shData = SHIELD_STATS[sh.set];
        if (!shData) return;
        var maxB = shData.maxBonuses;
        var idx = sh.bonuses.indexOf(bonusKey);
        if (idx !== -1) {
            sh.bonuses.splice(idx, 1);
        } else if (sh.bonuses.length < maxB) {
            sh.bonuses.push(bonusKey);
        } else {
            sh.bonuses[0] = bonusKey;
        }
        // Update popup content in place
        var popup = document.getElementById('gc-acc-bonus-popup');
        if (popup && popup.style.display === 'block' && popup.dataset.bonusType === 'shield' && popup.dataset.pid == pid) {
            renderShieldBonusPopupContent(popup, pid);
        }
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    openWeaponBonusPopup: function(pid, slot, triggerEl) {
        var popup = document.getElementById('gc-acc-bonus-popup');
        var isOpen = popup.style.display === 'block';
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        closeAccBonusPopup();
        if (isOpen && popup.dataset.pid == pid && popup.dataset.bonusType === 'weapon' && popup.dataset.slotKey === slot) return;

        var weapon = state[pid][slot];
        var fixed = WEAPON_STATS_FIXED[weapon.set];
        if (!fixed || !fixed.bonuses) return;

        popup.dataset.pid = pid;
        popup.dataset.slotKey = slot;
        popup.dataset.bonusType = 'weapon';
        renderWeaponBonusPopupContent(popup, pid, slot);

        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'block';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.bottom + 4;
        if (top + popH > window.innerHeight - 4) top = rect.top - popH - 4;
        var left = rect.left;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        if (left < 4) left = 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    openShieldBonusPopup: function(pid, triggerEl) {
        var popup = document.getElementById('gc-acc-bonus-popup');
        var isOpen = popup.style.display === 'block';
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        closeAccBonusPopup();
        if (isOpen && popup.dataset.pid == pid && popup.dataset.bonusType === 'shield') return;

        var sh = state[pid].shield;
        var shData = SHIELD_STATS[sh.set];
        if (!shData) return;

        popup.dataset.pid = pid;
        popup.dataset.slotKey = 'shield';
        popup.dataset.bonusType = 'shield';
        renderShieldBonusPopupContent(popup, pid);

        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'block';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.bottom + 4;
        if (top + popH > window.innerHeight - 4) top = rect.top - popH - 4;
        var left = rect.left;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        if (left < 4) left = 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    openAccBonusPopup: function(pid, slotKey, triggerEl) {
        var popup = document.getElementById('gc-acc-bonus-popup');
        var isOpen = popup.style.display === 'block';
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        closeAccBonusPopup();
        if (isOpen && popup.dataset.pid == pid && popup.dataset.bonusType === 'acc' && popup.dataset.slotKey === slotKey) return;

        var acc = state[pid].accessories[slotKey];
        var statsType = ACC_STATS_TYPE[slotKey];
        var setData = ACCESSORY_STATS[acc.set];
        if (!setData) return;
        var slotData = setData[statsType];
        if (!slotData || !slotData.bonuses) return;

        popup.dataset.pid = pid;
        popup.dataset.slotKey = slotKey;
        popup.dataset.bonusType = 'acc';
        renderAccBonusPopupContent(popup, pid, slotKey);

        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'block';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.bottom + 4;
        if (top + popH > window.innerHeight - 4) top = rect.top - popH - 4;
        var left = rect.left;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        if (left < 4) left = 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    closeAccBonusPopup: function() {
        closeAccBonusPopup();
    },

    toggleWeaponBonus: function(pid, slot, bonusKey) {
        var weapon = state[pid][slot];
        var fixed = WEAPON_STATS_FIXED[weapon.set];
        if (!fixed || !fixed.bonuses) return;
        var maxB = fixed.maxBonuses;
        if (!weapon.bonuses) weapon.bonuses = [];
        var idx = weapon.bonuses.indexOf(bonusKey);
        if (idx !== -1) {
            weapon.bonuses.splice(idx, 1);
        } else if (weapon.bonuses.length < maxB) {
            weapon.bonuses.push(bonusKey);
        } else {
            weapon.bonuses[0] = bonusKey;
        }
        // Update popup content in place
        var popup = document.getElementById('gc-acc-bonus-popup');
        if (popup && popup.style.display === 'block' && popup.dataset.bonusType === 'weapon' && popup.dataset.pid == pid && popup.dataset.slotKey === slot) {
            renderWeaponBonusPopupContent(popup, pid, slot);
        }
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    toggleAccBonus: function(pid, slotKey, bonusKey) {
        var acc = state[pid].accessories[slotKey];
        var statsType = ACC_STATS_TYPE[slotKey];
        var setData = ACCESSORY_STATS[acc.set];
        if (!setData) return;
        var slotData = setData[statsType];
        if (!slotData || !slotData.bonuses) return;
        var maxB = slotData.maxBonuses;
        if (!acc.bonuses) acc.bonuses = [];
        var idx = acc.bonuses.indexOf(bonusKey);
        if (idx !== -1) {
            acc.bonuses.splice(idx, 1);
        } else if (acc.bonuses.length < maxB) {
            acc.bonuses.push(bonusKey);
        } else {
            acc.bonuses[0] = bonusKey;
        }
        // Update popup content in place
        var popup = document.getElementById('gc-acc-bonus-popup');
        if (popup && popup.style.display === 'block' && popup.dataset.pid == pid && popup.dataset.slotKey === slotKey) {
            renderAccBonusPopupContent(popup, pid, slotKey);
        }
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    // Open the popup for armor
    openArmorBonusPopup: function(pid, slotKey, triggerEl) {
        var popup = document.getElementById('gc-acc-bonus-popup');
        closeAccBonusPopup(); // Close existing popups

        popup.dataset.pid = pid;
        popup.dataset.slotKey = slotKey;
        popup.dataset.bonusType = 'armor';
        
        // 1. Identify tier: Chest/Pants = High, others = Low
        var isHigh = (slotKey === 'helmet' || slotKey === 'chest' || slotKey === 'pants');
        var bonusOptions = isHigh ? FS_BONUSES_HIGH : FS_BONUSES_LOW;
        
        var armor = state[pid].armor[slotKey];
        if (!armor.bonuses || !armor.bonuses.length) {
            armor.bonuses = getDefaultArmorBonuses(slotKey);
        }
        var picked = armor.bonuses;
        
        var html = '<div class="gc-acc-bonus-popup-title">Armor Bonus (Max 4)</div>';
        html += '<div class="gc-shield-bonus-grid">';
        
        // Check for Apsu bonus overrides on this slot
        var apsuOverride = null;
        var prof = state[pid];
        if (prof.apsuEnabled) {
            var apsuInfo = APSU_DATA[selectedClass];
            if (apsuInfo && apsuInfo.slot === slotKey && apsuInfo.bonusOverride) {
                apsuOverride = apsuInfo.bonusOverride;
            }
        }

        bonusOptions.forEach(function(b) {
            var maxVal = (apsuOverride && apsuOverride[b.key]) ? apsuOverride[b.key] : b.value;
            var isOn = picked.indexOf(b.key) !== -1;
            var cls = 'gc-shield-bonus-btn' + (isOn ? ' gc-shield-bonus-on' : '');
            html += '<div class="' + cls + '" onclick="GC.toggleArmorBonus(' + pid + ',\'' + slotKey + '\',\'' + b.key + '\')">';
            html += '<span class="gc-shield-bonus-name">' + b.name + '</span>';
            if (isOn) {
                var cv = (armor.bonusValues && typeof armor.bonusValues[b.key] === 'number') ? armor.bonusValues[b.key] : maxVal;
                html += '<input type="number" class="gc-bonus-val-input" min="0" max="' + maxVal + '" value="' + cv + '" onclick="event.stopPropagation()" onchange="GC.setBonusValue(' + pid + ',\'armor\',\'' + slotKey + '\',\'' + b.key + '\',this.value,' + maxVal + ')">';
            } else {
                html += '<span class="gc-shield-bonus-val">+' + maxVal.toLocaleString() + '</span>';
            }
            html += '</div>';
        });
        html += '</div>';
        
        popup.innerHTML = html;
        popup.style.display = 'block';
        
        // Positioning logic
        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'block';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.bottom + 4;
        if (top + popH > window.innerHeight - 4) top = rect.top - popH - 4;
        var left = rect.left;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        if (left < 4) left = 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    // Toggle the selected bonus
    toggleArmorBonus: function(pid, slotKey, bonusKey) {
        var armor = state[pid].armor[slotKey];
        if (!armor.bonuses) armor.bonuses = [];

        var idx = armor.bonuses.indexOf(bonusKey);
        if (idx !== -1) {
            armor.bonuses.splice(idx, 1);
        } else if (armor.bonuses.length < 4) {
            armor.bonuses.push(bonusKey);
        }

        // Refresh UI
        this.openArmorBonusPopup(pid, slotKey, document.querySelector(`[onclick*="openArmorBonusPopup(${pid},'${slotKey}'"]`));
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    // Set a custom bonus value (0..max)
    setBonusValue: function(pid, gearType, slotKey, bonusKey, value, maxVal) {
        var val = parseInt(value);
        if (isNaN(val)) val = maxVal;
        val = Math.max(0, Math.min(maxVal, val));

        var gear;
        if (gearType === 'acc') gear = state[pid].accessories[slotKey];
        else if (gearType === 'weapon') gear = state[pid][slotKey];
        else if (gearType === 'shield') gear = state[pid].shield;
        else if (gearType === 'armor') gear = state[pid].armor[slotKey];
        else if (gearType === 'glyph') gear = state[pid].glyph;
        if (!gear) return;
        if (!gear.bonusValues) gear.bonusValues = {};
        gear.bonusValues[bonusKey] = val;

        renderProfile(pid);
        updateComparison();
        saveState();
    },

    openArmorTypePicker: function(pid, triggerEl) {
        var popup = document.getElementById('gc-enchant-popup');
        var isOpen = popup.style.display === 'flex';
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) { m.classList.remove('gc-picker-open'); });
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        if (isOpen && popup.dataset.pid == pid && popup.dataset.slot === 'armor-type') return;

        var classInfo = CLASS_DATA[selectedClass];
        var currentType = state[pid].armorType;
        var html = '';
        classInfo.armorTypes.forEach(function(atKey) {
            var opt = ARMOR_TYPE_OPTIONS.find(function(o) { return o.key === atKey; });
            var sel = currentType === atKey ? ' gc-set-option-selected' : '';
            html += '<div class="gc-set-option' + sel + '" onclick="GC.pickArmorType(' + pid + ',\'' + atKey + '\')">';
            html += '<span class="gc-set-option-label">' + opt.name + '</span>';
            html += '</div>';
        });
        popup.innerHTML = html;
        popup.dataset.pid = pid;
        popup.dataset.slot = 'armor-type';

        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'flex';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.top - popH - 6;
        if (top < 4) top = rect.bottom + 6;
        var left = rect.left + rect.width / 2 - popW / 2;
        if (left < 4) left = 4;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    pickArmorType: function(pid, armorType) {
        closeEnchantPopup();
        state[pid].armorType = armorType;
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    openOathPicker: function(pid, slotKey, triggerEl) {
        var popup = document.getElementById('gc-oath-popup');
        var isOpen = popup.style.display === 'flex';
        // Close all other pickers
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) { m.classList.remove('gc-picker-open'); });
        closeOathPopup();
        closeSetPopup();
        if (isOpen && popup.dataset.pid == pid && popup.dataset.slot === slotKey) return;

        var currentOath = state[pid].oath[slotKey] || 'none';
        // Find slot key to get correct icons
        var slotObj = ARMOR_SLOTS.find(function(s) { return s.key === slotKey; });
        var html = '';
        OATH_OPTIONS.forEach(function(opt) {
            var sel = currentOath === opt.key ? ' gc-oath-option-selected' : '';
            var optIcon = getOathIcon(slotKey, opt.key);
            html += '<div class="gc-oath-option' + sel + (opt.key === 'none' ? ' gc-oath-option-none' : '') + '" onclick="GC.pickOath(' + pid + ',\'' + slotKey + '\',\'' + opt.key + '\')">';
            if (opt.key === 'none') {
                html += '<span class="gc-oath-option-icon"><span class="gc-picker-x">✕</span></span>';
            } else {
                html += '<span class="gc-oath-option-icon"><img src="' + optIcon + '" alt="' + opt.name + '"></span>';
            }
            html += '<span class="gc-oath-option-label">' + opt.name + '</span>';
            html += '</div>';
        });
        popup.innerHTML = html;
        popup.dataset.pid = pid;
        popup.dataset.slot = slotKey;

        // Position relative to trigger
        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'flex';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.top - popH - 6;
        if (top < 4) top = rect.bottom + 6;
        var left = rect.left + rect.width / 2 - popW / 2;
        if (left < 4) left = 4;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    // -- Manastone Modal Handlers --
    openManaModal: function(pid, scrollToGear) {
        closeOathPopup();
        closeSetPopup();
        closeEnchantPopup();
        closeAccBonusPopup();
        var modal = document.getElementById('gc-mana-modal');
        modal.innerHTML = renderManaModal(pid, scrollToGear);
        modal.style.display = 'block';
        modal.dataset.pid = pid;
        document.body.style.overflow = 'hidden';
        if (scrollToGear) {
            setTimeout(function() {
                var row = document.getElementById('gc-mana-row-' + scrollToGear);
                if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        }
    },

    closeManaModal: function() {
        var modal = document.getElementById('gc-mana-modal');
        modal.style.display = 'none';
        modal.innerHTML = '';
        document.body.style.overflow = '';
        closeManaSlotPopup();
    },

    applyManaPreset: function(pid, manaKey) {
        var profile = state[pid];
        var allGearKeys = ['mainWeapon'];
        if (weaponConfig.offHandType !== 'none') allGearKeys.push('offHand');
        ARMOR_SLOTS.forEach(function(s) { allGearKeys.push(s.key); });
        ALL_ACCESSORY_KEYS.forEach(function(k) { allGearKeys.push(k); });
        allGearKeys.forEach(function(gk) {
            var setKey = getGearSetKey(pid, gk);
            var slotCount = getManastoneSlotCount(setKey);
            if (!profile.manastones[gk]) profile.manastones[gk] = ['none', 'none', 'none'];
            for (var i = 0; i < slotCount; i++) {
                profile.manastones[gk][i] = manaKey;
            }
        });
        // Re-render modal content
        var modal = document.getElementById('gc-mana-modal');
        modal.innerHTML = renderManaModal(pid);
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    clearManastones: function(pid) {
        var profile = state[pid];
        var allGearKeys = ['mainWeapon', 'offHand'];
        ARMOR_SLOTS.forEach(function(s) { allGearKeys.push(s.key); });
        ALL_ACCESSORY_KEYS.forEach(function(k) { allGearKeys.push(k); });
        allGearKeys.forEach(function(gk) {
            if (!profile.manastones[gk]) profile.manastones[gk] = ['none', 'none', 'none'];
            for (var i = 0; i < 3; i++) {
                profile.manastones[gk][i] = 'none';
            }
        });
        var modal = document.getElementById('gc-mana-modal');
        modal.innerHTML = renderManaModal(pid);
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    setManastone: function(pid, gearKey, slotIdx, manaKey) {
        var profile = state[pid];
        if (!profile.manastones[gearKey]) profile.manastones[gearKey] = ['none', 'none', 'none'];
        profile.manastones[gearKey][slotIdx] = manaKey;
        closeManaSlotPopup();
        // Update just the changed slot (avoid full modal re-render)
        var slotEl = document.querySelector('.gc-mana-slot[data-pid="' + pid + '"][data-gear="' + gearKey + '"][data-slot="' + slotIdx + '"]');
        if (slotEl) {
            var manaDef = (manaKey !== 'none') ? MANASTONES.find(function(m) { return m.key === manaKey; }) : null;
            if (manaDef) {
                slotEl.className = 'gc-mana-slot gc-mana-slot-filled';
                slotEl.innerHTML = '<img src="' + MANASTONE_ICON + '" class="gc-mana-slot-icon" alt="">' +
                    '<span class="gc-mana-slot-label">' + manaDef.name + ' +' + manaDef.value + '</span>';
            } else {
                slotEl.className = 'gc-mana-slot gc-mana-slot-empty';
                slotEl.innerHTML = '<img src="' + EMPTY_SLOT_ICON + '" class="gc-mana-slot-icon gc-mana-slot-icon-empty" alt="">' +
                    '<span class="gc-mana-slot-empty-label">Empty</span>';
            }
        }
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    openManaSlotPicker: function(pid, gearKey, slotIdx, triggerEl) {
        var popup = document.getElementById('gc-mana-slot-popup');
        var isOpen = popup.style.display === 'flex';
        closeManaSlotPopup();
        if (isOpen && popup.dataset.pid == pid && popup.dataset.gearKey === gearKey && popup.dataset.slotIdx == slotIdx) return;

        var profile = state[pid];
        var currentMana = (profile.manastones[gearKey] && profile.manastones[gearKey][slotIdx]) || 'none';

        var html = '';
        // None option
        var nSel = currentMana === 'none' ? ' gc-set-option-selected' : '';
        html += '<div class="gc-set-option gc-mana-option-none' + nSel + '" data-mana="none">';
        html += '<span class="gc-mana-option-icon"><img src="' + EMPTY_SLOT_ICON + '" class="gc-mana-slot-icon-empty" alt=""></span>';
        html += '<span class="gc-set-option-label">Empty</span>';
        html += '</div>';

        MANASTONES.forEach(function(m) {
            var sel = currentMana === m.key ? ' gc-set-option-selected' : '';
            html += '<div class="gc-set-option' + sel + '" data-mana="' + m.key + '">';
            html += '<span class="gc-mana-option-icon"><img src="' + MANASTONE_ICON + '" alt=""></span>';
            html += '<span class="gc-set-option-label">' + m.name + ' +' + m.value + '</span>';
            html += '</div>';
        });

        popup.innerHTML = html;
        popup.dataset.pid = pid;
        popup.dataset.gearKey = gearKey;
        popup.dataset.slotIdx = slotIdx;

        var rect = triggerEl.getBoundingClientRect();
        popup.style.display = 'flex';
        var popH = popup.offsetHeight;
        var popW = popup.offsetWidth;
        var top = rect.bottom + 4;
        if (top + popH > window.innerHeight - 4) top = rect.top - popH - 4;
        var left = rect.left;
        if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
        if (left < 4) left = 4;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    },

    setGlyphBonus: function(pid, bonusKey) {
        var acc = state[pid].glyph;
        acc.bonuses = [bonusKey];
        renderProfile(pid);
        updateComparison();
        saveState();
    },
    setGlyphExtra: function(pid, stat, val) {
        var acc = state[pid].glyph;
        if (!acc.extra) acc.extra = { attack: 0, physicalDef: 0, magicalDef: 0 };
        acc.extra[stat] = Math.max(0, Math.min(250, parseInt(val) || 0));
        updateComparison();
        saveState();
    },
    toggleGlyph: function(pid) {
        var glyph = state[pid].glyph;
        glyph.enabled = (glyph.enabled === false) ? true : false;
        renderProfile(pid);
        updateComparison();
        saveState();
    },

    openMinionModal: function(pid) {
        var profile = state[pid];
        var html = '<div class="gc-mana-overlay" onclick="GC.closeMinionModal()"></div>';
        html += '<div class="gc-mana-dialog" style="max-width: 550px; width: 95%;">';
        html += '<div class="gc-mana-titlebar"><span>🐾 MINION LOADOUT - SET ' + pid + '</span><span onclick="GC.closeMinionModal()" style="cursor:pointer">✕</span></div>';
        
        html += '<div class="gc-mana-body" style="padding: 16px; max-height: 80vh; overflow-y: auto;">';

        ['main', 'secondary'].forEach(function(slot) {
            var currentKey = profile.minions[slot];
            
            html += '<div style="margin-bottom: 24px;">';
            html += '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:6px; margin-bottom:10px;">';
            html += '<span style="color:var(--text-dim); font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">' + slot + ' Slot</span>';
            
            // Show current selection summary
            var current = MINIONS.find(m => m.key === currentKey);
            html += '<span style="color:#ffcc00; font-size:11px; font-weight:700;">ACTIVE: ' + current.name.toUpperCase() + '</span>';
            html += '</div>';

            html += '<div class="gc-minion-selection-grid">';
            MINIONS.forEach(function(m) {
                var isSelected = (currentKey === m.key) ? 'selected' : '';
                html += '<div class="gc-minion-opt ' + isSelected + '" onclick="GC.setMinion(' + pid + ', \'' + slot + '\', \'' + m.key + '\')">';
                html += '<img src="' + m.icon + '" alt="">';
                html += '<div class="gc-minion-opt-info">';
                html += '<span class="gc-minion-name">' + m.name + '</span>';
                html += '<span class="gc-minion-type">' + m.type + ' (' + m.variant + ')</span>';
                html += '</div></div>';
            });
            html += '</div></div>';
        });

        html += '</div></div>';

        var container = document.getElementById('gc-mana-modal'); 
        container.innerHTML = html;
        container.style.display = 'flex';
    },

    setMinion: function(pid, slot, val) {
        state[pid].minions[slot] = val;
        saveState();
        renderAll();
        this.openMinionModal(pid); // Refresh icons in modal
    },

    closeMinionModal: function() {
        document.getElementById('gc-mana-modal').style.display = 'none';
    },

    setCollectionLevel:function(pid,key,val){
        val=parseInt(val);
        state[pid].collLevels[key]=val;
        renderCollections(pid);
        updateComparison();
        saveState();
    },
};

function closeOathPopup() {
    var popup = document.getElementById('gc-oath-popup');
    popup.style.display = 'none';
    popup.innerHTML = '';
}

function closeSetPopup() {
    var popup = document.getElementById('gc-set-popup');
    popup.style.display = 'none';
    popup.innerHTML = '';
}

function closeEnchantPopup() {
    var popup = document.getElementById('gc-enchant-popup');
    popup.style.display = 'none';
    popup.innerHTML = '';
    popup.classList.remove('gc-enchant-popup-wrap');
}

function closeManaSlotPopup() {
    var popup = document.getElementById('gc-mana-slot-popup');
    if (popup) {
        popup.style.display = 'none';
        popup.innerHTML = '';
    }
}

function closeAccBonusPopup() {
    var popup = document.getElementById('gc-acc-bonus-popup');
    if (popup) {
        popup.style.display = 'none';
        popup.innerHTML = '';
    }
}

function renderAccBonusPopupContent(popup, pid, slotKey) {
    var acc = state[pid].accessories[slotKey];
    var statsType = ACC_STATS_TYPE[slotKey];
    var setData = ACCESSORY_STATS[acc.set];
    if (!setData) return;
    var slotData = setData[statsType];
    if (!slotData || !slotData.bonuses) return;
    var maxB = slotData.maxBonuses;
    var picked = acc.bonuses || [];
    var slotDef = ACCESSORY_SLOTS_UPPER.concat(ACCESSORY_SLOTS_LOWER_L, ACCESSORY_SLOTS_LOWER_R).find(function(s) { return s.key === slotKey; });
    var slotLabel = slotDef ? slotDef.name : slotKey;

    var html = '<div class="gc-acc-bonus-popup-title">' + slotLabel + ' - Bonuses (' + picked.length + '/' + maxB + ')</div>';
    html += '<div class="gc-shield-bonus-grid">';
    slotData.bonuses.forEach(function(b) {
        var isOn = picked.indexOf(b.key) !== -1;
        var cls = 'gc-shield-bonus-btn' + (isOn ? ' gc-shield-bonus-on' : '');
        html += '<div class="' + cls + '" onclick="GC.toggleAccBonus(' + pid + ',\'' + slotKey + '\',\'' + b.key + '\')">';
        html += '<span class="gc-shield-bonus-name">' + b.name + '</span>';
        if (isOn) {
            var cv = (acc.bonusValues && typeof acc.bonusValues[b.key] === 'number') ? acc.bonusValues[b.key] : b.value;
            html += '<input type="number" class="gc-bonus-val-input" min="0" max="' + b.value + '" value="' + cv + '" onclick="event.stopPropagation()" onchange="GC.setBonusValue(' + pid + ',\'acc\',\'' + slotKey + '\',\'' + b.key + '\',this.value,' + b.value + ')">';
        } else {
            html += '<span class="gc-shield-bonus-val">+' + b.value.toLocaleString() + '</span>';
        }
        html += '</div>';
    });
    html += '</div>';
    popup.innerHTML = html;
}

function renderWeaponBonusPopupContent(popup, pid, slot) {
    var weapon = state[pid][slot];
    var fixed = WEAPON_STATS_FIXED[weapon.set];
    if (!fixed || !fixed.bonuses) return;
    var maxB = fixed.maxBonuses;
    var picked = weapon.bonuses || [];
    var label = slot === 'mainWeapon' ? 'Main Weapon' : 'Off-Hand';

    var html = '<div class="gc-acc-bonus-popup-title">' + label + ' - Bonuses (' + picked.length + '/' + maxB + ')</div>';
    html += '<div class="gc-shield-bonus-grid">';
    fixed.bonuses.forEach(function(b) {
        var isOn = picked.indexOf(b.key) !== -1;
        var cls = 'gc-shield-bonus-btn' + (isOn ? ' gc-shield-bonus-on' : '');
        html += '<div class="' + cls + '" onclick="GC.toggleWeaponBonus(' + pid + ',\'' + slot + '\',\'' + b.key + '\')">';
        html += '<span class="gc-shield-bonus-name">' + b.name + '</span>';
        if (isOn) {
            var cv = (weapon.bonusValues && typeof weapon.bonusValues[b.key] === 'number') ? weapon.bonusValues[b.key] : b.value;
            html += '<input type="number" class="gc-bonus-val-input" min="0" max="' + b.value + '" value="' + cv + '" onclick="event.stopPropagation()" onchange="GC.setBonusValue(' + pid + ',\'weapon\',\'' + slot + '\',\'' + b.key + '\',this.value,' + b.value + ')">';
        } else {
            html += '<span class="gc-shield-bonus-val">+' + b.value.toLocaleString() + '</span>';
        }
        html += '</div>';
    });
    html += '</div>';
    popup.innerHTML = html;
}

function renderShieldBonusPopupContent(popup, pid) {
    var sh = state[pid].shield;
    var shData = SHIELD_STATS[sh.set];
    if (!shData) return;
    var maxB = shData.maxBonuses;
    var typeKey = sh.type === 'scale' ? 'scale' : 'battle';
    var bonusList = shData.bonuses[typeKey] || [];
    var picked = sh.bonuses || [];

    var html = '<div class="gc-acc-bonus-popup-title">Shield - Bonuses (' + picked.length + '/' + maxB + ')</div>';
    html += '<div class="gc-shield-bonus-grid">';
    bonusList.forEach(function(b) {
        var isOn = picked.indexOf(b.key) !== -1;
        var cls = 'gc-shield-bonus-btn' + (isOn ? ' gc-shield-bonus-on' : '');
        html += '<div class="' + cls + '" onclick="GC.toggleShieldBonus(' + pid + ',\'' + b.key + '\')">';
        html += '<span class="gc-shield-bonus-name">' + b.name + '</span>';
        if (isOn) {
            var cv = (sh.bonusValues && typeof sh.bonusValues[b.key] === 'number') ? sh.bonusValues[b.key] : b.value;
            html += '<input type="number" class="gc-bonus-val-input" min="0" max="' + b.value + '" value="' + cv + '" onclick="event.stopPropagation()" onchange="GC.setBonusValue(' + pid + ',\'shield\',\'\',\'' + b.key + '\',this.value,' + b.value + ')">';
        } else {
            html += '<span class="gc-shield-bonus-val">+' + b.value.toLocaleString() + '</span>';
        }
        html += '</div>';
    });
    html += '</div>';
    popup.innerHTML = html;
}

// Shared oath popup (appended to body to escape overflow:hidden)
var oathPopup = document.createElement('div');
oathPopup.id = 'gc-oath-popup';
oathPopup.className = 'gc-oath-popup';
document.body.appendChild(oathPopup);

var setPopup = document.createElement('div');
setPopup.id = 'gc-set-popup';
setPopup.className = 'gc-set-popup';
document.body.appendChild(setPopup);

var enchantPopup = document.createElement('div');
enchantPopup.id = 'gc-enchant-popup';
enchantPopup.className = 'gc-set-popup';
document.body.appendChild(enchantPopup);

// Manastone modal container
var manaModal = document.createElement('div');
manaModal.id = 'gc-mana-modal';
manaModal.className = 'gc-mana-modal';
document.body.appendChild(manaModal);

// Manastone slot picker popup
var manaSlotPopup = document.createElement('div');
manaSlotPopup.id = 'gc-mana-slot-popup';
manaSlotPopup.className = 'gc-set-popup gc-mana-slot-popup';
document.body.appendChild(manaSlotPopup);

// Accessory bonus popup
var accBonusPopup = document.createElement('div');
accBonusPopup.id = 'gc-acc-bonus-popup';
accBonusPopup.className = 'gc-acc-bonus-popup';
document.body.appendChild(accBonusPopup);
accBonusPopup.addEventListener('click', function(e) {
    e.stopPropagation();
});

// Event delegation: comparison row expand/collapse
document.getElementById('comparison-panel').addEventListener('click', function(e) {
    var row = e.target.closest('.gc-comp-expandable');
    if (!row) return;
    var statKey = row.dataset.stat;
    var isOpen = row.classList.contains('gc-comp-expanded');
    // Close all open rows first
    document.querySelectorAll('.gc-comp-expanded').forEach(function(r) { r.classList.remove('gc-comp-expanded'); });
    document.querySelectorAll('.gc-comp-source-row.gc-comp-source-visible').forEach(function(r) { r.classList.remove('gc-comp-source-visible'); });
    if (!isOpen) {
        row.classList.add('gc-comp-expanded');
        document.querySelectorAll('.gc-comp-source-row[data-parent="' + statKey + '"]').forEach(function(r) {
            r.classList.add('gc-comp-source-visible');
        });
    }
});

// Event delegation: mana slot clicks inside modal
manaModal.addEventListener('click', function(e) {
    var slotEl = e.target.closest('.gc-mana-slot');
    if (slotEl && slotEl.dataset.pid) {
        e.stopPropagation();
        GC.openManaSlotPicker(
            parseInt(slotEl.dataset.pid),
            slotEl.dataset.gear,
            parseInt(slotEl.dataset.slot),
            slotEl
        );
    }
});

// Event delegation: mana option clicks inside slot picker popup
manaSlotPopup.addEventListener('click', function(e) {
    e.stopPropagation();
    var optEl = e.target.closest('.gc-set-option');
    if (optEl && optEl.dataset.mana !== undefined) {
        var popup = document.getElementById('gc-mana-slot-popup');
        GC.setManastone(
            parseInt(popup.dataset.pid),
            popup.dataset.gearKey,
            parseInt(popup.dataset.slotIdx),
            optEl.dataset.mana
        );
    }
});

// Close pickers on outside click
document.addEventListener('click', function(e) {
    if (!e.target.closest('.gc-wc-item')) {
        document.querySelectorAll('.gc-icon-picker-menu').forEach(function(m) {
            m.classList.remove('gc-picker-open');
        });
    }
    if (!e.target.closest('.gc-oath-popup') && !e.target.closest('.gc-oath-pick')) {
        closeOathPopup();
    }
    if (!e.target.closest('.gc-set-popup') && !e.target.closest('.gc-set-trigger') && !e.target.closest('.gc-enchant-trigger') && !e.target.closest('#gc-enchant-popup')) {
        closeSetPopup();
        closeEnchantPopup();
    }
    // Close mana slot popup on outside click
    if (!e.target.closest('#gc-mana-slot-popup') && !e.target.closest('.gc-mana-slot')) {
        closeManaSlotPopup();
    }
    // Close acc bonus popup on outside click
    if (!e.target.closest('.gc-acc-bonus-popup') && !e.target.closest('.gc-acc-bonus-trigger')) {
        closeAccBonusPopup();
    }
});

// Close oath popup on scroll
window.addEventListener('scroll', function() { closeOathPopup(); closeSetPopup(); closeEnchantPopup(); closeAccBonusPopup(); }, true);

// Close skill info modal on click outside
document.addEventListener('click', function(e) {
    var modal = document.getElementById('gcSkillInfoModal');
    if (e.target === modal) {
        GC.closeSkillInfo();
    }
});

// Close mana modal on Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var modal = document.getElementById('gc-mana-modal');
        if (modal && modal.style.display === 'block') {
            GC.closeManaModal();
        }
        // Also close skill info modal
        var skillModal = document.getElementById('gcSkillInfoModal');
        if (skillModal && skillModal.classList.contains('active')) {
            GC.closeSkillInfo();
        }
    }
});

function closeCopyPopupOutside(e) {
    var popup = document.getElementById('gc-copy-popup');
    if (!popup) { document.removeEventListener('click', closeCopyPopupOutside, true); return; }
    if (!popup.contains(e.target) && e.target.id !== 'gc-copy-btn') {
        popup.remove();
        document.removeEventListener('click', closeCopyPopupOutside, true);
    }
}
