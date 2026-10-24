# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is an **experimental sandbox monorepo** for rapid prototyping. The philosophy is:
- Try out ideas quickly without production quality pressure
- Iterate fast and keep experiments simple
- When an experiment proves successful, extract it to a dedicated production repository
- Feel free to experiment freely - this is a safe space for drafts

## Development Environment

### Dev Container Setup
This project **requires Dev Container** for development:
- Base image: Debian Bookworm
- Pre-configured with GitHub CLI, mise, and essential dev tools
- Environment variables are loaded from `.devcontainer/devcontainer.env`
- VS Code extensions: git-graph, WakaTime

### Tool Management with mise
The project uses **mise** (https://mise.jdx.dev/) for tool version management:
- Node.js version is dynamically read from `package.json` engines field
- `.mise.toml` configures auto-installation of tools when entering the directory
- Installed tools include: Node.js, uv, @antfu/ni, claude-code, codex
- Dev Container automatically runs `mise install` on startup

To work with mise:
```bash
mise install     # Install all configured tools
mise trust       # Trust the .mise.toml configuration
```

## Project Structure

This is an npm workspaces monorepo:
- Root package manages shared tooling (Biome for linting/formatting, TypeScript for type checking)
- `apps/*` contains individual experiment workspaces
- Currently contains: `@draft/karaoke-scraper` - a karaoke score scraper with a Vite viewer deployed to Cloudflare Pages
- New experiments should be added as separate apps in `apps/` directory

## Commands

### Root-level commands
```bash
npm run lint           # Run Biome linter
npm run format         # Format code with Biome
npm run typecheck      # Type check all TypeScript files
npm run build          # Build every workspace that defines a build script
```

### Workspace-specific commands
```bash
npm run build -w @draft/karaoke-scraper    # Build a specific workspace
```

## Architecture

### TypeScript Configuration
- Root `tsconfig.json` sets base compiler options (ES2022, ESNext modules, strict mode)
- Workspace tsconfigs extend root config
- Target: ES2022, Module: ESNext with node resolution

### MCP Integration
The project includes Model Context Protocol (MCP) integration:
- `.mcp.json` configures chrome-devtools MCP server
- `chromium-wrapper.sh` provides Chromium executable with required flags for devcontainer environment
- MCP server runs in headless mode with isolated profile

## Node Version

Node.js 22 or higher is required (specified in root package.json engines).
