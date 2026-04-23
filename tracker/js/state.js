'use strict';

var STORAGE_KEY = 'tracker-state-v1';
var STATE_VERSION = 2;
var FIXED_TABS = [
    { id: 'currency', name: 'Currency', subcategories: [] },
    { id: 'upgrade-materials', name: 'Upgrade Materials', subcategories: [] },
    { id: 'account-warehouse', name: 'Account Warehouse', subcategories: [] },
    { id: 'crafting-materials', name: 'Crafting Materials', subcategories: [] },
    { id: 'apsharanta', name: 'Apsharanta', subcategories: ['heavenly', 'sundew', 'nightshade', 'ancient'] },
    { id: 'daeva-pass', name: 'Daeva Pass', subcategories: [] },
    { id: 'instances', name: 'Instances', subcategories: ['group-hard-normal', 'group-easy-normal', 'solo'] }
];

var trackerState = {};
var tabs = [];
var activeTab = 'currency';
var nextTabId = 1;

function getDefaultRunsMap() {
    var runs = {};
    getDucatInstances().forEach(function(inst) {
        runs[inst.id] = 0;
    });
    return runs;
}

function getDucatInstances() {
    if (typeof DUCAT_INSTANCES !== 'undefined' && Array.isArray(DUCAT_INSTANCES)) return DUCAT_INSTANCES;
    if (typeof INSTANCE_GROUPS !== 'undefined' && INSTANCE_GROUPS) {
        var hard = Array.isArray(INSTANCE_GROUPS.groupHardNormal) ? INSTANCE_GROUPS.groupHardNormal : [];
        var easy = Array.isArray(INSTANCE_GROUPS.groupEasyNormal) ? INSTANCE_GROUPS.groupEasyNormal : [];
        return hard.concat(easy);
    }
    return [];
}

function createDefaultCharacter(charId, charName) {
    return { id: charId, name: charName, classKey: 'gladiator' };
}

function createDefaultCoreState() {
    var charId = 'char-1';
    return {
        version: STATE_VERSION,
        characters: {
            byId: {
                'char-1': createDefaultCharacter(charId, 'Character 1')
            },
            order: [charId],
            activeCharacterId: charId,
            nextCharId: 2
        },
        ducat: {
            byCharacter: {
                'char-1': {
                    runs: getDefaultRunsMap(),
                    totalDucats: 0
                }
            }
        },
        tabSelections: {
            apsharanta: '',
            instances: ''
        },
        customTabs: {},
        fixedTabDataByCharacter: {}
    };
}

function getFixedTabById(tabId) {
    return FIXED_TABS.find(function(tab) { return tab.id === tabId; }) || null;
}

function rebuildTabsList() {
    tabs = FIXED_TABS.map(function(tab) { return tab.id; });
    Object.keys(trackerState.customTabs || {}).forEach(function(tabId) {
        tabs.push(tabId);
    });
}

function ensureCharacterDucatData(charId) {
    if (!trackerState.ducat.byCharacter[charId]) {
        trackerState.ducat.byCharacter[charId] = {
            runs: getDefaultRunsMap(),
            totalDucats: 0
        };
    }
    if (!trackerState.ducat.byCharacter[charId].runs) {
        trackerState.ducat.byCharacter[charId].runs = getDefaultRunsMap();
    }
    getDucatInstances().forEach(function(inst) {
        if (typeof trackerState.ducat.byCharacter[charId].runs[inst.id] !== 'number') {
            trackerState.ducat.byCharacter[charId].runs[inst.id] = 0;
        }
    });
    if (typeof trackerState.ducat.byCharacter[charId].totalDucats !== 'number') {
        trackerState.ducat.byCharacter[charId].totalDucats = 0;
    }
}

