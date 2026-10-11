import { RenderMarkdown, OpenFile, SaveFile, CloseApp, MarkDirty, ConfirmClose, LoadPreferences, SavePreferences, GetInitialFile } from '../wailsjs/go/main/App';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const statusSpan = document.getElementById('status');
const btnOpen = document.getElementById('btn-open');
const btnSave = document.getElementById('btn-save');
const btnSaveAs = document.getElementById('btn-save-as');
const btnClose = document.getElementById('btn-close');
const btnTheme = document.getElementById('btn-theme');
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');
const themeText = document.getElementById('theme-text');

const btnZoomInEd = document.getElementById('btn-zoom-in-ed');
const btnZoomOutEd = document.getElementById('btn-zoom-out-ed');
const btnZoomInPr = document.getElementById('btn-zoom-in-pr');
const btnZoomOutPr = document.getElementById('btn-zoom-out-pr');

let currentFilePath = '';
let isDirty = false;
let editorFontSize = 16;
let previewFontSize = 16;

function updateStatus(message) {
    const dirtyIndicator = isDirty ? ' • [Modified]' : '';
    const title = currentFilePath || 'Untitled';
    statusSpan.textContent = `${title}${dirtyIndicator} | ${message}`;
}

function setDirty(dirty) {
    isDirty = dirty;
    MarkDirty(dirty);
    updateStatus(dirty ? 'Unsaved changes' : 'Ready');
}

function currentTheme() {
    return document.body.classList.contains('light-theme') ? 'light' : 'dark';
}

function applyTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-theme', isLight);
    themeIconSun.style.display = isLight ? 'none' : 'inline';
    themeIconMoon.style.display = isLight ? 'inline' : 'none';
    themeText.textContent = isLight ? 'Dark Mode' : 'Light Mode';
}

function savePreferences() {
    SavePreferences({
        theme: currentTheme(),
        editorFontSize,
        previewFontSize,
    });
}

async function loadPreferences() {
    const prefs = await LoadPreferences();
    applyTheme(prefs.theme);
    editorFontSize = prefs.editorFontSize || editorFontSize;
    previewFontSize = prefs.previewFontSize || previewFontSize;
    editor.style.fontSize = `${editorFontSize}px`;
    preview.style.fontSize = `${previewFontSize}px`;
}

async function loadFileIntoEditor(name, content, statusMessage) {
    editor.value = content;
    currentFilePath = name;
    isDirty = false;
    MarkDirty(false);
    const html = await RenderMarkdown(editor.value);
    preview.innerHTML = html;
    updateStatus(statusMessage);
}

async function loadInitialFile() {
    const res = await GetInitialFile();
    if (res.Name) {
        await loadFileIntoEditor(res.Name, res.Content, 'Loaded');
    }
}

async function doSave(saveAs) {
    const result = await SaveFile(editor.value, saveAs);
    if (result.startsWith('Saved:')) {
        setDirty(false);
        currentFilePath = result.replace('Saved: ', '');
        updateStatus('Saved');
    }
}

function zoomBoth(direction) {
    editorFontSize = Math.max(10, editorFontSize + direction * 2);
    previewFontSize = Math.max(10, previewFontSize + direction * 2);
    editor.style.fontSize = `${editorFontSize}px`;
    preview.style.fontSize = `${previewFontSize}px`;
    savePreferences();
}

function duplicateLineOrSelection() {
    editor.focus();
    const { selectionStart, selectionEnd, value } = editor;

    if (selectionStart !== selectionEnd) {
        const selected = value.slice(selectionStart, selectionEnd);
        editor.setSelectionRange(selectionEnd, selectionEnd);
        document.execCommand('insertText', false, selected);
        return;
    }

    let lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = value.indexOf('\n', selectionStart);
    if (lineEnd === -1) {
        lineEnd = value.length;
    }
    const line = value.slice(lineStart, lineEnd);
    editor.setSelectionRange(lineEnd, lineEnd);
    document.execCommand('insertText', false, '\n' + line);
}

window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey) {
        return;
    }
    const key = e.key.toLowerCase();

    if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.focus();
        document.execCommand('undo');
    } else if (key === 'y') {
        e.preventDefault();
        editor.focus();
        document.execCommand('redo');
    } else if (key === 'd') {
        e.preventDefault();
        duplicateLineOrSelection();
    } else if (key === 's') {
        e.preventDefault();
        doSave(false);
    } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBoth(1);
    } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomBoth(-1);
    }
});

// Live Markdown Preview & Dirty Check
editor.addEventListener('input', async () => {
    if (!isDirty) {
        setDirty(true);
    }
    const html = await RenderMarkdown(editor.value);
    preview.innerHTML = html;
});

// Open File with strict cancellation checks
btnOpen.addEventListener('click', async () => {
    const res = await OpenFile();
    
    if (res.Error === 'Cancelled' || res.error === 'Cancelled') {
        return;
    }
    
    if (res.Error || res.error) {
        alert('Error opening file: ' + (res.Error || res.error));
        return;
    }

    if (res.Content !== undefined || res.content !== undefined) {
        await loadFileIntoEditor(res.Name ?? res.name, res.Content ?? res.content, 'Loaded');
    }
});

// Save File
btnSave.addEventListener('click', () => doSave(false));

// Save As
btnSaveAs.addEventListener('click', () => doSave(true));

// Close Application Button
btnClose.addEventListener('click', async () => {
    const canClose = await ConfirmClose();
    if (canClose) {
        await CloseApp();
    }
});

// Theme Toggle
btnTheme.addEventListener('click', () => {
    applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
    savePreferences();
});

// Font Size Controls
btnZoomInEd.addEventListener('click', () => {
    editorFontSize += 2;
    editor.style.fontSize = `${editorFontSize}px`;
    savePreferences();
});

btnZoomOutEd.addEventListener('click', () => {
    if (editorFontSize > 10) {
        editorFontSize -= 2;
        editor.style.fontSize = `${editorFontSize}px`;
        savePreferences();
    }
});

btnZoomInPr.addEventListener('click', () => {
    previewFontSize += 2;
    preview.style.fontSize = `${previewFontSize}px`;
    savePreferences();
});

btnZoomOutPr.addEventListener('click', () => {
    if (previewFontSize > 10) {
        previewFontSize -= 2;
        preview.style.fontSize = `${previewFontSize}px`;
        savePreferences();
    }
});

loadPreferences();
loadInitialFile();
