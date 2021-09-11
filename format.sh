echo '>> format formatting'
npx prettier --write \
  *.{md,json} \
  **/**/**/**/*.{js,jsx,less,yml} \
&& echo '>> done formatting...'
