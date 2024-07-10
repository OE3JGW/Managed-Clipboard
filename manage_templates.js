document.addEventListener('DOMContentLoaded', () => {
    loadTemplates();

    document.getElementById('saveHtmlTemplateBtn').addEventListener('click', () => {
        saveTemplateFromClipboard('html');
    });

    document.getElementById('savePlainTextTemplateBtn').addEventListener('click', () => {
        saveTemplateFromClipboard('plain');
    });

    document.getElementById('importTemplateBtn').addEventListener('click', () => {
        importTemplates();
    });

    document.getElementById('exportTemplateBtn').addEventListener('click', () => {
        exportTemplates();
    });
});

function loadTemplates() {
    chrome.storage.local.get(['templates'], function(result) {
        const templates = result.templates || [];
        const templatesDiv = document.getElementById('templates');
        templatesDiv.innerHTML = '';

        templates.forEach((template, index) => {
            const templateDiv = document.createElement('div');
            templateDiv.className = 'template';
            templateDiv.innerHTML = `
                <div class="template-header">
                    <strong>${template.name}</strong>
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
            templatesDiv.appendChild(templateDiv);
        });

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

function saveTemplateFromClipboard(type) {
    navigator.clipboard.read().then(clipboardItems => {
        for (let clipboardItem of clipboardItems) {
            if (type === 'html' && clipboardItem.types.includes('text/html')) {
                clipboardItem.getType('text/html').then(blob => {
                    blob.text().then(htmlText => {
                        let templateName = prompt("Enter a name for the template:");
                        if (templateName) {
                            chrome.storage.local.get(['templates'], function(result) {
                                let templates = result.templates || [];
                                templates.push({name: templateName, content: htmlText, type: 'html'});
                                chrome.storage.local.set({templates: templates}, function() {
                                    chrome.runtime.sendMessage({action: "updateContextMenu"});
                                    loadTemplates();
                                });
                            });
                        }
                    });
                });
            } else if (type === 'plain' && clipboardItem.types.includes('text/plain')) {
                clipboardItem.getType('text/plain').then(blob => {
                    blob.text().then(plainText => {
                        let templateName = prompt("Enter a name for the template:");
                        if (templateName) {
                            chrome.storage.local.get(['templates'], function(result) {
                                let templates = result.templates || [];
                                templates.push({name: templateName, content: plainText, type: 'plain'});
                                chrome.storage.local.set({templates: templates}, function() {
                                    chrome.runtime.sendMessage({action: "updateContextMenu"});
                                    loadTemplates();
                                });
                            });
                        }
                    });
                });
            }
        }
    }).catch(err => {
        console.error('Failed to read clipboard contents:', err);
    });
}

function importTemplates() {
    const fileInput = document.getElementById('importFileInput');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const templates = JSON.parse(e.target.result);
                chrome.storage.local.get(['templates'], function(result) {
                    let currentTemplates = result.templates || [];
                    currentTemplates = currentTemplates.concat(templates);
                    chrome.storage.local.set({templates: currentTemplates}, function() {
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
    chrome.storage.local.get(['templates'], function(result) {
        const templates = result.templates || [];
        const blob = new Blob([JSON.stringify(templates, null, 2)], {type: 'application/json'});
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
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
