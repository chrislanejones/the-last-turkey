#!/bin/sh
# Bundles the game into pub/ and wraps each model as a base64 module.
set -e
cd "$(dirname "$0")"
rm -f pub/assets/*.js
for f in plaza.glb chrislanejones.glb CLJDriving.fbx golf-woman.glb; do
  n=$(echo $f | tr '.' '-'); printf 'export default "%s"\n' "$(base64 -w0 dist/assets/$f)" > pub/assets/$n.js
done
npx esbuild src/main.js --bundle --format=esm --minify --target=es2022 --loader:.json=json --outfile=pub/main.js --log-level=warning
du -sh pub
