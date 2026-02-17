curl -s -- https://raw.githubusercontent.com/synle/gha-workflows/refs/heads/main/dev.sh | \
bash -s -- '*.json *.scss *.jsx *.js' 'npm run start'
