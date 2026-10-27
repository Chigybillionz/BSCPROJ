#!/bin/bash
echo "Stopping UniClear defense services..."
killall node 2>/dev/null || true
docker compose down
echo "All defense services terminated safely."
