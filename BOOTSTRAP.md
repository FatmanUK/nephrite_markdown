# Bootstrap: Project Nephrite

---

## 1. Current Goal & Next 3 Steps

### Current Goal

Establish a stable, high-performance Markdown editor (Nephrite) using Wails v2 with robust file state management, cross-platform native dialog integrations, and a cohesive UI theme.

### Next 3 Steps

1. Implement local configuration storage to persist user preferences (Theme state and Font sizes) across application restarts.
2. Add export functionality to allow users to save rendered HTML or PDF versions of their Markdown documents.
3. Introduce syntax highlighting for code blocks within the Markdown preview using a lightweight backend or frontend library (e.g., Chroma or Prism.js).

---

## 2. State of Play (Key Logic, Architecture, Decisions)

### Architecture
Wails v2 application utilizing a Go backend for file I/O and OS-level dialogs, paired with a Vanilla JavaScript, HTML, and CSS frontend. Frontend assets are loaded via ES Modules.

### Key Logic
Markdown rendering is offloaded to the Go backend using the `goldmark` library, ensuring fast, standardized parsing (GitHub Flavored Markdown) without bloating the frontend bundle. File dirty state is tracked synchronously between the frontend `input` listener and the backend `isDirty` boolean to intercept destructive actions (App Close, Open File).

### Decisions
* **Vanilla JS over Frameworks:** Kept the frontend dependency-free for maximum performance and minimal overhead.
* **Native OS Dialogs:** Used Wails `MessageDialog` with standard "Yes/No" string maps to ensure cross-platform compatibility (macOS/Linux/Windows) when intercepting dirty file operations.
* **Private Backend Methods:** Unexported backend helper functions (e.g., `convertMarkdown`) to prevent Wails binding generation errors in production builds.

---

## 3. Dependency Map & Version Log

| Component / Dependency | Type | Purpose |
| --- | --- | --- |
| **Wails (v2)** | Framework | Core application lifecycle, IPC bridge, and native OS window/dialog management. |
| **Go** | Backend | Core application logic, file system I/O, and state management. |
| **[github.com/yuin/goldmark](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fyuin%2Fgoldmark)** | Go Package | High-performance, extensible Markdown-to-HTML parser. |
| **goldmark/extension** | Go Package | Enables GitHub Flavored Markdown (GFM) support (tables, strikethrough). |
| **Vanilla JS & CSS** | Frontend | DOM manipulation, event listening, and dynamic UI styling via CSS Custom Properties. |

---

## 4. Golden Code Blocks

### Backend (Go)

**`app.go`**

```go
package main

import (
	"bytes"
	"context"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

type App struct {
	ctx      context.Context
	filePath string
	mdParser goldmark.Markdown
	isDirty  bool
}

func NewApp() *App {
	md := goldmark.New(
		goldmark.WithExtensions(extension.GFM),
		goldmark.WithParserOptions(parser.WithAutoHeadingID()),
		goldmark.WithRendererOptions(html.WithHardWraps(), html.WithUnsafe()),
	)
	return &App{mdParser: md}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func convertMarkdown(source string, parser goldmark.Markdown) string {
	var buf bytes.Buffer
	if err := parser.Convert([]byte(source), &buf); err != nil {
		return err.Error()
	}
	return buf.String()
}

func (a *App) RenderMarkdown(source string) string {
	return convertMarkdown(source, a.mdParser)
}

type FileResponse struct {
	Name    string `json:"name"`
	Content string `json:"content"`
	Error   string `json:"error"`
}

func (a *App) OpenFile() FileResponse {
	if a.isDirty {
		res, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:          runtime.QuestionDialog,
			Title:         "Unsaved Changes",
			Message:       "You have unsaved changes. Opening a new file will discard them. Continue?",
			Buttons:       []string{"Yes", "No"},
			DefaultButton: "No",
		})
		if err != nil || res != "Yes" {
			return FileResponse{Error: "Cancelled"}
		}
	}

	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Open Markdown File",
		Filters: []runtime.FileFilter{{DisplayName: "Markdown", Pattern: "*.md;*.txt"}},
	})
	if err != nil || path == "" {
		return FileResponse{Error: "Cancelled"}
	}
	content, err := os.ReadFile(path)
	if err != nil {
		return FileResponse{Error: err.Error()}
	}
	a.filePath = path
	a.isDirty = false
	return FileResponse{Name: path, Content: string(content)}
}

func (a *App) SaveFile(content string, saveAs bool) string {
	if saveAs || a.filePath == "" {
		path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
			Title:           "Save Markdown File",
			DefaultFilename: "untitled.md",
			Filters: []runtime.FileFilter{{DisplayName: "Markdown", Pattern: "*.md"}},
		})
		if err != nil || path == "" {
			return "Cancelled"
		}
		a.filePath = path
	}

	err := os.WriteFile(a.filePath, []byte(content), 0644)
	if err != nil {
		return err.Error()
	}
	a.isDirty = false
	return "Saved: " + a.filePath
}

func (a *App) MarkDirty(dirty bool) {
	a.isDirty = dirty
}

func (a *App) IsDirty() bool {
	return a.isDirty
}

func (a *App) CloseApp() {
	runtime.Quit(a.ctx)
}

func (a *App) ConfirmClose() bool {
	if !a.isDirty {
		return true
	}
	res, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         "Unsaved Changes",
		Message:       "You have unsaved changes. Are you sure you want to close and discard them?",
		Buttons:       []string{"Yes", "No"},
		DefaultButton: "No",
	})
	return err == nil && res == "Yes"
}

```

### Frontend (JS & HTML)

