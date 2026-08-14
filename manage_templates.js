document.addEventListener('DOMContentLoaded', () => {
    loadTemplates();

    document.getElementById('saveHtmlTemplateBtn').addEventListener('click', () => {
        saveTemplateFromClipboard('html');
    });

    document.getElementById('savePlainTextTemplateBtn').addEventListener('click', () => {
        saveTemplateFromClipboard('plain');
    });

    document.getElementById('addHeadingBtn').addEventListener('click', () => {
        addHeading();
    });

    document.getElementById('importTemplateBtn').addEventListener('click', () => {
        importTemplates();
    });

    document.getElementById('exportTemplateBtn').addEventListener('click', () => {
        exportTemplates();
    });

    setupDragAndDrop();
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
    });
});

function newGroupId() {
    return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadTemplates() {
    chrome.storage.local.get(['templates', 'groups'], function(result) {
        const templates = result.templates || [];
        const groups = result.groups || [];
        const templatesDiv = document.getElementById('templates');
        templatesDiv.innerHTML = '';

        groups.forEach((group) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group';
            groupDiv.setAttribute('data-id', group.id);
            groupDiv.innerHTML = `
                <div class="group-header">
                    <span class="drag-handle"></span>
                    <strong>${escapeHtml(group.name)}</strong>
                    <button class="edit-group-btn" data-id="${escapeHtml(group.id)}">&#9998;</button>
                    <button class="delete-group-btn" data-id="${escapeHtml(group.id)}">&times;</button>
                </div>
                <div class="group-items"></div>
            `;
            const itemsDiv = groupDiv.querySelector('.group-items');
            templates.forEach((template, index) => {
                if (template.groupId === group.id) {
                    itemsDiv.appendChild(buildTemplateCard(template, index));
                }
            });
            templatesDiv.appendChild(groupDiv);
        });

        const ungrouped = document.createElement('div');
        ungrouped.id = 'ungrouped';
        ungrouped.className = 'ungrouped';
        templates.forEach((template, index) => {
            const grouped = template.groupId && groups.some(g => g.id === template.groupId);
            if (!grouped) {
                ungrouped.appendChild(buildTemplateCard(template, index));
            }
        });
        templatesDiv.appendChild(ungrouped);

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                deleteTemplate(this.getAttribute('data-index'));
            });
        });

        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                editTemplateName(this.getAttribute('data-index'));
            });
        });

        document.querySelectorAll('.delete-group-btn').forEach(button => {
            button.addEventListener('click', function() {
                deleteHeading(this.getAttribute('data-id'));
            });
        });

        document.querySelectorAll('.edit-group-btn').forEach(button => {
            button.addEventListener('click', function() {
                editHeading(this.getAttribute('data-id'));
            });
        });
    });
}

function buildTemplateCard(template, index) {
    const templateDiv = document.createElement('div');
    templateDiv.className = 'template';
    templateDiv.setAttribute('data-index', index);

    templateDiv.innerHTML = `
        <div class="template-header">
            <span class="drag-handle"></span>
            <strong>${escapeHtml(template.name)}</strong>
            <span class="marker ${template.type}">${template.type}</span>
            <button class="edit-btn" data-index="${index}">&#9998;</button>
            <button class="delete-btn" data-index="${index}">&times;</button>
        </div>
        <div class="template-content"></div>
    `;
    templateDiv.querySelector('.template-header').addEventListener('click', function() {
        const contentDiv = templateDiv.querySelector('.template-content');
        if (contentDiv.style.display === 'none' || contentDiv.style.display === '') {
            contentDiv.style.display = 'block';
            if (template.type === 'html') {
                const testDiv = document.createElement('div');
                testDiv.innerHTML = template.content;
                if (testDiv.innerHTML.trim() === template.content.trim()) {
                    contentDiv.innerHTML = template.content;
                } else {
                    contentDiv.innerHTML = `<small>Kann nicht gerendert werden</small><br><pre>${escapeHtml(template.content)}</pre>`;
                }
            } else {
                contentDiv.textContent = template.content;
            }
        } else {
            contentDiv.style.display = 'none';
        }
    });
    return templateDiv;
}

