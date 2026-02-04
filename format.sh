echo '>> format formatting'
npx prettier --write \
  **/*.{html,jsx,less,scss,yml,md,json,prettierrc} \
&& echo '>> done formatting...'