function normalizeState() {
    if (!trackerState || typeof trackerState !== 'object') trackerState = createDefaultCoreState();
    if (!trackerState.characters) trackerState.characters = createDefaultCoreState().characters;
    if (!trackerState.characters.byId) trackerState.characters.byId = {};
    if (!Array.isArray(trackerState.characters.order)) trackerState.characters.order = Object.keys(trackerState.characters.byId);
    if (!trackerState.characters.activeCharacterId) trackerState.characters.activeCharacterId = trackerState.characters.order[0];
    if (!trackerState.characters.nextCharId) trackerState.characters.nextCharId = 2;
    if (!trackerState.ducat) trackerState.ducat = { byCharacter: {} };
    if (!trackerState.ducat.byCharacter) trackerState.ducat.byCharacter = {};
    if (!trackerState.tabSelections) trackerState.tabSelections = { apsharanta: '', instances: '' };
    if (typeof trackerState.tabSelections.apsharanta !== 'string') trackerState.tabSelections.apsharanta = '';
    if (typeof trackerState.tabSelections.instances !== 'string') trackerState.tabSelections.instances = '';
    if (!trackerState.customTabs) trackerState.customTabs = {};
    if (!trackerState.fixedTabDataByCharacter) trackerState.fixedTabDataByCharacter = {};

    if (trackerState.characters.order.length === 0) {
        var fallbackId = 'char-1';
        trackerState.characters.byId[fallbackId] = createDefaultCharacter(fallbackId, 'Character 1');
        trackerState.characters.order = [fallbackId];
        trackerState.characters.activeCharacterId = fallbackId;
        if (trackerState.characters.nextCharId < 2) trackerState.characters.nextCharId = 2;
    }

    trackerState.characters.order = trackerState.characters.order.filter(function(charId) {
        return trackerState.characters.byId[charId];
    });
    if (trackerState.characters.order.length === 0) {
        trackerState.characters.order = Object.keys(trackerState.characters.byId);
    }
    trackerState.characters.order.forEach(function(charId) {
        ensureCharacterDucatData(charId);
    });

    if (!trackerState.characters.byId[trackerState.characters.activeCharacterId]) {
        trackerState.characters.activeCharacterId = trackerState.characters.order[0];
    }
    trackerState.version = STATE_VERSION;
    rebuildTabsList();
    if (!getFixedTabById(activeTab) && !trackerState.customTabs[activeTab]) {
        activeTab = 'currency';
    }
}

function migrateOldShape(saved) {
    var migrated = createDefaultCoreState();
    var oldState = saved && saved.tabData ? saved.tabData : {};
    var oldDucat = oldState.ducat || {};
    var oldChars = oldDucat.characters || {};
    var oldCharIds = Object.keys(oldChars);

    if (oldCharIds.length > 0) {
        migrated.characters.byId = {};
        migrated.characters.order = [];
        migrated.ducat.byCharacter = {};
        oldCharIds.forEach(function(charId) {
            var oldChar = oldChars[charId] || {};
            migrated.characters.byId[charId] = {
                id: charId,
                name: oldChar.name || charId,
                classKey: isValidCharacterClass(oldChar.classKey) ? oldChar.classKey : 'gladiator'
            };
            migrated.characters.order.push(charId);
            migrated.ducat.byCharacter[charId] = {
                runs: getDefaultRunsMap(),
                totalDucats: typeof oldChar.totalDucats === 'number' ? oldChar.totalDucats : 0
            };
            getDucatInstances().forEach(function(inst) {
                var runVal = oldChar.runs && typeof oldChar.runs[inst.id] === 'number' ? oldChar.runs[inst.id] : 0;
                migrated.ducat.byCharacter[charId].runs[inst.id] = runVal;
            });
        });
        migrated.characters.activeCharacterId = oldDucat.activeCharacterId && migrated.characters.byId[oldDucat.activeCharacterId]
            ? oldDucat.activeCharacterId
            : migrated.characters.order[0];
        migrated.characters.nextCharId = oldDucat.nextCharId || (migrated.characters.order.length + 1);
    }

    var oldTabs = saved && Array.isArray(saved.tabs) ? saved.tabs : [];
    var customTabIds = oldTabs.filter(function(tabId) {
        return tabId !== 'ducat' && !getFixedTabById(tabId);
    });
    customTabIds.forEach(function(tabId) {
        var oldTab = oldState[tabId];
        if (!oldTab || !Array.isArray(oldTab.fields)) return;
        migrated.customTabs[tabId] = {
            id: tabId,
            name: oldTab.name || tabId,
            isDefault: false,
            fields: oldTab.fields.map(function(field) {
                var values = {};
                migrated.characters.order.forEach(function(charId) {
                    values[charId] = field.value;
                });
                return {
                    id: field.id || ('field-' + Date.now()),
                    type: field.type || 'text',
                    label: field.label || 'Field',
                    maxValue: field.maxValue || null,
                    options: Array.isArray(field.options) ? field.options : [],
                    values: values
                };
            })
        };
    });

    nextTabId = saved && saved.nextTabId ? saved.nextTabId : 1;
    if (saved && saved.activeTab === 'ducat') activeTab = 'currency';
    else activeTab = saved && saved.activeTab ? saved.activeTab : 'currency';

    return migrated;
}

