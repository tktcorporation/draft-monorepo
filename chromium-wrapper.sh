#!/bin/bash
exec /usr/bin/chromium --no-sandbox --disable-dev-shm-usage --disable-gpu "$@"
