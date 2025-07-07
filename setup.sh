#!/bin/bash

# Create Next.js app with all options
npx create-next-app@latest smartmemo-app \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --eslint \
  --turbopack

# Move files into the app
cp CLAUDE.md smartmemo-app/
cp SPECIFICATION.md smartmemo-app/

echo "Setup complete!"