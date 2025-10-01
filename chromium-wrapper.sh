#!/bin/bash

# Check if chromium is installed
if ! command -v chromium &> /dev/null; then
    echo "Chromium not found. Installing..." >&2
    sudo apt-get update && sudo apt-get install -y chromium
fi

exec chromium --no-sandbox --disable-dev-shm-usage --disable-gpu "$@"
