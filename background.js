chrome.runtime.onInstalled.addListener(() => {
    createContextMenu();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateContextMenu") {
        createContextMenu();
    }
    sendResponse({status: "ContextMenu updated"});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId.startsWith('template_')) {
        const templateId = info.menuItemId.split('_')[1];
        chrome.storage.local.get(['templates'], function(result) {
            const template = result.templates ? result.templates[templateId] : null;
            if (template && tab && tab.id && tab.url && !tab.url.startsWith('chrome://')) {
                chrome.scripting.executeScript({
                    target: {tabId: tab.id, allFrames: true},
                    function: insertTemplate,
                    args: [template]
                });
            }
        });
    } else if (info.menuItemId === 'manageTemplates') {
        chrome.tabs.create({url: chrome.runtime.getURL("manage_templates.html")});
    }
});

function createContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'manageClipboard',
            title: 'Managed Clipboard',
            contexts: ['all']
        }, () => {
            chrome.contextMenus.create({
                id: 'manageTemplates',
                title: '[ Manage Templates ]',
                parentId: 'manageClipboard',
                contexts: ['all']
            }, () => {
                updateTemplatesContextMenu();
            });
        });
    });
}

function updateTemplatesContextMenu() {
    chrome.storage.local.get(['templates', 'groups'], function(result) {
        const templates = result.templates || [];
        const groups = result.groups || [];
        const items = [];

        groups.forEach((group) => {
            const hasItems = templates.some(t => t.groupId === group.id);
            if (!hasItems) {
                return;
            }
            items.push({
                id: 'group_' + group.id,
                title: group.name,
                parentId: 'manageClipboard',
                contexts: ['all']
            });
        });

        templates.forEach((template, index) => {
            const grouped = template.groupId && groups.some(g => g.id === template.groupId);
            items.push({
                id: 'template_' + index,
                title: template.name,
                parentId: grouped ? 'group_' + template.groupId : 'manageClipboard',
                contexts: ['all']
            });
        });

        createMenuItems(items, 0);
    });
}

function createMenuItems(items, index) {
    if (index >= items.length) {
        return;
    }
    chrome.contextMenus.create(items[index], () => {
        createMenuItems(items, index + 1);
    });
}

function insertTemplate(template) {
    var activeElement = document.activeElement;
    if (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT" || activeElement.isContentEditable) {
        if (activeElement.isContentEditable) {
            document.execCommand('insertHTML', false, template.content);
        } else {
            try {
                var start = activeElement.selectionStart;
                var end = activeElement.selectionEnd;
                var value = activeElement.value;
                activeElement.value = value.slice(0, start) + template.content + value.slice(end);
                var pos = start + template.content.length;
                activeElement.selectionStart = pos;
                activeElement.selectionEnd = pos;
            } catch (e) {
                activeElement.value += template.content;
            }
        }
    } else {
        var range = document.createRange();
        var sel = document.getSelection();
        range.setStart(activeElement, activeElement.childNodes.length);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        activeElement.appendChild(document.createTextNode(template.content));
    }
}
