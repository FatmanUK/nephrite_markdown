# --- Stage 1: Build Environment ---
FROM golang:1.25-bookworm AS builder

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js, npm, pkg-config, and GTK/WebKit headers
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    pkg-config \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Pin Wails to a specific v2 release compatible with Go 1.25
RUN go install github.com/wailsapp/wails/v2/cmd/wails@v2.10.1

WORKDIR /app
COPY . .

# Build production binary with stripped symbol tables and debug info (-ldflags="-s -w")
RUN /go/bin/wails build -tags webkit2_41 -clean -s -ldflags="-s -w"



# --- Stage 2: Optimized Self-Contained WebKit Runtime ---
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgtk-3-0 \
    libwebkit2gtk-4.1-0 \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
    libgl1-mesa-dri \
    && apt-get purge -y --auto-remove \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/share/doc/* \
    && rm -rf /usr/share/man/* \
    && rm -rf /usr/share/locale/* \
    && rm -rf /var/cache/apt/*

WORKDIR /usr/local/bin
COPY --from=builder /app/build/bin/nephrite .

ENTRYPOINT ["nephrite"]