function saveTrackerState() {
    try {
        var data = {
            version: STATE_VERSION,
            tabs: tabs,
            activeTab: activeTab,
            tabData: trackerState,
            nextTabId: nextTabId
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
}

function loadTrackerState() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        var saved = JSON.parse(raw);
        if (!saved || !saved.tabData) return false;

        if (!saved.version || saved.version < STATE_VERSION || saved.tabData.ducat && saved.tabData.ducat.characters) {
            trackerState = migrateOldShape(saved);
        } else {
            trackerState = saved.tabData;
            activeTab = saved.activeTab || 'currency';
            nextTabId = saved.nextTabId || 1;
        }
        normalizeState();
        saveTrackerState();
        return true;
    } catch (e) {
        return false;
    }
}

function initializeTracker() {
    if (!loadTrackerState()) {
        trackerState = createDefaultCoreState();
        activeTab = 'currency';
        nextTabId = 1;
        normalizeState();
        saveTrackerState();
    }
}

function createCustomTab(id, name) {
    return { id: id, name: name, isDefault: false, fields: [] };
}

function addCustomTab(name) {
    var tabId = 'tab-' + (nextTabId++);
    trackerState.customTabs[tabId] = createCustomTab(tabId, name);
    rebuildTabsList();
    activeTab = tabId;
    saveTrackerState();
    return tabId;
}

function removeTab(tabId) {
    if (!trackerState.customTabs[tabId]) return false;
    delete trackerState.customTabs[tabId];
    rebuildTabsList();
    if (!tabs.includes(activeTab)) activeTab = 'currency';
    saveTrackerState();
    return true;
}

function getActiveCharacterId() {
    return trackerState.characters.activeCharacterId;
}

function getActiveCharacter() {
    return trackerState.characters.byId[getActiveCharacterId()] || null;
}

function getAllCharacters() {
    return trackerState.characters.order.map(function(charId) {
        return trackerState.characters.byId[charId];
    });
}

function addCharacter(charName) {
    if (trackerState.characters.order.length >= 10) return null;
    var charId = 'char-' + (trackerState.characters.nextCharId++);
    trackerState.characters.byId[charId] = createDefaultCharacter(charId, charName);
    trackerState.characters.order.push(charId);
    ensureCharacterDucatData(charId);
    Object.keys(trackerState.customTabs).forEach(function(tabId) {
        trackerState.customTabs[tabId].fields.forEach(function(field) {
            if (!field.values) field.values = {};
            field.values[charId] = getDefaultFieldValue(field.type);
        });
    });
    saveTrackerState();
    return charId;
}

