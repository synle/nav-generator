sh format.sh

echo '>> Build css'
npx -p less lessc index.less index.css

echo '>> Build JS'
npx esbuild index.jsx \
  --bundle \
  --outfile=index.js \
  --platform=browser \
  --loader:.jsx=jsx \
  --minify \
  --log-override:direct-eval=silent

echo '>> Format'
npm run format
