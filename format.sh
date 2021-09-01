echo '>> format formatting'
npx prettier --write \
  package.json \
  *.md \
  **/**/**/*.js \
  **/**/**/*.less \
  **/**/**/*.css \
  **/**/**/*.html \
&& echo '>> done formatting...'
