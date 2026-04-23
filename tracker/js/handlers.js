'use strict';

// Modal state
var modalState = {
    action: null,
    charId: null,
    tabId: null,
    currentValue: '',
    selectOptions: [],
    fieldType: null,
    fieldLabel: null,
    fieldMaxValue: null,
    fieldOptions: [],
    modalType: 'input' // 'input', 'confirm', 'alert'
};

// Drag and drop state
var dragState = {
    draggedElement: null,
    draggedOverElement: null,
    dragType: null // 'char' or 'field'
};

function showModal(title, placeholder, currentValue, action, charId, tabId, modalType, selectOptions) {
    modalType = modalType || 'input';
    selectOptions = selectOptions || [];
    
    var bodyEl = document.getElementById('tracker-modal-body');
    var footerEl = document.getElementById('tracker-modal-footer');
    var cancelBtn = document.querySelector('.tracker-modal-btn-cancel');
    var confirmBtn = document.querySelector('.tracker-modal-btn-confirm');
    
    document.getElementById('tracker-modal-title').textContent = title;
    
    // Clear body and set up based on modal type
    bodyEl.innerHTML = '';
    
    if (modalType === 'alert') {
        // Alert modal - just text
        var msg = document.createElement('p');
        msg.style.margin = '0';
        msg.textContent = currentValue;
        bodyEl.appendChild(msg);
        cancelBtn.style.display = 'none';
        confirmBtn.textContent = 'OK';
    } else if (modalType === 'add-character') {
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'tracker-modal-input';
        nameInput.id = 'tracker-modal-input';
        nameInput.placeholder = placeholder || '';
        nameInput.value = currentValue || '';
        bodyEl.appendChild(nameInput);

        var classRow = document.createElement('div');
        classRow.className = 'tracker-modal-class-row';

        var classLabel = document.createElement('label');
        classLabel.className = 'tracker-modal-class-label';
        classLabel.textContent = 'Class';
        classRow.appendChild(classLabel);

        var classPicker = document.createElement('div');
        classPicker.className = 'tracker-modal-class-picker';
        classPicker.id = 'tracker-modal-class-picker';

        selectOptions.forEach(function(opt) {
            var classData = getTrackerClassData(opt.value);
            var optionEl = document.createElement('span');
            optionEl.className = 'tracker-modal-class-option';
            optionEl.setAttribute('data-class-key', opt.value);
            optionEl.setAttribute('title', classData.name);
            optionEl.onclick = function(e) {
                TK.selectModalCharacterClass(e, opt.value);
            };

            var iconEl = document.createElement('img');
            iconEl.className = 'tracker-modal-class-option-icon';
            iconEl.src = classData.icon;
            iconEl.alt = classData.name;
            optionEl.appendChild(iconEl);

            classPicker.appendChild(optionEl);
        });

        classRow.appendChild(classPicker);

        var classValueInput = document.createElement('input');
        classValueInput.type = 'hidden';
        classValueInput.id = 'tracker-modal-class-value';
        classValueInput.value = '';
        classRow.appendChild(classValueInput);

        var classHint = document.createElement('div');
        classHint.className = 'tracker-modal-class-hint';
        classHint.textContent = 'Default - Gladiator';
        classRow.appendChild(classHint);

        bodyEl.appendChild(classRow);

        requestAnimationFrame(function() {
            nameInput.focus();
            nameInput.onkeypress = function(e) {
                if (e.key === 'Enter') processModalConfirm();
            };
        });

        cancelBtn.style.display = '';
        confirmBtn.textContent = 'Confirm';
    } else if (modalType === 'add-field') {
        var initialType = currentValue || 'text';
        var typeRow = document.createElement('div');
        typeRow.className = 'tracker-field-type-row';
        var typeLbl = document.createElement('label');
        typeLbl.className = 'tracker-modal-field-label';
        typeLbl.textContent = 'Type';
        typeRow.appendChild(typeLbl);
        var typeBtns = document.createElement('div');
        typeBtns.className = 'tracker-field-type-btns';
        ['text', 'number', 'dropdown', 'checkbox', 'checklist', 'note'].forEach(function(t) {
            var btn = document.createElement('button');
            btn.className = 'tracker-field-type-btn' + (t === initialType ? ' active' : '');
            btn.setAttribute('data-type', t);
            btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
            btn.type = 'button';
            btn.onclick = function() { TK.selectFieldType(t); };
            typeBtns.appendChild(btn);
        });
        typeRow.appendChild(typeBtns);
        var typeHidden = document.createElement('input');
        typeHidden.type = 'hidden';
        typeHidden.id = 'tracker-field-type-value';
        typeHidden.value = initialType;
        typeRow.appendChild(typeHidden);
        bodyEl.appendChild(typeRow);

        var fieldLabelRow = document.createElement('div');
        fieldLabelRow.className = 'tracker-field-label-row';
        var fieldLabelLbl = document.createElement('label');
        fieldLabelLbl.className = 'tracker-modal-field-label';
        fieldLabelLbl.textContent = 'Label';
        fieldLabelRow.appendChild(fieldLabelLbl);
        var labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.className = 'tracker-modal-input';
        labelInput.id = 'tracker-modal-input';
        labelInput.placeholder = placeholder || 'e.g. Character Level';
        fieldLabelRow.appendChild(labelInput);
        bodyEl.appendChild(fieldLabelRow);

        var numRow = document.createElement('div');
        numRow.className = 'tracker-field-extra-row';
        numRow.id = 'tracker-field-extra-number';
        numRow.style.display = initialType === 'number' ? '' : 'none';
        var numLbl = document.createElement('label');
        numLbl.className = 'tracker-modal-field-label';
        numLbl.textContent = 'Max Value';
        numRow.appendChild(numLbl);
        var maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.className = 'tracker-modal-input';
        maxInput.id = 'tracker-field-max-value';
        maxInput.value = '100';
        maxInput.min = '1';
        maxInput.placeholder = '100';
        numRow.appendChild(maxInput);
        bodyEl.appendChild(numRow);

        var dropRow = document.createElement('div');
        dropRow.className = 'tracker-field-extra-row';
        dropRow.id = 'tracker-field-extra-dropdown';
        dropRow.style.display = initialType === 'dropdown' ? '' : 'none';
        var dropLbl = document.createElement('label');
        dropLbl.className = 'tracker-modal-field-label';
        dropLbl.textContent = 'Options';
        dropRow.appendChild(dropLbl);
        var optList = document.createElement('div');
        optList.id = 'tracker-field-options-list';
        optList.className = 'tracker-field-options-list';
        dropRow.appendChild(optList);
        var addOptBtn = document.createElement('button');
        addOptBtn.type = 'button';
        addOptBtn.className = 'tracker-field-add-option-btn';
        addOptBtn.textContent = '+ Add Option';
        addOptBtn.onclick = function() { TK.addDropdownOptionRow(); };
        dropRow.appendChild(addOptBtn);
        bodyEl.appendChild(dropRow);

        requestAnimationFrame(function() { labelInput.focus(); });
        cancelBtn.style.display = '';
        confirmBtn.textContent = 'Add Field';
    } else if (modalType === 'configure-dropdown') {
        var cfgLbl = document.createElement('label');
        cfgLbl.className = 'tracker-modal-field-label';
        cfgLbl.textContent = 'Options';
        bodyEl.appendChild(cfgLbl);
        var cfgOptList = document.createElement('div');
        cfgOptList.id = 'tracker-field-options-list';
        cfgOptList.className = 'tracker-field-options-list';
        bodyEl.appendChild(cfgOptList);
        var cfgAddBtn = document.createElement('button');
        cfgAddBtn.type = 'button';
        cfgAddBtn.className = 'tracker-field-add-option-btn';
        cfgAddBtn.textContent = '+ Add Option';
        cfgAddBtn.onclick = function() { TK.addDropdownOptionRow(); };
        bodyEl.appendChild(cfgAddBtn);
        selectOptions.forEach(function(opt) { TK.addDropdownOptionRow(opt); });
        cancelBtn.style.display = '';
        confirmBtn.textContent = 'Save';
    } else if (modalType === 'select') {
        var selectEl = document.createElement('select');
        selectEl.className = 'tracker-modal-input';
        selectEl.id = 'tracker-modal-select';

        selectOptions.forEach(function(opt) {
            var optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.label;
            if (opt.value === currentValue) optionEl.selected = true;
            selectEl.appendChild(optionEl);
        });

        bodyEl.appendChild(selectEl);

        requestAnimationFrame(function() {
            selectEl.focus();
            selectEl.onkeypress = function(e) {
                if (e.key === 'Enter') processModalConfirm();
            };
        });

        cancelBtn.style.display = '';
        confirmBtn.textContent = 'Confirm';
    } else if (modalType === 'confirm') {
        var msg = document.createElement('p');
        msg.className = 'tracker-modal-confirm-text';
        msg.textContent = currentValue;
        bodyEl.appendChild(msg);
        cancelBtn.style.display = '';
        confirmBtn.textContent = 'Confirm';
    } else {
        // Input modal
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'tracker-modal-input';
        input.id = 'tracker-modal-input';
        input.placeholder = placeholder || '';
        input.value = currentValue || '';
        bodyEl.appendChild(input);
        
        // Allow Enter key to confirm (on next frame to avoid event listener issues)
        requestAnimationFrame(function() {
            input.focus();
            input.onkeypress = function(e) {
                if (e.key === 'Enter') processModalConfirm();
            };
        });
        
        cancelBtn.style.display = '';
        confirmBtn.textContent = 'Confirm';
    }
    
    // Store state
    modalState.action = action;
    modalState.charId = charId;
    modalState.tabId = tabId;
    modalState.currentValue = currentValue;
    modalState.selectOptions = selectOptions;
    modalState.modalType = modalType;
    
    // Show modal (will trigger CSS animation once)
    var overlay = document.getElementById('tracker-modal-overlay');
    var modal = document.getElementById('tracker-modal');
    
    // Prevent scroll on body when modal is open
    document.body.style.overflow = 'hidden';
    
    overlay.classList.add('active');
    modal.classList.add('active');
}

