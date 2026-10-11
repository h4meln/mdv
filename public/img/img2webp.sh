#!/bin/bash

ROOT="$(pwd)"

# Controlla che cwebp sia installato
if ! command -v cwebp >/dev/null 2>&1; then
    echo "ERRORE: cwebp non è installato."
    echo "Installa con:"
    echo "  sudo apt update && sudo apt install webp"
    exit 1
fi

echo "Cerco immagini in:"
echo "$ROOT"
echo

find "$ROOT" -type f \( \
    -iname "*.jpg" -o \
    -iname "*.jpeg" -o \
    -iname "*.png" -o \
    -iname "*.gif" -o \
    -iname "*.bmp" -o \
    -iname "*.tiff" -o \
    -iname "*.tif" \
\) -print0 | while IFS= read -r -d '' file; do

    filename="${file##*/}"
    directory="${file%/*}"
    name="${filename%.*}"

    output="$directory/$name.webp"

    echo "Converto:"
    echo "  $file"
    echo "  -> $output"

    # Se il WebP esiste già, lo salta
    if [ -f "$output" ]; then
        echo "SALTO: $output esiste già"
        continue
    fi

    if cwebp -q 80 "$file" -o "$output"; then
        echo "OK, ora elimino il file originale:"
        rm -f "$file"
    else
        echo "  ERRORE"
        # Se viene creato un file incompleto, lo elimina
        rm -f "$output"
    fi

    echo
done

echo "Conversione completata."