# If $1 is provided, use it. Otherwise default to *.jsx *.scss
FILE_TO_WATCH=${1:-"*.jsx *.scss"}

get_file_state() {
  # Expand glob patterns properly
  stat -f "%m %z" $FILE_TO_WATCH 2>/dev/null | sort -r
}

# do the first build
npm i
sh build.sh

# start the http-server in the background
npx http-server . > /dev/null

LAST_STATE=$(get_file_state)

while sleep 3; do
  CURRENT_STATE=$(get_file_state)

  if [ "$CURRENT_STATE" != "$LAST_STATE" ]; then
    sh build.sh
    LAST_STATE="$CURRENT_STATE"
  fi
done
