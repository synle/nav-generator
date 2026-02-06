echo '>> format formatting'
npx prettier --write \
  **/*.{html,jsx,scss,yml,md,json,prettierrc}  vite.config.js \
&& echo '>> done formatting...'
