# Name of the binary
BINARY_NAME=nephrite
TAGS=-tags webkit2_41

.PHONY: all build dev test clean help

all: build

## build: Build the production binary
build:
	wails build $(TAGS)

## dev: Run the application in live-reload development mode
dev:
	wails dev $(TAGS)

## test: Run unit tests
test:
	go test -v ./...

## clean: Remove build artifacts
clean:
	rm -rf build/bin/$(BINARY_NAME)

## help: Show available commands
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST)
