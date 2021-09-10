echo '>> format formatting'
npx prettier --write \
  package.json \
  *.md \
  **/**/**/**/*.{js,less} \
&& echo '>> done formatting...'
