import { RenderMarkdown, OpenFile, SaveFile, CloseApp, MarkDirty, ConfirmClose } from '../wailsjs/go/main/App';

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
        editor.value = res.Content ?? res.content;
        currentFilePath = res.Name ?? res.name;
        isDirty = false;
        MarkDirty(false);
        const html = await RenderMarkdown(editor.value);
        preview.innerHTML = html;
        updateStatus('Loaded');
    }
});

// Save File
btnSave.addEventListener('click', async () => {
    const result = await SaveFile(editor.value, false);
    if (result.startsWith('Saved:')) {
        setDirty(false);
        currentFilePath = result.replace('Saved: ', '');
        updateStatus('Saved');
    }
});

// Save As
btnSaveAs.addEventListener('click', async () => {
    const result = await SaveFile(editor.value, true);
    if (result.startsWith('Saved:')) {
        setDirty(false);
        currentFilePath = result.replace('Saved: ', '');
        updateStatus('Saved');
    }
});

// Close Application Button
btnClose.addEventListener('click', async () => {
    const canClose = await ConfirmClose();
    if (canClose) {
        await CloseApp();
    }
});

// Theme Toggle
btnTheme.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    if (isLight) {
        themeIconSun.style.display = 'none';
        themeIconMoon.style.display = 'inline';
        themeText.textContent = 'Dark Mode';
    } else {
        themeIconSun.style.display = 'inline';
        themeIconMoon.style.display = 'none';
        themeText.textContent = 'Light Mode';
    }
});

// Font Size Controls
btnZoomInEd.addEventListener('click', () => {
    editorFontSize += 2;
    editor.style.fontSize = `${editorFontSize}px`;
});

btnZoomOutEd.addEventListener('click', () => {
    if (editorFontSize > 10) {
        editorFontSize -= 2;
        editor.style.fontSize = `${editorFontSize}px`;
    }
});

btnZoomInPr.addEventListener('click', () => {
    previewFontSize += 2;
    preview.style.fontSize = `${previewFontSize}px`;
});

btnZoomOutPr.addEventListener('click', () => {
    if (previewFontSize > 10) {
        previewFontSize -= 2;
        preview.style.fontSize = `${previewFontSize}px`;
    }
});