function setupDragAndDrop() {
    const root = document.getElementById('templates');
    let dragEl = null;
    let dragKind = null;
    let moved = false;

    root.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) {
            return;
        }
        const handle = e.target.closest('.drag-handle');
        if (!handle) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
        }
        dragEl = handle.closest('.template') || handle.closest('.group');
        if (!dragEl) {
            return;
        }
        dragKind = dragEl.classList.contains('group') ? 'group' : 'template';
        moved = false;
        dragEl.classList.add('dragging');
    });

    document.addEventListener('pointermove', function(e) {
        if (!dragEl) {
            return;
        }
        e.preventDefault();
        const over = document.elementFromPoint(e.clientX, e.clientY);
        if (!over || !root.contains(over)) {
            return;
        }
        const y = e.clientY;
        if (dragKind === 'group') {
            const overGroup = over.closest('.group');
            if (overGroup && overGroup !== dragEl) {
                const box = overGroup.getBoundingClientRect();
                if (y < box.top + box.height / 2) {
                    root.insertBefore(dragEl, overGroup);
                } else {
                    root.insertBefore(dragEl, overGroup.nextSibling);
                }
                moved = true;
            }
        } else {
            const overTemplate = over.closest('.template');
            const overGroup = over.closest('.group');
            const overUngrouped = over.closest('#ungrouped');
            if (overTemplate && overTemplate !== dragEl) {
                const parent = overTemplate.parentNode;
                const box = overTemplate.getBoundingClientRect();
                if (y < box.top + box.height / 2) {
                    parent.insertBefore(dragEl, overTemplate);
                } else {
                    parent.insertBefore(dragEl, overTemplate.nextSibling);
                }
                moved = true;
            } else if (overUngrouped) {
                if (dragEl.parentNode !== overUngrouped) {
                    overUngrouped.appendChild(dragEl);
                    moved = true;
                }
            } else if (overGroup) {
                const items = overGroup.querySelector('.group-items');
                if (items && dragEl.parentNode !== items) {
                    items.appendChild(dragEl);
                    moved = true;
                }
            }
        }
    });

    document.addEventListener('pointerup', function() {
        if (!dragEl) {
            return;
        }
        dragEl.classList.remove('dragging');
        dragEl = null;
        dragKind = null;
        if (moved) {
            persistOrderFromDom();
        }
        moved = false;
    });
}

function persistOrderFromDom() {
    chrome.storage.local.get(['templates', 'groups'], function(result) {
        const templates = result.templates || [];
        const groups = result.groups || [];
        const used = {};

        const newGroups = [];
        document.querySelectorAll('#templates > .group').forEach(groupEl => {
            const id = groupEl.getAttribute('data-id');
            const g = groups.find(x => x.id === id);
            if (g) {
                newGroups.push(g);
            }
        });

        const newTemplates = [];
        function takeTemplate(tplEl, groupId) {
            const idx = parseInt(tplEl.getAttribute('data-index'), 10);
            if (isNaN(idx) || !templates[idx] || used[idx]) {
                return;
            }
            used[idx] = true;
            const t = templates[idx];
            if (groupId) {
                t.groupId = groupId;
            } else {
                delete t.groupId;
            }
            newTemplates.push(t);
        }

        document.querySelectorAll('#templates > .group').forEach(groupEl => {
            const groupId = groupEl.getAttribute('data-id');
            groupEl.querySelectorAll(':scope > .group-items > .template').forEach(tplEl => {
                takeTemplate(tplEl, groupId);
            });
        });
        document.querySelectorAll('#ungrouped > .template').forEach(tplEl => {
            takeTemplate(tplEl, null);
        });
        templates.forEach((t, i) => {
            if (!used[i]) {
                newTemplates.push(t);
            }
        });

        chrome.storage.local.set({templates: newTemplates, groups: newGroups}, function() {
            loadTemplates();
            chrome.runtime.sendMessage({action: "updateContextMenu"});
        });
    });
}

function addHeading() {
    let name = prompt("Enter a name for the heading:");
    if (!name) {
        return;
    }
    chrome.storage.local.get(['groups'], function(result) {
        let groups = result.groups || [];
        groups.push({id: newGroupId(), name: name});
        chrome.storage.local.set({groups: groups}, function() {
            loadTemplates();
            chrome.runtime.sendMessage({action: "updateContextMenu"});
        });
    });
}

