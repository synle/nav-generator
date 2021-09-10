echo '>> format formatting'
npx prettier --write \
  package.json \
  *.md \
  **/**/**/**/*.{js,jsx,less} \
&& echo '>> done formatting...'
