package main

import (
	"strings"
	"testing"
)

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
			got := ConvertMarkdown(tt.input, app.mdParser)
			if !strings.Contains(got, tt.contains) {
				t.Errorf("ConvertMarkdown() = %q, expected to contain %q", got, tt.contains)
			}
		})
	}
}
