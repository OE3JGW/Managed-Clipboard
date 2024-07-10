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
            if (template && !tab.url.startsWith('chrome://')) {
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
        });

        chrome.contextMenus.create({
            id: 'manageTemplates',
            title: '[ Manage Templates ]',
            parentId: 'manageClipboard',
            contexts: ['all']
        });

        updateTemplatesContextMenu();
    });
}

function updateTemplatesContextMenu() {
    chrome.storage.local.get(['templates'], function(result) {
        const templates = result.templates || [];
        templates.forEach((template, index) => {
            chrome.contextMenus.create({
                id: `template_${index}`,
                title: template.name,
                parentId: 'manageClipboard',
                contexts: ['all']
            });
        });
    });
}

function insertTemplate(template) {
    var activeElement = document.activeElement;
    console.log('Active Element:', activeElement); // Debugging
    if (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT" || activeElement.isContentEditable) {
        if (activeElement.isContentEditable) {
            // Handle contenteditable elements
            document.execCommand('insertHTML', false, template.content);
        } else {
            // If it's a textarea or input, insert as plain text
            activeElement.value += template.content;
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
