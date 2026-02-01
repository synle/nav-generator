npm i

# Get last modification time and file size of source files in root folder
get_file_state() {
 stat -f "%m %z" index.less index.jsx *.js 2>/dev/null | sort -r
}

LAST_STATE=$(get_file_state)

while sleep 3; do
 CURRENT_STATE=$(get_file_state)
 if [ "$CURRENT_STATE" != "$LAST_STATE" ]; then
   sh build.sh
   LAST_STATE=$CURRENT_STATE
 fi
done