function removeCharacter(charId) {
    if (!trackerState.characters.byId[charId]) return false;
    if (trackerState.characters.order.length <= 1) return false;
    delete trackerState.characters.byId[charId];
    delete trackerState.ducat.byCharacter[charId];
    trackerState.characters.order = trackerState.characters.order.filter(function(id) { return id !== charId; });
    Object.keys(trackerState.customTabs).forEach(function(tabId) {
        trackerState.customTabs[tabId].fields.forEach(function(field) {
            if (field.values) delete field.values[charId];
        });
    });
    if (trackerState.characters.activeCharacterId === charId) {
        trackerState.characters.activeCharacterId = trackerState.characters.order[0];
    }
    saveTrackerState();
    return true;
}

function switchCharacter(charId) {
    if (!trackerState.characters.byId[charId]) return false;
    trackerState.characters.activeCharacterId = charId;
    saveTrackerState();
    return true;
}

function renameCharacter(charId, newName) {
    if (!trackerState.characters.byId[charId]) return false;
    trackerState.characters.byId[charId].name = newName;
    saveTrackerState();
    return true;
}

function getCharacterClassKeys() {
    if (typeof CLASS_ORDER !== 'undefined' && Array.isArray(CLASS_ORDER) && CLASS_ORDER.length > 0) return CLASS_ORDER.slice();
    if (typeof CLASS_DATA !== 'undefined' && CLASS_DATA && typeof CLASS_DATA === 'object') return Object.keys(CLASS_DATA);
    return ['gladiator'];
}

function isValidCharacterClass(classKey) {
    return getCharacterClassKeys().indexOf(classKey) !== -1;
}

function getCharacterClass(charId) {
    var char = trackerState.characters.byId[charId] || getActiveCharacter();
    if (!char || !isValidCharacterClass(char.classKey)) return 'gladiator';
    return char.classKey;
}

function setCharacterClass(charId, classKey) {
    if (!trackerState.characters.byId[charId]) return false;
    if (!isValidCharacterClass(classKey)) return false;
    trackerState.characters.byId[charId].classKey = classKey;
    saveTrackerState();
    return true;
}

function getDucatRuns(instanceId, charId) {
    var targetChar = charId || getActiveCharacterId();
    ensureCharacterDucatData(targetChar);
    return trackerState.ducat.byCharacter[targetChar].runs[instanceId] || 0;
}

function setDucatRuns(instanceId, value, charId) {
    var instance = getDucatInstances().find(function(i) { return i.id === instanceId; });
    if (!instance) return;
    var targetChar = charId || getActiveCharacterId();
    ensureCharacterDucatData(targetChar);
    var clamped = Math.max(0, Math.min(parseInt(value, 10) || 0, instance.maxRuns));
    trackerState.ducat.byCharacter[targetChar].runs[instanceId] = clamped;
    saveTrackerState();
}

function resetDucatRuns(charId) {
    var targetChar = charId || getActiveCharacterId();
    ensureCharacterDucatData(targetChar);
    getDucatInstances().forEach(function(inst) {
        trackerState.ducat.byCharacter[targetChar].runs[inst.id] = 0;
    });
    saveTrackerState();
}

function resetAllCharacterRuns() {
    trackerState.characters.order.forEach(function(charId) {
        resetDucatRuns(charId);
    });
    saveTrackerState();
}

function getTotalDucats(charId) {
    var targetChar = charId || getActiveCharacterId();
    ensureCharacterDucatData(targetChar);
    return trackerState.ducat.byCharacter[targetChar].totalDucats || 0;
}

function setTotalDucats(value, charId) {
    var targetChar = charId || getActiveCharacterId();
    ensureCharacterDucatData(targetChar);
    trackerState.ducat.byCharacter[targetChar].totalDucats = Math.max(0, Math.min(parseInt(value, 10) || 0, 1000));
    saveTrackerState();
}

function getTabData(tabId) {
    if (getFixedTabById(tabId)) {
        return getFixedTabById(tabId);
    }
    return trackerState.customTabs[tabId] || null;
}

