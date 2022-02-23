echo '>> format formatting'
npx prettier --write \
  **/*.{js,jsx,less,css,yml,md,json,prettierrc} \
&& echo '>> done formatting...'