**`frontend/src/main.js`**

```javascript
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

```

**`frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Nephrite</title>
    <style>
        :root {
            --bg-toolbar: #1b2636;
            --text-toolbar: #ffffff;
            --bg-editor: #24292e;
            --text-editor: #e1e4e8;
            --border-editor: #343d46;
            --bg-preview: #1e242c;
            --text-preview: #e1e4e8;
            --bg-code: #161b22;
            --border-preview: #343d46;
            --bg-statusbar: #151d2a;
            --text-statusbar: #8b949e;
        }

        body.light-theme {
            --bg-toolbar: #f0f0f0;
            --text-toolbar: #24292e;
            --bg-editor: #ffffff;
            --text-editor: #24292e;
            --border-editor: #e1e4e8;
            --bg-preview: #fafafa;
            --text-preview: #24292e;
            --bg-code: #eaecef;
            --border-preview: #e1e4e8;
            --bg-statusbar: #e5e5e5;
            --text-statusbar: #444444;
        }

        body, html { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; overflow: hidden; }
        .toolbar { padding: 10px 15px; background: var(--bg-toolbar); color: var(--text-toolbar); display: flex; gap: 8px; align-items: center; border-bottom: 1px solid var(--border-editor); }
        .app-title { font-weight: bold; font-size: 14px; margin-right: 12px; }
        
        button { padding: 6px 12px; cursor: pointer; background: #fafbfc; border: 1px solid #d1d5da; border-radius: 4px; font-size: 13px; }
        button:hover { background: #f3f4f6; }
        .btn-danger { background: #e55353; color: white; border: none; margin-left: auto; }
        .btn-danger:hover { background: #c93b3b; }
        
        /* Main Workspace Container */
        .container { display: flex; flex: 1; height: calc(100vh - 80px); overflow: hidden; }
        #editor { flex: 1; padding: 20px; font-family: 'Courier New', monospace; border: none; resize: none; outline: none; border-right: 1px solid var(--border-editor); font-size: 16px; background: var(--bg-editor); color: var(--text-editor); }
        #preview { flex: 1; padding: 20px 40px; overflow-y: auto; font-size: 16px; line-height: 1.6; background: var(--bg-preview); color: var(--text-preview); }
        
        /* Bottom Status Bar */
        .statusbar { 
            height: 28px; 
            background: var(--bg-statusbar); 
            color: var(--text-statusbar); 
            display: flex; 
            align-items: center; 
            padding: 0 15px; 
            font-size: 12px; 
            border-top: 1px solid var(--border-editor); 
        }

        /* Rendered Markdown Styles */
        #preview h1, #preview h2 { border-bottom: 1px solid var(--border-preview); padding-bottom: 0.3em; }
        #preview code { background: var(--bg-code); padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }
        #preview pre { background: var(--bg-code); padding: 16px; border-radius: 6px; overflow: auto; }
        #preview pre code { background: none; padding: 0; }
        #preview table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
        #preview th, #preview td { border: 1px solid var(--border-preview); padding: 6px 13px; }
        #preview th { background-color: var(--bg-code); }
        #preview blockquote { border-left: 0.25em solid var(--border-preview); margin: 0; padding: 0 1em; color: #6a737d; }
    </style>
</head>
<body>
    <div class="toolbar">
        <span class="app-title">Nephrite</span>
        <button id="btn-open">Open</button>
        <button id="btn-save">Save</button>
        <button id="btn-save-as">Save As</button>
        <span style="border-left: 1px solid #555; height: 18px; margin: 0 6px;"></span>
        <button id="btn-zoom-in-ed">Editor +</button>
        <button id="btn-zoom-out-ed">Editor -</button>
        <span style="border-left: 1px solid #555; height: 18px; margin: 0 6px;"></span>
        <button id="btn-zoom-in-pr">Preview +</button>
        <button id="btn-zoom-out-pr">Preview -</button>
        <span style="border-left: 1px solid #555; height: 18px; margin: 0 6px;"></span>
	<button id="btn-theme" style="display: inline-flex; align-items: center; gap: 6px;">
	    <svg id="theme-icon-sun" width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" stroke-width="2">
		<circle cx="12" cy="12" r="5"></circle>
		<line x1="12" y1="1" x2="12" y2="3"></line>
		<line x1="12" y1="21" x2="12" y2="23"></line>
		<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
		<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
		<line x1="1" y1="12" x2="3" y2="12"></line>
		<line x1="21" y1="12" x2="23" y2="12"></line>
		<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
		<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
	    </svg>
	    <svg id="theme-icon-moon" width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2" style="display: none;">
		<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
	    </svg>
	    <span id="theme-text">Light Mode</span>
	</button>
        <button id="btn-close" class="btn-danger">✕ Close</button>
    </div>
    
    <div class="container">
        <textarea id="editor" placeholder="# Welcome to Nephrite&#10;&#10;Start typing here..."></textarea>
        <div id="preview"></div>
    </div>

    <div class="statusbar">
        <span id="status">Untitled</span>
    </div>

    <script src="./src/main.js" type="module"></script>
</body>
</html>
```

---

## 5. Tested & Passing Status Confirmation

* **App Compilation:** Passing in both `wails dev` and production `wails build`.
* **File State (Dirty Tracking):** Passing. Successfully tracks unsaved changes, halts application closure, and prevents accidental file overwrites on opening new files.
* **Theme Management:** Passing. Successfully toggles between custom dark slate and light modes with corresponding dynamic colored SVGs.
* **Dynamic Resizing:** Passing. Font sizes scale independently for editor and preview panes.