function processModalConfirm() {
    if (modalState.modalType === 'alert') {
        TK.closeModal();
        return;
    }

    if (modalState.modalType === 'add-field') {
        processAddFieldModal();
        return;
    }

    if (modalState.modalType === 'configure-dropdown') {
        processConfigureDropdownModal();
        return;
    }

    if (modalState.modalType === 'confirm') {
        processModalAction('');
        return;
    }

    var value = '';
    if (modalState.modalType === 'select') {
        var selectEl = document.getElementById('tracker-modal-select');
        value = selectEl ? selectEl.value : '';
    } else {
        var input = document.getElementById('tracker-modal-input');
        value = input ? input.value.trim() : '';
    }
    
    if (!value && modalState.action !== 'rename-character') {
        showModalError('Please enter a value');
        return;
    }
    
    // Process based on action
    processModalAction(value);
}

function processAddFieldModal() {
    var typeInput = document.getElementById('tracker-field-type-value');
    var labelEl = document.getElementById('tracker-modal-input');
    var fieldType = typeInput ? typeInput.value : 'text';
    var fieldLabel = labelEl ? labelEl.value.trim() : '';

    if (!fieldLabel) {
        showModalError('Please enter a label');
        return;
    }

    if (fieldType === 'number') {
        var maxEl = document.getElementById('tracker-field-max-value');
        var maxVal = maxEl ? parseInt(maxEl.value) : 100;
        if (isNaN(maxVal) || maxVal < 1) {
            showModalError('Please enter a valid max value');
            return;
        }
        addFieldToTab(modalState.tabId, fieldType, fieldLabel, maxVal, null);
    } else if (fieldType === 'dropdown' || fieldType === 'checklist') {
        var optInputs = document.querySelectorAll('.tracker-field-option-input');
        var options = [];
        for (var i = 0; i < optInputs.length; i++) {
            var v = optInputs[i].value.trim();
            if (v) options.push(v);
        }
        if (options.length === 0) {
            showModalError('Please add at least one option');
            return;
        }
        addFieldToTab(modalState.tabId, fieldType, fieldLabel, null, options);
    } else {
        // text, checkbox, note — no extra config
        addFieldToTab(modalState.tabId, fieldType, fieldLabel);
    }

    renderActiveTabContent();
    TK.closeModal();
}

