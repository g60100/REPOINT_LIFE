#!/bin/bash
# Build script

echo "Building project..."
npm run build

echo "Copying public files..."
cp -r public/* dist/

echo "Creating _routes.json..."
cat > dist/_routes.json << 'ROUTES'
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": []
}
ROUTES

echo "✅ Build complete!"
