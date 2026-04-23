'use strict';

function getTrackerClassData(classKey) {
    if (typeof CLASS_DATA !== 'undefined' && CLASS_DATA && CLASS_DATA[classKey]) {
        return CLASS_DATA[classKey];
    }
    return { name: 'Unknown', icon: '../assets/icons/icon_frame_2.png' };
}

function getCharacterClassInfo(charId) {
    var classKey = getCharacterClass(charId);
    var classData = getTrackerClassData(classKey);
    return {
        key: classKey,
        name: classData.name,
        icon: classData.icon
    };
}

function refreshDucatOverview() {
    var overview = document.querySelector('.tracker-ducat-overview');
    if (!overview) return;

    var characters = getAllCharacters();
    if (characters.length === 0) return;

    var lowestDucats = Math.min.apply(null, characters.map(function(char) { return getTotalDucats(char.id); }));
    characters.forEach(function(char) {
        var pill = overview.querySelector('[data-char-id="' + char.id + '"]');
        if (!pill) return;

        var charDucats = getTotalDucats(char.id);
        var classInfo = getCharacterClassInfo(char.id);
        var needsFarm = characters.length > 1 && charDucats === lowestDucats;
        var isActive = getActiveCharacter() && getActiveCharacter().id === char.id;

        var ducatValueEl = pill.querySelector('.tracker-ducat-pill-value');
        if (ducatValueEl) ducatValueEl.textContent = charDucats;

        var classIconEl = pill.querySelector('.tracker-ducat-pill-class-icon');
        if (classIconEl) {
            classIconEl.src = classInfo.icon;
            classIconEl.alt = classInfo.name;
        }

        pill.classList.toggle('tracker-ducat-pill-low', needsFarm);
        pill.classList.toggle('tracker-ducat-pill-active', isActive);
        pill.setAttribute('data-char-name', char.name);
    });
}

function renderAll() {
    renderTabs();
    renderActiveTabContent();
}

function renderTabs() {
    var tabBar = document.getElementById('tracker-tab-bar');
    if (!tabBar) return;

    tabBar.innerHTML = '';

    tabs.forEach(function(tabId) {
        var tabData = getTabData(tabId);
        if (!tabData) return;

        var btn = document.createElement('button');
        btn.className = 'tracker-tab' + (activeTab === tabId ? ' tracker-tab-active' : '');
        btn.setAttribute('data-tab-id', tabId);
        btn.onclick = function() { activateTab(tabId); };

        // Icon and label
        if (tabId === 'currency') {
            btn.innerHTML = '<img src="../assets/icons/coin_05.png" class="tracker-tab-icon" alt=""> ' + tabData.name;
        } else {
            btn.innerHTML = tabData.name;
            var removeBtn = document.createElement('span');
            removeBtn.className = 'tracker-tab-remove';
            removeBtn.innerHTML = '✕';
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                TK.removeTab(tabId);
            };
            if (!getFixedTabById(tabId)) {
                btn.appendChild(removeBtn);
            }
        }

        tabBar.appendChild(btn);
    });

    // Add new tab button
    var addBtn = document.createElement('button');
    addBtn.className = 'tracker-tab-add';
    addBtn.innerHTML = '+';
    addBtn.onclick = function() {
        TK.openAddTabDialog();
    };
    tabBar.appendChild(addBtn);

    // Export / Import data buttons
    var dataActions = document.createElement('div');
    dataActions.className = 'tracker-data-actions';

    var exportBtn = document.createElement('button');
    exportBtn.className = 'tracker-data-btn tracker-export-btn';
    exportBtn.innerHTML = '&#x2B07; Export';
    exportBtn.title = 'Export configuration to JSON file';
    exportBtn.onclick = function() { TK.exportData(); };
    dataActions.appendChild(exportBtn);

    var importBtn = document.createElement('button');
    importBtn.className = 'tracker-data-btn tracker-import-btn';
    importBtn.innerHTML = '&#x2B06; Import';
    importBtn.title = 'Import configuration from JSON file';
    importBtn.onclick = function() { TK.importData(); };
    dataActions.appendChild(importBtn);

    tabBar.appendChild(dataActions);
}

