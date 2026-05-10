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
  "https://github.com/synle/bashrc/blob/head/webapp/common.scss?raw=1" \
  "common.scss" \
  "common.scss"

npm install

# Run tests with coverage; tee output so we can both display it live and
# scrape the summary for the GitHub Actions step summary.
coverage_log="$(mktemp -t nav-coverage-XXXXXX.log)"
trap 'rm -f "$coverage_log"' EXIT
set -o pipefail
npm run test:coverage 2>&1 | tee "$coverage_log"
set +o pipefail

# Publish the coverage output to the GitHub Actions job summary so the
# percentages are visible without digging into raw logs. We extract from
# the "% Coverage report" header through the trailing "====" line of the
# v8 reporter's summary block (state machine: copy lines after the header,
# stop once we've seen the second band of '=' delimiters).
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## Test coverage"
    echo ""
    echo '```'
    awk '
      /% Coverage report/ { copy = 1 }
      copy { print }
      copy && /^=+$/ { eq_seen++; if (eq_seen == 2) exit }
    ' "$coverage_log"
    echo '```'
  } >> "$GITHUB_STEP_SUMMARY"
fi

npm run build
