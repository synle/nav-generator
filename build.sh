#!/bin/bash

# Download common.scss from synle/bashrc repo with size validation
download_with_validation() {
  local url="$1"
  local target_file="$2"
  local label="$3"

  # Get the current file size (0 if file doesn't exist)
  local current_size=0
  if [ -f "$target_file" ]; then
    current_size=$(wc -c < "$target_file" | tr -d ' ')
  fi

  # Download to a temp file
  local tmp_file="${target_file}.tmp"
  curl -sfL "$url" -o "$tmp_file"

  # Get the downloaded file size
  local new_size=0
  if [ -f "$tmp_file" ]; then
    new_size=$(wc -c < "$tmp_file" | tr -d ' ')
  fi

  # Validation: check if downloaded file is empty
  if [ "$new_size" -eq 0 ]; then
    echo "WARNING: Downloaded $label is empty (0 bytes). Keeping existing version ($current_size bytes)."
    rm -f "$tmp_file"
    return
  fi

  # Validation: check if downloaded file is less than 50% of current size
  if [ "$current_size" -gt 0 ]; then
    local threshold=$((current_size / 2))
    if [ "$new_size" -lt "$threshold" ]; then
      echo "WARNING: Downloaded $label is too small ($new_size bytes) compared to existing file ($current_size bytes). This is below the 50% threshold ($threshold bytes), indicating possible corruption. Keeping existing version."
      rm -f "$tmp_file"
      return
    fi
  fi

  # Validation passed, replace the file
  mv "$tmp_file" "$target_file"
  echo "Downloaded $label successfully ($new_size bytes)."
}

download_with_validation \
  "https://github.com/synle/bashrc/blob/head/webapp/common.scss?raw=true" \
  "common.scss" \
  "common.scss"

npm install
npm run test:coverage
npm run build