function renderActiveTabContent() {
    var content = document.getElementById('tracker-content');
    if (!content) return;

    var tabData = getTabData(activeTab);
    if (!tabData) return;

    var html = '<div class="tracker-shared-top">';
    html += renderCharacterTabsHtml();
    html += '</div>';
    content.innerHTML = html + '<div id="tracker-tab-body"></div>';

    var body = document.getElementById('tracker-tab-body');
    if (!body) return;

    if (activeTab === 'currency') {
        renderCurrencyTab(body);
        return;
    }

    if (activeTab === 'instances' || activeTab === 'apsharanta') {
        var selectedSubcategory = getTabSubcategory(activeTab);
        if (!selectedSubcategory) {
            renderSubcategoryChooser(body, activeTab);
            return;
        }
        if (activeTab === 'instances') {
            renderInstancesSubcategory(body, selectedSubcategory);
        } else {
            renderApsharantaSubcategory(body, selectedSubcategory);
        }
        return;
    }

    if (getFixedTabById(activeTab)) {
        renderFixedTabPlaceholder(body, tabData);
        return;
    }

    renderCustomTab(body, tabData);
}

function renderCurrencyTab(container) {
    var html = '';
    var characters = getAllCharacters();
    var lowestDucats = characters.length > 0
        ? Math.min.apply(null, characters.map(function(char) { return getTotalDucats(char.id); }))
        : 0;

    html += '<div class="tracker-ducat-header">';
    html += '    <div class="tracker-ducat-header-main">';
    html += '        <h2>Ducat Tracking</h2>';
    html += '        <div class="tracker-ducat-overview">';
    characters.forEach(function(char) {
        var classInfo = getCharacterClassInfo(char.id);
        var charDucats = getTotalDucats(char.id);
        var isActive = getActiveCharacter() && getActiveCharacter().id === char.id;
        var needsFarm = characters.length > 1 && charDucats === lowestDucats;
        html += '            <div class="tracker-ducat-pill' + (isActive ? ' tracker-ducat-pill-active' : '') + (needsFarm ? ' tracker-ducat-pill-low' : '') + '" data-char-id="' + char.id + '" data-char-name="' + char.name + '">';
        html += '                <span class="tracker-ducat-pill-class-btn">';
        html += '                    <img src="' + classInfo.icon + '" class="tracker-ducat-pill-class-icon" alt="' + classInfo.name + '">';
        html += '                </span>';
        html += '                <img src="../assets/icons/coin_05.png" class="tracker-ducat-pill-icon" alt="">';
        html += '                <span class="tracker-ducat-pill-value">' + charDucats + '</span>';
        html += '            </div>';
    });
    html += '        </div>';
    html += '    </div>';
    html += '    <button class="tracker-reset-all-btn" onclick="TK.resetAllRuns()" title="Reset all instance runs to 0 for ALL characters (maintenance)">&#x1F504; Reset All</button>';
    html += '</div>';
    html += renderDucatsControlHtml('Ducats');
    html += '<p class="tracker-empty-message">Currency items (including Ducat trackers) will be added here.</p>';
    container.innerHTML = html;
}

function renderInstanceGridHtml(instances) {
    var html = '';
    html += '<div class="tracker-instances-grid">';
    var activeChar = getActiveCharacter();
    if (activeChar) {
        instances.forEach(function(instance) {
            var runs = getDucatRuns(instance.id, activeChar.id);

            html += '    <div class="tracker-instance-card">';
            html += '        <div class="tracker-instance-name">' + instance.name + '</div>';
            html += '        <div class="tracker-instance-subtitle">Max runs: ' + instance.maxRuns + '</div>';
            html += '        <div class="tracker-runs-input">';
            html += '            <button class="tracker-btn-minus" onclick="TK.decrementRuns(\'' + instance.id + '\')">−</button>';
            html += '            <input type="number" class="tracker-runs-value" id="runs-' + instance.id + '" ';
            html += '                   value="' + runs + '" min="0" max="' + instance.maxRuns + '" ';
            html += '                   onchange="TK.setRuns(\'' + instance.id + '\', this.value)" />';
            html += '            <button class="tracker-btn-plus" onclick="TK.incrementRuns(\'' + instance.id + '\')">+</button>';
            html += '        </div>';
            html += '    </div>';
        });
    }

    html += '</div>';
    return html;
}

