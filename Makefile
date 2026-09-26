BINARY_NAME   := nephrite
BUILD_TAGS    := -tags webkit2_41
IMAGE         := localhost/$(BINARY_NAME)
TAG           ?= dev
VERSION       ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
PUBLISH_DATE  := $(shell date +%Y%m%d)
PUBLISH_IMAGE ?= ghcr.io/fatmanuk/$(BINARY_NAME)

.PHONY: all build dev test clean pod-build pod-push pod-run help

all: build

## build: Build the production binary
build:
	wails build $(BUILD_TAGS)

## dev: Run the application in live-reload development mode
dev:
	wails dev $(BUILD_TAGS)

## test: Run unit tests
test:
	go test -v ./...

## pod-build: Build the Podman container image
pod-build:
	podman build -t $(BINARY_NAME):latest -f Containerfile .

## pod-push: Push to repo
pod-push: pod-build
	podman tag $(IMAGE):$(TAG) $(PUBLISH_IMAGE):latest
	podman push $(PUBLISH_IMAGE):latest
	podman tag $(IMAGE):$(TAG) $(PUBLISH_IMAGE):$(VERSION)
	podman push $(PUBLISH_IMAGE):$(VERSION)
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
