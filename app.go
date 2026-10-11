package main

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

type App struct {
	ctx             context.Context
	filePath        string
	pendingFilePath string
	mdParser        goldmark.Markdown
	isDirty         bool
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
	return a.openPath(path)
}

func (a *App) openPath(path string) FileResponse {
	content, err := os.ReadFile(path)
	if err != nil {
		return FileResponse{Error: err.Error()}
	}
	a.filePath = path
	a.isDirty = false
	return FileResponse{Name: path, Content: string(content)}
}

// GetInitialFile returns the file passed on the command line (e.g. via a
// file manager's "Open With"), if any. It is consumed at most once.
func (a *App) GetInitialFile() FileResponse {
	if a.pendingFilePath == "" {
		return FileResponse{}
	}
	path := a.pendingFilePath
	a.pendingFilePath = ""
	return a.openPath(path)
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

type Preferences struct {
	Theme           string `json:"theme"`
	EditorFontSize  int    `json:"editorFontSize"`
	PreviewFontSize int    `json:"previewFontSize"`
}

func defaultPreferences() Preferences {
	return Preferences{Theme: "dark", EditorFontSize: 16, PreviewFontSize: 16}
}

func preferencesPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "nephrite", "preferences.json"), nil
}

func (a *App) LoadPreferences() Preferences {
	path, err := preferencesPath()
	if err != nil {
		return defaultPreferences()
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return defaultPreferences()
	}
	prefs := defaultPreferences()
	if err := json.Unmarshal(data, &prefs); err != nil {
		return defaultPreferences()
	}
	return prefs
}

func (a *App) SavePreferences(prefs Preferences) string {
	path, err := preferencesPath()
	if err != nil {
		return err.Error()
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err.Error()
	}
	data, err := json.MarshalIndent(prefs, "", "  ")
	if err != nil {
		return err.Error()
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		return err.Error()
	}
	return "Saved"
}
