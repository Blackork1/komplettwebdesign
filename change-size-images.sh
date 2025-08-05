#!/usr/bin/env bash
set -euo pipefail

# Verzeichnis mit deinen Bildern (anpassen, falls anders)
IMG_DIR="./public/images"

# Suche alle JPG/JPEG/PNG
find "$IMG_DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) | while read -r file; do
  # Neuer Dateiname: alte Endung durch .webp ersetzen
  out="${file%.*}.webp"
  echo "→ Converting $file → $out"
  magick "$file" -resize 10% "$out"
done

echo "✅ Alle Bilder sind nun als WebP vorhanden."