function editHeading(id) {
    chrome.storage.local.get(['groups'], function(result) {
        let groups = result.groups || [];
        const group = groups.find(g => g.id === id);
        if (!group) {
            return;
        }
        let newName = prompt("Enter a new name for the heading:", group.name);
        if (newName) {
            group.name = newName;
            chrome.storage.local.set({groups: groups}, function() {
                loadTemplates();
                chrome.runtime.sendMessage({action: "updateContextMenu"});
            });
        }
    });
}

function deleteHeading(id) {
    chrome.storage.local.get(['templates', 'groups'], function(result) {
        let templates = result.templates || [];
        let groups = (result.groups || []).filter(g => g.id !== id);
        templates.forEach(t => {
            if (t.groupId === id) {
                delete t.groupId;
            }
        });
        chrome.storage.local.set({templates: templates, groups: groups}, function() {
            loadTemplates();
            chrome.runtime.sendMessage({action: "updateContextMenu"});
        });
    });
}

function deleteTemplate(index) {
    chrome.storage.local.get(['templates'], function(result) {
        let templates = result.templates || [];
        templates.splice(index, 1);
        chrome.storage.local.set({templates: templates}, function() {
            loadTemplates();
            chrome.runtime.sendMessage({action: "updateContextMenu"});
        });
    });
}

function editTemplateName(index) {
    chrome.storage.local.get(['templates'], function(result) {
        let templates = result.templates || [];
        let newName = prompt("Enter a new name for the template:", templates[index].name);
        if (newName) {
            templates[index].name = newName;
            chrome.storage.local.set({templates: templates}, function() {
                loadTemplates();
                chrome.runtime.sendMessage({action: "updateContextMenu"});
            });
        }
    });
}

function addTemplate(name, content, type) {
    chrome.storage.local.get(['templates'], function(result) {
        let templates = result.templates || [];
        const item = {name: name, content: content, type: type};
        templates.push(item);
        chrome.storage.local.set({templates: templates}, function() {
            chrome.runtime.sendMessage({action: "updateContextMenu"});
            loadTemplates();
        });
    });
}

function saveTemplateFromClipboard(type) {
    const mime = type === 'html' ? 'text/html' : 'text/plain';
    navigator.clipboard.read().then(clipboardItems => {
        for (let clipboardItem of clipboardItems) {
            if (clipboardItem.types.includes(mime)) {
                clipboardItem.getType(mime).then(blob => {
                    blob.text().then(text => {
                        let templateName = prompt("Enter a name for the template:");
                        if (templateName) {
                            addTemplate(templateName, text, type);
                        }
                    });
                });
                return;
            }
        }
        alert(type === 'html' ? 'Clipboard has no HTML.' : 'Clipboard has no plain text.');
    }).catch(err => {
        console.error('Failed to read clipboard contents:', err);
        alert('Could not read the clipboard.');
    });
}

function importTemplates() {
    const fileInput = document.getElementById('importFileInput');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const parsed = JSON.parse(e.target.result);
                chrome.storage.local.get(['templates', 'groups'], function(result) {
                    let templates = result.templates || [];
                    let groups = result.groups || [];
                    if (Array.isArray(parsed)) {
                        templates = templates.concat(parsed);
                    } else if (parsed && Array.isArray(parsed.templates)) {
                        templates = templates.concat(parsed.templates);
                        if (Array.isArray(parsed.groups)) {
                            parsed.groups.forEach(g => {
                                if (g && g.id && !groups.some(x => x.id === g.id)) {
                                    groups.push({id: g.id, name: g.name || g.id});
                                }
                            });
                        }
                    } else {
                        console.error('Failed to parse templates: unexpected format');
                        return;
                    }
                    chrome.storage.local.set({templates: templates, groups: groups}, function() {
                        loadTemplates();
                        chrome.runtime.sendMessage({action: "updateContextMenu"});
                    });
                });
            } catch (error) {
                console.error('Failed to parse templates:', error);
            }
        };
        reader.readAsText(file);
    }
}

function exportTemplates() {
    chrome.storage.local.get(['templates', 'groups'], function(result) {
        const data = {
            groups: result.groups || [],
            templates: result.templates || []
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'templates.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}

function escapeHtml(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}
