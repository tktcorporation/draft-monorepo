# draft-monorepo

## Overview

This is an experimental monorepo for rapid prototyping and testing various ideas. The goal is to quickly try out different concepts, iterate on them, and promote successful experiments to production repositories.

**Philosophy:**
- Quickly experiment with new ideas without ceremony
- Keep things simple and iterate fast
- When something works well, extract it to a dedicated production repository
- No pressure for production quality - this is a sandbox

## Setup

This project uses **Dev Containers** for a consistent development environment.

### Prerequisites
- Docker
- VS Code with Dev Containers extension

### Getting Started

1. Open this repository in VS Code
2. When prompted, click "Reopen in Container" (or use Command Palette: "Dev Containers: Reopen in Container")
3. The Dev Container will automatically:
   - Install mise (tool version manager)
   - Install Node.js (version specified in package.json)
   - Install project dependencies
   - Set up development tools (ripgrep, fzf, build-essential, etc.)

### Tool Management with mise

This project uses [mise](https://mise.jdx.dev/) for managing tool versions:
- Node.js version is automatically read from `package.json` engines field
- Tools are auto-installed when entering the directory (see `.mise.toml`)
- Additional tools: uv, @antfu/ni, claude-code, codex

To manually manage tools:
```bash
mise install          # Install all tools
mise trust            # Trust the .mise.toml config
```

## Project Structure

```
apps/
  discord-bot/        # Discord TODO bot experiment
```

Add new experiments as separate apps in the `apps/` directory.