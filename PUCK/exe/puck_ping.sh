:
#
# create a new puck via curl
#
# Usage: $0 target
#
#
# NOTE - later on we'll be passed the right port
# and proto to ping.
#
puck_host="https://localhost"
puck_port="8080"
puck_url="$puck_host:$puck_port/puck"
tmp="/etc/puck/tmp"
results="$tmp/_puck_create_results.$$"
new_puck="$tmp/_new_puck.$$"

tmp_files="$results $new_puck"

if [ $# -ne 1 ] ; then
   echo "Usage: $0 target"
   exit 1
fi

# kill off the evidence
# trap "rm -f $tmp_files" EXIT

#
# no error checking whatsoever.  TODO: Fix this ;)
#
target="$1"

#
# use curl to put the JSON into the DB
#
# echo "using curl to ping PUCK $target"

#$ curl http://localhost:8080/puck 2> $results
curl -k -sS $puck_url/ping | json id > $results

if [ ! -s $results ] ; then
   echo ping failed
   exit 2
fi

cat $results

# echo ran $0 with $* >> /tmp/runnn

