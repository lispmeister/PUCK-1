:
#
# delete a puck via curl
#
# Usage: $0 DB-key
#
puck_host="https://localhost"
puck_port="8080"
puck_url="$puck_host:$puck_port/puck"
tmp="/tmp"
results="$tmp/_puck_delete_results.$$"

tmp_files="$results"

invalid="InvalidContent"
duplicate="already exists"
noserver="couldn't connect to host"
success="upload completely sent off"

if [ $# -ne 1 ] ; then
   echo "Usage: $0 PUCK_ID"
   exit 1
fi

# kill off the evidence
trap "rm -f $tmp_files" EXIT

#
# no error checking whatsoever.  TODO: Fix this ;)
#
puck=$1

#
# use curl to put the JSON into the DB
#
echo "using curl to nuke PUCK..."

curl -k -v -H "Accept: application/json" -H "Content-type: application/json" -X DELETE "$puck_url/$puck"

rm -rf /etc/puck/pucks/$puck

# not sure how to check success/fail yet....

exit 0