function getDefaultFieldValue(fieldType) {
    if (fieldType === 'checkbox') return false;
    if (fieldType === 'checklist') return {};
    return '';
}

function addFieldToTab(tabId, fieldType, fieldLabel, maxValue, options) {
    var tab = trackerState.customTabs[tabId];
    if (!tab) return;
    var field = {
        id: 'field-' + Date.now(),
        type: fieldType,
        label: fieldLabel,
        maxValue: maxValue || null,
        options: options || [],
        values: {}
    };
    trackerState.characters.order.forEach(function(charId) {
        field.values[charId] = getDefaultFieldValue(fieldType);
    });
    tab.fields.push(field);
    saveTrackerState();
}

function removeField(tabId, fieldIndex) {
    var tab = trackerState.customTabs[tabId];
    if (!tab || fieldIndex < 0 || fieldIndex >= tab.fields.length) return;
    tab.fields.splice(fieldIndex, 1);
    saveTrackerState();
}

function getCustomFieldValue(field, charId) {
    var targetChar = charId || getActiveCharacterId();
    if (!field.values) field.values = {};
    if (field.values[targetChar] === undefined) field.values[targetChar] = getDefaultFieldValue(field.type);
    return field.values[targetChar];
}

function updateCustomField(tabId, fieldIndex, value) {
    var tab = trackerState.customTabs[tabId];
    if (!tab || fieldIndex >= tab.fields.length) return;
    var field = tab.fields[fieldIndex];
    if (!field.values) field.values = {};
    if (field.type === 'number' && field.maxValue) {
        var num = parseInt(value, 10) || 0;
        value = Math.max(0, Math.min(num, field.maxValue));
    }
    field.values[getActiveCharacterId()] = value;
    saveTrackerState();
}

function toggleCheckboxField(tabId, fieldIndex) {
    var tab = trackerState.customTabs[tabId];
    if (!tab || fieldIndex < 0 || fieldIndex >= tab.fields.length) return;
    var field = tab.fields[fieldIndex];
    field.values[getActiveCharacterId()] = !getCustomFieldValue(field);
    saveTrackerState();
}

function toggleChecklistItem(tabId, fieldIndex, optionKey) {
    var tab = trackerState.customTabs[tabId];
    if (!tab || fieldIndex < 0 || fieldIndex >= tab.fields.length) return;
    var field = tab.fields[fieldIndex];
    var current = getCustomFieldValue(field);
    if (!current || typeof current !== 'object') current = {};
    current[optionKey] = !current[optionKey];
    field.values[getActiveCharacterId()] = current;
    saveTrackerState();
}

function updateFieldProperties(tabId, fieldIndex, properties) {
    var tab = trackerState.customTabs[tabId];
    if (!tab || fieldIndex >= tab.fields.length) return;
    var field = tab.fields[fieldIndex];
    if (properties.maxValue !== undefined) field.maxValue = properties.maxValue;
    if (properties.options !== undefined) field.options = properties.options;
    saveTrackerState();
}

function reorderCharacters(fromIndex, toIndex) {
    var order = trackerState.characters.order;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= order.length || toIndex >= order.length) return;
    var moved = order[fromIndex];
    order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    saveTrackerState();
}

function reorderFields(tabId, fromIndex, toIndex) {
    var tab = trackerState.customTabs[tabId];
    if (!tab || fromIndex < 0 || toIndex < 0 || fromIndex >= tab.fields.length || toIndex >= tab.fields.length) return;
    var moved = tab.fields[fromIndex];
    tab.fields.splice(fromIndex, 1);
    tab.fields.splice(toIndex, 0, moved);
    saveTrackerState();
}

function setTabSubcategory(tabId, subcategoryId) {
    if (!trackerState.tabSelections.hasOwnProperty(tabId)) return;
    trackerState.tabSelections[tabId] = subcategoryId || '';
    saveTrackerState();
}

function getTabSubcategory(tabId) {
    return trackerState.tabSelections[tabId] || '';
}
