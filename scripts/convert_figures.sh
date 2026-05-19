#!/usr/bin/env bash
# Convert paper figures (PDF) to retina-ready PNGs for the project page.
# Requires: poppler-utils (provides pdftoppm).
#   Ubuntu/Debian: sudo apt-get install poppler-utils
# Run from the memgym-site/ root.

set -euo pipefail

SRC="${MEMGYM_FIGURE_SRC:-/path/to/paper/figure}"
OUT="assets/figures"
mkdir -p "$OUT"

for name in intro framework synthetic_memory rm_training_curves; do
  src="$SRC/${name}.pdf"
  if [[ ! -f "$src" ]]; then
    echo "skip: $src not found" >&2
    continue
  fi
  pdftoppm -r 144 -png -singlefile "$src" "$OUT/${name}"
  pdftoppm -r 288 -png -singlefile "$src" "$OUT/${name}@2x"
  echo "Converted: ${name}.png + ${name}@2x.png"
done