function processConfigureDropdownModal() {
    var optInputs = document.querySelectorAll('.tracker-field-option-input');
    var options = [];
    for (var i = 0; i < optInputs.length; i++) {
        var v = optInputs[i].value.trim();
        if (v) options.push(v);
    }
    if (options.length === 0) {
        showModalError('Please add at least one option');
        return;
    }
    var parts = modalState.tabId.split('|');
    var tId = parts[0];
    var fIndex = parseInt(parts[1]);
    updateFieldProperties(tId, fIndex, { options: options });
    renderActiveTabContent();
    TK.closeModal();
}

function processModalAction(value) {
    switch (modalState.action) {
        case 'add-character':
            var charId = addCharacter(value);
            if (charId) {
                var classValueInput = document.getElementById('tracker-modal-class-value');
                if (classValueInput && classValueInput.value) {
                    setCharacterClass(charId, classValueInput.value);
                }
                switchCharacter(charId);
                renderActiveTabContent();
                TK.closeModal();
            } else {
                showModalError('Maximum 10 characters allowed');
            }
            break;
        
        case 'rename-character':
            if (value && value !== modalState.currentValue) {
                renameCharacter(modalState.charId, value);
                renderActiveTabContent();
                TK.closeModal();
            } else {
                TK.closeModal();
            }
            break;

        case 'add-tab':
            if (value.trim()) {
                addCustomTab(value.trim());
                renderAll();
                TK.closeModal();
            } else {
                showModalError('Please enter a tab name');
            }
            break;
        
        case 'confirm-remove-tab':
            removeTab(modalState.tabId);
            renderAll();
            TK.closeModal();
            break;
        
        case 'confirm-remove-char':
            removeCharacter(modalState.charId);
            renderActiveTabContent();
            TK.closeModal();
            break;
        
        case 'confirm-remove-field':
            removeField(modalState.tabId, parseInt(modalState.charId));
            renderActiveTabContent();
            TK.closeModal();
            break;
        
        case 'confirm-reset-ducat':
            resetDucatRuns();
            renderActiveTabContent();
            TK.closeModal();
            break;

        case 'confirm-import-data':
            if (TK._pendingImport) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(TK._pendingImport));
                TK._pendingImport = null;
                if (loadTrackerState()) {
                    renderAll();
                    TK.closeModal();
                } else {
                    showModal('Import Failed', '', 'Configuration could not be loaded properly.', null, null, null, 'alert');
                }
            } else {
                TK.closeModal();
            }
            break;
    }
}

