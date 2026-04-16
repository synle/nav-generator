curl -sfL https://github.com/synle/gha-workflows/blob/head/dev.sh?raw=true | \
bash -s -- '*.json *.scss *.jsx *.js' 'npm run start'
