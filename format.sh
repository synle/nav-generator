echo '>> format formatting'
npx prettier --write \
  *.{md,json} \
  **/**/**/**/*.{js,jsx,less} \
&& echo '>> done formatting...'
