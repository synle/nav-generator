curl -sfL https://github.com/synle/gha-workflows/blob/head/dev.sh?raw=1 | \
bash -s -- '*.json *.scss *.jsx *.js' 'npm run start'
