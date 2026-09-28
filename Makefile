BINARY_NAME   := nephrite
BUILD_TAGS    := -tags webkit2_41
IMAGE         := localhost/$(BINARY_NAME)
PUBLISH_DATE  := $(shell date +%Y%m%d)

TAG           ?= dev
VERSION       ?= $(shell (echo dev ; git tag) | tail -n1)
VERDESC       ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
PUBLISH_IMAGE ?= ghcr.io/fatmanuk/$(BINARY_NAME)
PREFIX        ?= /usr/local
BINDIR        ?= $(PREFIX)/bin
DATADIR       ?= $(PREFIX)/share
DESKTOPDIR    ?= $(DATADIR)/applications

.PHONY: all build dev test clean pod-build pod-push pod-run help install uninstall

all: build

## build: Build the production binary
build:
	wails build $(BUILD_TAGS)

## install: Install binary, desktop launcher entry, and icon to system
## run as sudo, so not connected to build
install:
	install -d $(DESTDIR)$(BINDIR)
	install -m 0755 build/bin/$(BINARY_NAME) $(DESTDIR)$(BINDIR)/$(BINARY_NAME)
	install -d $(DESTDIR)$(DESKTOPDIR)
	install -m 0644 nephrite.desktop $(DESTDIR)$(DESKTOPDIR)/nephrite.desktop
	install -d $(DESTDIR)$(DATADIR)/icons/hicolor/scalable/apps
	install -m 0644 nephrite.svg $(DESTDIR)$(DATADIR)/icons/hicolor/scalable/apps/nephrite.svg
	@which update-desktop-database >/dev/null 2>&1 && update-desktop-database $(DESTDIR)$(DESKTOPDIR) || true

## uninstall: Remove binary and desktop entry
uninstall:
	rm -f $(DESTDIR)$(BINDIR)/$(BINARY_NAME)
	rm -f $(DESTDIR)$(DESKTOPDIR)/nephrite.desktop
	rm -f $(DESTDIR)$(DATADIR)/icons/hicolor/scalable/apps/nephrite.svg
	@which update-desktop-database >/dev/null 2>&1 && update-desktop-database $(DESTDIR)$(DESKTOPDIR) || true

## dev: Run the application in live-reload development mode
dev:
	wails dev $(BUILD_TAGS)

## test: Run unit tests
test:
	go test -v ./...

## pod-build: Build the Podman container image
pod-build:
	podman build -t $(IMAGE):$(TAG) -f Containerfile .

## pod-push: Push to repo
pod-push: pod-build
	podman tag $(IMAGE):$(TAG) $(PUBLISH_IMAGE):latest
	podman push $(PUBLISH_IMAGE):latest
	podman tag $(IMAGE):$(TAG) $(PUBLISH_IMAGE):$(VERSION)
	podman push $(PUBLISH_IMAGE):$(VERSION)
	podman tag $(IMAGE):$(TAG) $(PUBLISH_IMAGE):$(VERDESC)
	podman push $(PUBLISH_IMAGE):$(VERDESC)
	podman tag $(IMAGE):$(TAG) $(PUBLISH_IMAGE):$(PUBLISH_DATE)
	podman push $(PUBLISH_IMAGE):$(PUBLISH_DATE)
	podman tag $(IMAGE):$(TAG) $(PUBLISH_IMAGE):$(TAG)
	podman push $(PUBLISH_IMAGE):$(TAG)

## pod-run: Run Nephrite container with X11/Wayland GUI support, host filesystem access, and current user UID
pod-run:
	@xhost +local:podman >/dev/null 2>&1 || true
	podman run --rm -it \
		--userns=keep-id \
		--user $$(id -u):$$(id -g) \
		--ipc=host \
		--env GDK_BACKEND=wayland,x11 \
		--env GSETTINGS_BACKEND=memory \
		--env DCONF_USER_CONFIG_DIR=/tmp/dconf \
		--env HOME=$$HOME \
		--volume $$HOME:$$HOME:rw \
		--workdir $$PWD \
		$$(test -c /dev/dri/renderD128 && echo "--device /dev/dri") \
		$$(test -n "$$WAYLAND_DISPLAY" && echo "--env WAYLAND_DISPLAY=$$WAYLAND_DISPLAY --env XDG_RUNTIME_DIR=$$XDG_RUNTIME_DIR --volume $$XDG_RUNTIME_DIR/$$WAYLAND_DISPLAY:$$XDG_RUNTIME_DIR/$$WAYLAND_DISPLAY:ro") \
		$$(test -n "$$DISPLAY" && echo "--env DISPLAY=$$DISPLAY --volume /tmp/.X11-unix:/tmp/.X11-unix:ro") \
		$(BINARY_NAME):latest

## clean: Remove build artifacts
clean:
	rm -rf build/bin/$(BINARY_NAME)

## help: Show available commands
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST)
