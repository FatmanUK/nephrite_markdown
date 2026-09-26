import { RenderMarkdown, OpenFile, SaveFile, CloseApp } from '../wailsjs/go/main/App';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const themeBtn = document.getElementById('btn-theme');

// Live Preview: send text to Go, get HTML back
editor.addEventListener('input', async (e) => {
    preview.innerHTML = await RenderMarkdown(e.target.value);
});

// File I/O
document.getElementById('btn-open').addEventListener('click', async () => {
    const res = await OpenFile();
    if (!res.error) {
        editor.value = res.content;
        preview.innerHTML = await RenderMarkdown(res.content);
        status.innerText = res.name;
    }
});

document.getElementById('btn-save').addEventListener('click', async () => {
    const msg = await SaveFile(editor.value, false);
    if (msg !== "Cancelled") status.innerText = msg;
});

document.getElementById('btn-save-as').addEventListener('click', async () => {
    const msg = await SaveFile(editor.value, true);
    if (msg !== "Cancelled") status.innerText = msg;
});

// Close Application
document.getElementById('btn-close').addEventListener('click', () => {
    CloseApp();
});

// Theme Toggle
let isLight = false;
const sunIcon = document.getElementById('theme-icon-sun');
const moonIcon = document.getElementById('theme-icon-moon');
const themeText = document.getElementById('theme-text');

themeBtn.addEventListener('click', () => {
    isLight = !isLight;
    document.body.classList.toggle('light-theme', isLight);
    
    if (isLight) {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'inline';
        themeText.innerText = 'Dark Mode';
    } else {
        sunIcon.style.display = 'inline';
        moonIcon.style.display = 'none';
        themeText.innerText = 'Light Mode';
    }
});

// Independent Font Scaling
let edSize = 16, prSize = 16;

document.getElementById('btn-zoom-in-ed').addEventListener('click', () => {
    edSize += 2; editor.style.fontSize = `${edSize}px`;
});
document.getElementById('btn-zoom-out-ed').addEventListener('click', () => {
    if (edSize > 8) { edSize -= 2; editor.style.fontSize = `${edSize}px`; }
});
document.getElementById('btn-zoom-in-pr').addEventListener('click', () => {
    prSize += 2; preview.style.fontSize = `${prSize}px`;
});
document.getElementById('btn-zoom-out-pr').addEventListener('click', () => {
    if (prSize > 8) { prSize -= 2; preview.style.fontSize = `${prSize}px`; }
});

// Initial render
RenderMarkdown(editor.value).then(html => preview.innerHTML = html);
