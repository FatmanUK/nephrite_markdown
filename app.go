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

func (a *App) RenderMarkdown(source string) string {
	var buf bytes.Buffer
	if err := a.mdParser.Convert([]byte(source), &buf); err != nil {
		return err.Error()
	}
	return buf.String()
}

type FileResponse struct {
	Name    string `json:"name"`
	Content string `json:"content"`
	Error   string `json:"error"`
}

func (a *App) OpenFile() FileResponse {
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
	return "Saved: " + a.filePath
}

func (a *App) CloseApp() {
	runtime.Quit(a.ctx)
}
