curl -sf -H 'Accept: application/vnd.github.raw' https://api.github.com/repos/synle/gha-workflows/contents/dev.sh | \
bash -s -- '*.json *.scss *.jsx *.js' 'npm run start'
