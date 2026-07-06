#!/usr/bin/env bash
# Opens Render one-click deploy for this repo (requires Render login in browser).
URL="https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fhouseofkaala%2Fkaala-hrms"
echo "Opening Render deploy wizard..."
echo "$URL"
if command -v open &>/dev/null; then
  open "$URL"
elif command -v xdg-open &>/dev/null; then
  xdg-open "$URL"
else
  echo "Paste this URL in your browser:"
  echo "$URL"
fi