function showModalError(message) {
    var input = document.getElementById('tracker-modal-input');
    var container = input ? input.parentNode : document.getElementById('tracker-modal-body');
    if (input) input.style.borderColor = '#ff4444';
    var errorMsg = document.querySelector('.tracker-modal-error') || document.createElement('div');
    errorMsg.className = 'tracker-modal-error';
    errorMsg.textContent = message;
    if (!document.querySelector('.tracker-modal-error')) {
        container.appendChild(errorMsg);
    }
    if (input) input.focus();
}

window.TK = {
    // Show/hide modal
    closeModal: function() {
        var overlay = document.getElementById('tracker-modal-overlay');
        var modal = document.getElementById('tracker-modal');
        var input = document.getElementById('tracker-modal-input');
        
        // Performance: remove classes immediately
        overlay.classList.remove('active');
        modal.classList.remove('active');
        
        // Restore scroll
        document.body.style.overflow = '';
        
        // Clean up
        if (input) input.style.borderColor = '';
        var errorMsg = document.querySelector('.tracker-modal-error');
        if (errorMsg) errorMsg.remove();
        
        // Reset state
        modalState = { 
            action: null, charId: null, tabId: null, currentValue: '', selectOptions: [],
            fieldType: null, fieldLabel: null, fieldMaxValue: null, fieldOptions: [],
            modalType: 'input'
        };
    },

    // Increment runs for an instance
    incrementRuns: function(instanceId) {
        var instance = DUCAT_INSTANCES.find(function(i) { return i.id === instanceId; });
        if (!instance) return;
        var current = getDucatRuns(instanceId);
        var newValue = Math.min(current + 1, instance.maxRuns);
        setDucatRuns(instanceId, newValue);
        updateInputValue(instanceId, newValue);
    },

    // Decrement runs for an instance
    decrementRuns: function(instanceId) {
        var current = getDucatRuns(instanceId);
        var newValue = Math.max(current - 1, 0);
        setDucatRuns(instanceId, newValue);
        updateInputValue(instanceId, newValue);
    },

    // Set runs for an instance
    setRuns: function(instanceId, value) {
        setDucatRuns(instanceId, value);
        var instance = DUCAT_INSTANCES.find(function(i) { return i.id === instanceId; });
        if (instance) {
            var newValue = Math.max(0, Math.min(parseInt(value) || 0, instance.maxRuns));
            updateInputValue(instanceId, newValue);
        }
    },

    // Set total ducats for current character
    setTotalDucats: function(value) {
        setTotalDucats(value);
        var input = document.getElementById('tracker-total-ducats');
        if (input) input.value = getTotalDucats();
        refreshDucatOverview();
    },

    // Increment total ducats
    incrementTotalDucats: function() {
        var current = getTotalDucats();
        var newValue = Math.min(current + 1, 1000);
        setTotalDucats(newValue);
        var input = document.getElementById('tracker-total-ducats');
        if (input) input.value = newValue;
        refreshDucatOverview();
    },

    // Decrement total ducats
    decrementTotalDucats: function() {
        var current = getTotalDucats();
        var newValue = Math.max(current - 1, 0);
        setTotalDucats(newValue);
        var input = document.getElementById('tracker-total-ducats');
        if (input) input.value = newValue;
        refreshDucatOverview();
    },

    // Switch to a character
    switchCharacter: function(charId) {
        switchCharacter(charId);
        renderActiveTabContent();
    },

    // Select class in Add Character modal (second click clears selection)
    selectModalCharacterClass: function(event, classKey) {
        if (event) event.stopPropagation();

        var classValueInput = document.getElementById('tracker-modal-class-value');
        var classPicker = document.getElementById('tracker-modal-class-picker');
        if (!classValueInput || !classPicker) return;

        var isSameSelection = classValueInput.value === classKey;
        classValueInput.value = isSameSelection ? '' : classKey;

        classPicker.querySelectorAll('.tracker-modal-class-option').forEach(function(optionEl) {
            optionEl.classList.remove('tracker-modal-class-option-active');
        });

        if (!isSameSelection) {
            var selectedEl = classPicker.querySelector('[data-class-key="' + classKey + '"]');
            if (selectedEl) selectedEl.classList.add('tracker-modal-class-option-active');
        }
    },

    // Toggle field type in Add Field modal
    selectFieldType: function(type) {
        var hidden = document.getElementById('tracker-field-type-value');
        if (hidden) hidden.value = type;
        var btns = document.querySelectorAll('.tracker-field-type-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].getAttribute('data-type') === type) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }
        var numRow = document.getElementById('tracker-field-extra-number');
        var dropRow = document.getElementById('tracker-field-extra-dropdown');
        if (numRow) numRow.style.display = type === 'number' ? '' : 'none';
        if (dropRow) dropRow.style.display = (type === 'dropdown' || type === 'checklist') ? '' : 'none';
        if (type === 'dropdown' || type === 'checklist') {
            var list = document.getElementById('tracker-field-options-list');
            if (list && list.children.length === 0) {
                TK.addDropdownOptionRow();
            }
        }
    },

    // Add a row to the dropdown options builder
    addDropdownOptionRow: function(value) {
        var list = document.getElementById('tracker-field-options-list');
        if (!list) return;
        var row = document.createElement('div');
        row.className = 'tracker-field-option-row';
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'tracker-modal-input tracker-field-option-input';
        input.placeholder = 'Option ' + (list.children.length + 1);
        input.value = value || '';
        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'tracker-field-remove-option-btn';
        removeBtn.textContent = '\u00d7';
        removeBtn.onclick = function() { TK.removeDropdownOptionRow(removeBtn); };
        row.appendChild(input);
        row.appendChild(removeBtn);
        list.appendChild(row);
        input.focus();
    },

    // Remove a row from the dropdown options builder
    removeDropdownOptionRow: function(btn) {
        var row = btn.parentNode;
        if (row) row.parentNode.removeChild(row);
    },

    // Toggle a checkbox field on/off
    toggleCheckbox: function(tabId, fieldIndex) {
        toggleCheckboxField(tabId, fieldIndex);
        renderActiveTabContent();
    },

    // Toggle one checklist item
    toggleChecklistItem: function(el) {
        var tabId = el.getAttribute('data-tab-id');
        var fieldIndex = parseInt(el.getAttribute('data-field-index'));
        var optKey = el.getAttribute('data-option-key');
        toggleChecklistItem(tabId, fieldIndex, optKey);
        renderActiveTabContent();
    },

    // Add a new character
    openAddCharDialog: function() {
        var classOptions = getCharacterClassKeys().map(function(classKey) {
            var classData = getTrackerClassData(classKey);
            return { value: classKey, label: classData.name };
        });

        showModal(
            'Add Character',
            'Character ' + (getAllCharacters().length + 1),
            '',
            'add-character',
            null,
            null,
            'add-character',
            classOptions
        );
    },

    // Remove a character
    removeCharacter: function(charId) {
        var char = trackerState.characters.byId[charId];
        if (!char) return;
        modalState.charId = charId;
        showModal(
            'Remove Character?',
            '',
            'Remove character "' + char.name + '"? This cannot be undone.',
            'confirm-remove-char',
            charId,
            null,
            'confirm'
        );
    },

    // Rename a character (double-click handler)
    openRenameCharDialog: function(charId) {
        var char = trackerState.characters.byId[charId];
        if (!char) return;
        
        showModal(
            'Rename Character',
            'New character name',
            char.name,
            'rename-character',
            charId,
            null,
            'input'
        );
    },

    // Toggle inline class menu for a character tab
    toggleClassMenu: function(event, charId) {
        var menu = document.getElementById('tracker-class-menu-' + charId);
        if (!menu) return;

        var shouldOpen = !menu.classList.contains('tracker-char-class-menu-active');
        TK.closeClassMenus();
        if (shouldOpen) {
            menu.classList.add('tracker-char-class-menu-active');
        }
    },

    // Close all inline class menus
    closeClassMenus: function() {
        document.querySelectorAll('.tracker-char-class-menu-active').forEach(function(menu) {
            menu.classList.remove('tracker-char-class-menu-active');
        });
    },

    // Set class from inline icon menu
    selectCharacterClass: function(charId, classKey) {
        if (!setCharacterClass(charId, classKey)) return;
        renderActiveTabContent();
        TK.closeClassMenus();
    },

    // Update custom field value and save to localStorage
    updateField: function(inputElement) {
        var tabId = inputElement.getAttribute('data-tab-id');
        var fieldIndex = parseInt(inputElement.getAttribute('data-field-index'));
        var value = inputElement.value;
        
        updateCustomField(tabId, fieldIndex, value);
    },

    // Remove a field from custom tab
    removeField: function(tabId, fieldIndex) {
        modalState.tabId = tabId;
        modalState.charId = fieldIndex;
        showModal(
            'Remove Field?',
            '',
            'Remove this field? This cannot be undone.',
            'confirm-remove-field',
            fieldIndex,
            tabId,
            'confirm'
        );
    },

    // Open dialog to add a new field to custom tab
    openAddFieldDialog: function(tabId) {
        showModal(
            'Add Field',
            'e.g. Character Level',
            'text',
            'add-field',
            null,
            tabId,
            'add-field'
        );
    },

    // Open dropdown configuration dialog
    openConfigureDropdown: function(tabId, fieldIndex, fieldLabel) {
        var tab = trackerState[tabId];
        if (!tab || fieldIndex >= tab.fields.length) return;
        var field = tab.fields[fieldIndex];
        showModal(
            'Options: ' + fieldLabel,
            '',
            '',
            'configure-dropdown',
            null,
            tabId + '|' + fieldIndex,
            'configure-dropdown',
            field.options || []
        );
    },

    // Add a new tab
    openAddTabDialog: function() {
        showModal(
            'Add New Tab',
            'Enter tab name',
            '',
            'add-tab',
            null,
            null,
            'input'
        );
    },

    // Remove a tab
    removeTab: function(tabId) {
        var tab = trackerState[tabId];
        if (!tab) return;
        modalState.tabId = tabId;
        showModal(
            'Remove Tab?',
            '',
            'Remove tab "' + tab.name + '"? This cannot be undone.',
            'confirm-remove-tab',
            null,
            tabId,
            'confirm'
        );
    },

    // === CHARACTER DRAG AND DROP ===
    dragStartChar: function(event) {
        dragState.draggedElement = event.target.closest('.tracker-char-tab');
        dragState.dragType = 'char';
        dragState.draggedElement.style.opacity = '0.5';
        event.dataTransfer.effectAllowed = 'move';
    },

    dragOverChar: function(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        var el = event.target.closest('.tracker-char-tab');
        if (el && el !== dragState.draggedElement) {
            dragState.draggedOverElement = el;
            el.style.borderLeft = '3px solid rgba(150, 200, 255, 0.8)';
        }
    },

    dropChar: function(event) {
        event.preventDefault();
        if (dragState.draggedElement && dragState.draggedOverElement && dragState.draggedElement !== dragState.draggedOverElement) {
            var fromIndex = parseInt(dragState.draggedElement.getAttribute('data-char-index'));
            var toIndex = parseInt(dragState.draggedOverElement.getAttribute('data-char-index'));
            reorderCharacters(fromIndex, toIndex);
            renderActiveTabContent();
        }
    },

    dragEndChar: function(event) {
        dragState.draggedElement.style.opacity = '1';
        if (dragState.draggedOverElement) {
            dragState.draggedOverElement.style.borderLeft = '';
        }
        dragState.draggedElement = null;
        dragState.draggedOverElement = null;
    },

    // === FIELD DRAG AND DROP ===
    dragStartField: function(event) {
        dragState.draggedElement = event.target.closest('.tracker-custom-field');
        dragState.dragType = 'field';
        dragState.draggedElement.style.opacity = '0.5';
        event.dataTransfer.effectAllowed = 'move';
    },

    dragOverField: function(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        var el = event.target.closest('.tracker-custom-field');
        if (el && el !== dragState.draggedElement) {
            dragState.draggedOverElement = el;
            el.style.borderTop = '2px solid rgba(150, 200, 255, 0.8)';
        }
    },

    dropField: function(event) {
        event.preventDefault();
        if (dragState.draggedElement && dragState.draggedOverElement && dragState.draggedElement !== dragState.draggedOverElement) {
            var tabId = dragState.draggedElement.getAttribute('data-tab-id');
            var fromIndex = parseInt(dragState.draggedElement.getAttribute('data-field-index'));
            var toIndex = parseInt(dragState.draggedOverElement.getAttribute('data-field-index'));
            reorderFields(tabId, fromIndex, toIndex);
            renderActiveTabContent();
        }
    },

    dragEndField: function(event) {
        dragState.draggedElement.style.opacity = '1';
        if (dragState.draggedOverElement) {
            dragState.draggedOverElement.style.borderTop = '';
        }
        dragState.draggedElement = null;
        dragState.draggedOverElement = null;
    },

    // Reset all instance runs for ALL characters (maintenance reset)
    resetAllRuns: function() {
        resetAllCharacterRuns();
        renderActiveTabContent();
    },

    // Reset total ducats for the active character
    resetTotalDucats: function() {
        setTotalDucats(0);
        var totalInput = document.getElementById('tracker-total-ducats');
        if (totalInput) totalInput.value = 0;
        refreshDucatOverview();
    },

    // Export full tracker configuration to a JSON file
    exportData: function() {
        var data = {
            tabs: tabs,
            activeTab: activeTab,
            tabData: trackerState,
            nextTabId: nextTabId
        };
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'aion-tracker-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Import tracker configuration from a JSON file
    importData: function() {
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    var data = JSON.parse(evt.target.result);
                    if (!data || !Array.isArray(data.tabs)) {
                        showModal('Import Failed', '', 'Invalid configuration file.', null, null, null, 'alert');
                        return;
                    }
                    TK._pendingImport = data;
                    showModal(
                        'Import Configuration?',
                        '',
                        'This will overwrite your current data. Continue?',
                        'confirm-import-data',
                        null, null, 'confirm'
                    );
                } catch (err) {
                    showModal('Import Failed', '', 'Could not read the file. Make sure it is a valid JSON configuration.', null, null, null, 'alert');
                }
            };
            reader.readAsText(file);
        };
        fileInput.click();
    },

    selectSubcategory: function(tabId, subcategoryId) {
        setTabSubcategory(tabId, subcategoryId);
        renderActiveTabContent();
    },

    clearSubcategory: function(tabId) {
        setTabSubcategory(tabId, '');
        renderActiveTabContent();
    },

    getSubcategoryLabel: function(tabId, subcategoryId) {
        var labels = {
            instances: {
                'group-hard-normal': 'Group Instances (hard - normal)',
                'group-easy-normal': 'Group Instances (easy + normal)',
                solo: 'Solo Instances'
            },
            apsharanta: {
                heavenly: 'Heavenly',
                sundew: 'Sundew',
                nightshade: 'Nightshade',
                ancient: 'Ancient'
            }
        };
        if (!labels[tabId] || !labels[tabId][subcategoryId]) return subcategoryId;
        return labels[tabId][subcategoryId];
    }
};

document.addEventListener('click', function(event) {
    if (!event.target.closest('.tracker-char-class-menu') && !event.target.closest('.tracker-char-class-btn')) {
        TK.closeClassMenus();
    }
});
