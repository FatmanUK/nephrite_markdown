package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGetInitialFile(t *testing.T) {
	app := NewApp()

	if got := app.GetInitialFile(); got != (FileResponse{}) {
		t.Fatalf("GetInitialFile() with no pending path = %+v, want zero value", got)
	}

	path := filepath.Join(t.TempDir(), "note.md")
	if err := os.WriteFile(path, []byte("# Hello"), 0644); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}
	app.pendingFilePath = path

	got := app.GetInitialFile()
	want := FileResponse{Name: path, Content: "# Hello"}
	if got != want {
		t.Fatalf("GetInitialFile() = %+v, want %+v", got, want)
	}
	if app.pendingFilePath != "" {
		t.Fatalf("pendingFilePath = %q, want empty after consuming", app.pendingFilePath)
	}
	if app.filePath != path {
		t.Fatalf("filePath = %q, want %q", app.filePath, path)
	}

	if got := app.GetInitialFile(); got != (FileResponse{}) {
		t.Fatalf("second GetInitialFile() call = %+v, want zero value", got)
	}
}

func TestPreferencesRoundTrip(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
	app := NewApp()

	got := app.LoadPreferences()
	if want := defaultPreferences(); got != want {
		t.Fatalf("LoadPreferences() with no file = %+v, want defaults %+v", got, want)
	}

	want := Preferences{Theme: "light", EditorFontSize: 20, PreviewFontSize: 24}
	if result := app.SavePreferences(want); result != "Saved" {
		t.Fatalf("SavePreferences() = %q, want %q", result, "Saved")
	}

	got = app.LoadPreferences()
	if got != want {
		t.Fatalf("LoadPreferences() after save = %+v, want %+v", got, want)
	}
}

func TestConvertMarkdown(t *testing.T) {
	app := NewApp()

	tests := []struct {
		name     string
		input    string
		contains string
	}{
		{
			name:     "Header Conversion",
			input:    "# Hello Nephrite",
			contains: "<h1 id=\"hello-nephrite\">Hello Nephrite</h1>",
		},
		{
			name:     "Bold Text",
			input:    "**bold text**",
			contains: "<strong>bold text</strong>",
		},
		{
			name:     "GFM Table Support",
			input:    "| Header |\n| --- |\n| Cell |",
			contains: "<table>",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := convertMarkdown(tt.input, app.mdParser)
			if !strings.Contains(got, tt.contains) {
				t.Errorf("ConvertMarkdown() = %q, expected to contain %q", got, tt.contains)
			}
		})
	}
}