function renderDucatsControlHtml(labelText) {
    var html = '';
    var title = labelText || 'Total Ducats';
    html += '<div class="tracker-total-ducats-section">';
    html += '    <div class="tracker-total-ducats-row">';
    html += '        <div class="tracker-total-ducats-label">' + title + '<img src="../assets/icons/coin_05.png"></div>';
    html += '        <button class="tracker-reset-ducats-btn" onclick="TK.resetTotalDucats()" title="Reset total ducats to 0">&#x21BA; Reset</button>';
    html += '    </div>';
    var totalDucats = getTotalDucats();
    html += '    <div class="tracker-total-ducats-input-group">';
    html += '        <button class="tracker-btn-minus" onclick="TK.decrementTotalDucats()">−</button>';
    html += '        <input type="number" class="tracker-total-ducats-input" ';
    html += '               id="tracker-total-ducats" ';
    html += '               value="' + totalDucats + '" min="0" max="1000" ';
    html += '               onchange="TK.setTotalDucats(this.value)" />';
    html += '        <button class="tracker-btn-plus" onclick="TK.incrementTotalDucats()">+</button>';
    html += '        <span class="tracker-total-ducats-max">/1000</span>';
    html += '    </div>';
    html += '</div>';
    return html;
}

function renderCharacterTabsHtml() {
    var html = '';
    var characters = getAllCharacters();
    html += '<div class="tracker-char-tabs-wrapper">';
    html += '    <div class="tracker-char-tabs">';
    characters.forEach(function(char, index) {
        var charClassInfo = getCharacterClassInfo(char.id);
        var classKeys = getCharacterClassKeys();
        var isActive = getActiveCharacter() && getActiveCharacter().id === char.id;
        html += '        <button class="tracker-char-tab' + (isActive ? ' tracker-char-tab-active' : '') + '" ';
        html += '                draggable="true" ';
        html += '                data-char-id="' + char.id + '" ';
        html += '                data-char-index="' + index + '" ';
        html += '                ondragstart="TK.dragStartChar(event)" ';
        html += '                ondragover="TK.dragOverChar(event)" ';
        html += '                ondrop="TK.dropChar(event)" ';
        html += '                ondragend="TK.dragEndChar(event)" ';
        html += '                onclick="TK.switchCharacter(\'' + char.id + '\')" ';
        html += '                title="' + char.name + '">';
        html += '            <span class="tracker-char-class-btn" onclick="event.stopPropagation(); TK.toggleClassMenu(event, \'' + char.id + '\')" title="Class: ' + charClassInfo.name + '">';
        html += '                <img src="' + charClassInfo.icon + '" class="tracker-char-class-icon" alt="' + charClassInfo.name + '">';
        html += '            </span>';
        html += '            <div class="tracker-char-class-menu" id="tracker-class-menu-' + char.id + '" onclick="event.stopPropagation()">';
        classKeys.forEach(function(classKey) {
            var classData = getTrackerClassData(classKey);
            var isCurrentClass = classKey === charClassInfo.key;
            html += '                <span class="tracker-char-class-option' + (isCurrentClass ? ' tracker-char-class-option-active' : '') + '" onclick="event.stopPropagation(); TK.selectCharacterClass(\'' + char.id + '\', \'' + classKey + '\')" title="' + classData.name + '">';
            html += '                    <img src="' + classData.icon + '" class="tracker-char-class-option-icon" alt="' + classData.name + '">';
            html += '                </span>';
        });
        html += '            </div>';
        html += '            <span class="tracker-char-name" ondblclick="event.stopPropagation(); TK.openRenameCharDialog(\'' + char.id + '\')" title="Double-click to rename">' + char.name + '</span>';
        if (characters.length > 1) {
            html += '            <span class="tracker-char-remove" onclick="event.stopPropagation(); TK.removeCharacter(\'' + char.id + '\')">✕</span>';
        }
        html += '        </button>';
    });
    if (characters.length < 10) {
        html += '        <button class="tracker-char-add" onclick="TK.openAddCharDialog()">+ Add Char</button>';
    }
    html += '    </div>';
    html += '</div>';
    return html;
}

