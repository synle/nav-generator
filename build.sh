sh format.sh

echo '>> Build css'
npx -p less lessc index.less index.css

echo '>> Format'
npm run format

echo '>> Update ServiceWorker Version'
node updateServiceWorkerVersion.js 'sw-nav.js'
