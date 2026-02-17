curl -s -- https://raw.githubusercontent.com/synle/gha-workflow/refs/heads/main/dev.sh | \
bash -s -- '*.json *.scss *.jsx *.js' 'npm run start'