function renderSubcategoryChooser(container, tabId) {
    var html = '';
    var tab = getFixedTabById(tabId);
    if (!tab) return;
    html += '<div class="tracker-subcategory-chooser tracker-subcategory-chooser-' + tabId + '">';
    html += '  <h2>' + tab.name + '</h2>';
    html += '  <p class="tracker-subcategory-text">Choose a category:</p>';
    html += '  <div class="tracker-subcategory-grid tracker-subcategory-grid-' + tabId + '">';
    tab.subcategories.forEach(function(subcategoryId) {
        html += '    <button class="tracker-subcategory-btn" onclick="TK.selectSubcategory(\'' + tabId + '\', \'' + subcategoryId + '\')">' + TK.getSubcategoryLabel(tabId, subcategoryId) + '</button>';
    });
    html += '  </div>';
    html += '</div>';
    container.innerHTML = html;
}

function renderInstancesSubcategory(container, subcategoryId) {
    var html = '<div class="tracker-subcategory-view">';
    html += '<div class="tracker-subcategory-header">';
    html += '<button class="tracker-subcategory-back" onclick="TK.clearSubcategory(\'instances\')">← Back</button>';
    html += '<h2>' + TK.getSubcategoryLabel('instances', subcategoryId) + '</h2>';
    html += '</div>';

    var instances = [];
    if (subcategoryId === 'group-hard-normal') {
        instances = INSTANCE_GROUPS.groupHardNormal || [];
    } else if (subcategoryId === 'group-easy-normal') {
        instances = INSTANCE_GROUPS.groupEasyNormal || [];
    } else if (subcategoryId === 'solo') {
        instances = INSTANCE_GROUPS.solo || [];
    }

    if (instances.length > 0) {
        html += renderInstanceGridHtml(instances);
    } else {
        html += '<p class="tracker-empty-message">No instances configured in this category yet.</p>';
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderApsharantaSubcategory(container, subcategoryId) {
    var html = '<div class="tracker-subcategory-view">';
    html += '<div class="tracker-subcategory-header">';
    html += '<button class="tracker-subcategory-back" onclick="TK.clearSubcategory(\'apsharanta\')">← Back</button>';
    html += '<h2>' + TK.getSubcategoryLabel('apsharanta', subcategoryId) + '</h2>';
    html += '</div>';
    html += '<p class="tracker-empty-message">' + TK.getSubcategoryLabel('apsharanta', subcategoryId) + ' data will be added next.</p>';
    html += '</div>';
    container.innerHTML = html;
}

function renderFixedTabPlaceholder(container, tabData) {
    var html = '';
    html += '<div class="tracker-fixed-placeholder">';
    html += '    <h2>' + tabData.name + '</h2>';
    html += '    <p class="tracker-empty-message">' + tabData.name + ' data layout is ready. Data fields will be added next.</p>';
    html += '</div>';
    container.innerHTML = html;
}

function renderCustomTab(container, tabData) {
    var html = '';

    html += '<div class="tracker-custom-header">';
    html += '    <h2>' + tabData.name + '</h2>';
    html += '    <button class="tracker-add-field-btn" onclick="TK.openAddFieldDialog(\'' + tabData.id + '\')">+ Add Field</button>';
    html += '</div>';

    html += '<div class="tracker-custom-fields">';

    if (tabData.fields.length === 0) {
        html += '    <p class="tracker-empty-message">No fields yet. Click "+ Add Field" to get started.</p>';
    } else {
        tabData.fields.forEach(function(field, index) {
            html += '    <div class="tracker-custom-field" ';
            html += '        draggable="true" ';
            html += '        data-tab-id="' + tabData.id + '" ';
            html += '        data-field-index="' + index + '" ';
            html += '        ondragstart="TK.dragStartField(event)" ';
            html += '        ondragover="TK.dragOverField(event)" ';
            html += '        ondrop="TK.dropField(event)" ';
            html += '        ondragend="TK.dragEndField(event)">';
            html += '        <div class="tracker-custom-field-header">';
            html += '            <label>' + field.label + ' <span class="tracker-drag-handle">⋮⋮</span></label>';
            html += '            <button class="tracker-field-delete" onclick="TK.removeField(\'' + tabData.id + '\', ' + index + ')">✕</button>';
            html += '        </div>';

            var fieldValue = getCustomFieldValue(field);
            if (field.type === 'text') {
                html += '        <input type="text" class="tracker-field-input" data-tab-id="' + tabData.id + '" data-field-index="' + index + '" value="' + (fieldValue || '') + '" onchange="TK.updateField(this)" />';
            } else if (field.type === 'number') {
                var maxAttr = field.maxValue ? ' max="' + field.maxValue + '"' : '';
                html += '        <input type="number" class="tracker-field-input" data-tab-id="' + tabData.id + '" data-field-index="' + index + '" value="' + (fieldValue || '') + '"' + maxAttr + ' onchange="TK.updateField(this)" />';
                if (field.maxValue) {
                    html += '        <div class="tracker-field-info">Max: ' + field.maxValue + '</div>';
                }
            } else if (field.type === 'dropdown') {
                html += '        <select class="tracker-field-input" data-tab-id="' + tabData.id + '" data-field-index="' + index + '" onchange="TK.updateField(this)">';
                if (field.options && Array.isArray(field.options) && field.options.length > 0) {
                    field.options.forEach(function(opt) {
                        var selected = opt === fieldValue ? ' selected' : '';
                        html += '            <option value="' + opt + '"' + selected + '>' + opt + '</option>';
                    });
                } else {
                    html += '            <option value="">-- No options configured --</option>';
                }
                html += '        </select>';
                html += '        <button class="tracker-field-config" onclick="TK.openConfigureDropdown(\'' + tabData.id + '\', ' + index + ', \'' + field.label + '\')">⚙ Configure</button>';
            } else if (field.type === 'checkbox') {
                var isChecked = fieldValue === true;
                html += '        <button class="tracker-field-checkbox-btn' + (isChecked ? ' checked' : '') + '"';
                html += '                onclick="TK.toggleCheckbox(\'' + tabData.id + '\', ' + index + ')">';
                html += '            <span class="tracker-field-cb-icon">' + (isChecked ? '✓' : '') + '</span>';
                html += '            <span class="tracker-field-cb-label">' + (isChecked ? 'Done' : 'Not done') + '</span>';
                html += '        </button>';
            } else if (field.type === 'checklist') {
                html += '        <div class="tracker-field-checklist">';
                if (field.options && field.options.length > 0) {
                    field.options.forEach(function(opt) {
                        var checked = fieldValue && typeof fieldValue === 'object' && fieldValue[opt];
                        html += '            <div class="tracker-field-checklist-item' + (checked ? ' checked' : '') + '"';
                        html += '                data-tab-id="' + tabData.id + '"';
                        html += '                data-field-index="' + index + '"';
                        html += '                data-option-key="' + opt.replace(/"/g, '&quot;') + '"';
                        html += '                onclick="TK.toggleChecklistItem(this)">';
                        html += '                <span class="tracker-field-cli-check">' + (checked ? '✓' : '') + '</span>';
                        html += '                <span class="tracker-field-cli-label">' + opt + '</span>';
                        html += '            </div>';
                    });
                } else {
                    html += '            <p class="tracker-field-info">No items yet. Click Configure to add.</p>';
                }
                html += '        </div>';
                html += '        <button class="tracker-field-config" onclick="TK.openConfigureDropdown(\'' + tabData.id + '\', ' + index + ', \'' + field.label + '\')">⚙ Configure</button>';
            } else if (field.type === 'note') {
                var noteVal = (fieldValue || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += '        <textarea class="tracker-field-textarea"';
                html += '                data-tab-id="' + tabData.id + '"';
                html += '                data-field-index="' + index + '"';
                html += '                onchange="TK.updateField(this)">' + noteVal + '</textarea>';
            }

            html += '    </div>';
        });
    }

    html += '</div>';

    container.innerHTML = html;
}

function activateTab(tabId) {
    if (tabs.indexOf(tabId) === -1) return;
    activeTab = tabId;
    saveTrackerState();
    renderActiveTabContent();
    var tabButtons = document.querySelectorAll('.tracker-tab');
    tabButtons.forEach(function(btn) { btn.classList.remove('tracker-tab-active'); });
    var activeBtn = document.querySelector('.tracker-tab[data-tab-id="' + tabId + '"]');
    if (activeBtn) activeBtn.classList.add('tracker-tab-active');
}

// Helper to update input value on buttons
function updateInputValue(instanceId, newValue) {
    var input = document.getElementById('runs-' + instanceId);
    if (input) input.value = newValue;
}
