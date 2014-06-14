#!/bin/bash -x
#
# create a new puck via curl
#
# Usage: $0 puck-id picture IP-addr 'ints-n-ips-in-json' owner email [puck-ip]
#

. /etc/puck/config.sh

results="$PUCK_TMP/_puck_create_results.$$"
new_puck="$PUCK_TMP/_new_puck.$$"
tmp_files="$results $new_puck"
tmp_reddit="$PUCK_TMP/puck_init.$$"

invalid="InvalidContent"
duplicate="already exists"
noserver="couldn't connect to host"
success="upload completely sent off"
method="Method Not Allowed"
serverborkage="InternalError"

echo ARGZ: $*

if [ $# -lt 6 ] ; then
   echo "Usage: $0 key picture puck-ID  IP-addr owner email"
   exit 1
fi

puck_ip="@"
if [ $# -eq 7 ] ; then
    echo creating puck on remote host
    puck_ip=$7
    puck_host=$7
fi

puck_url="https://$puck_host:$puck_port/puck"

echo $puck_url

# kill off the evidence
# trap "rm -f $tmp_files" EXIT

#
# no error checking whatsoever.  TODO: Fix this ;)
#
puck_id=$1
image=$2
ip_addr=$3
all_net=$4
name=$5
email=$6

# from remote puck
#   public CA stuff
#   published client keys for me
#   pre-auth tla-stuff
#   vpn port
#   vpn proto

# create the tls-auth key for openvpn

# XXXXX - this needs to come from server...
$PUCK_HOME/create_tlsauth.sh $puck_id

# not all awks are equal... sigh... substring broken on raspbian
# don't even say that mawk does things "differently"... then don't
# call it awk, you fuckers.  Pissed at time lost.

# clumsy way to get the content into json form
v_crt=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$puck_id/puckroot.crt)
v_cert=$(awk '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$puck_id/puck.crt)
v_ta=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$puck_id/ta.key)

# dont give our secret key to remotes ;)
v_key="{}"
if [ "$puck_ip" = "@" ] ; then
    v_key=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$puck_id/puck.key)
fi

v_dh="{}"
if [ -f $keystore/$puck_id/dh.params ] ; then
    v_dh=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystore/$puck_id/dh.params)
fi

# XXX hardcoding port/proto for a bit
vpn='"vpn" : {
          "port"     : "8080",
          "protocol" : "tcp",
          "ca"       : ['"$v_crt"'],
          "key"      : ['"$v_key"'],
          "cert"     : ['"$v_cert"'],
          "tlsauth"  : ['"$v_ta"'],
          "dh"       : ['"$v_dh"]'
          }'

ip_addr_vpn=`echo $ip_addr | sed 's/:.*$//'`

remote_vpn=$(./setup_vpnclient.sh)

# XXX - silly format that should be changed... leftover from... oh, bah, who cares, just fix it
value='{ 
        "name"        : '"$name"', 
        "PUCK_ID      : '"$puck_id"', 
        "image"       : '"$image"', 
        "ip_addr"     : '"$ip_addr"', 
        "ip_addr_vpn" : '"$ip_addr_vpn"', 
        '"$all_net"',
        "owner": 
            { 
                "name"  : '"$name"',
                "email" : '"$email"'
            },
        '"$vpn"', 
        '"$remote_vpn"' 
       }'

#
# use curl to put the JSON into the DB
#
echo "using redis-cli to create PUCK..."

# echo curl -k -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_puck" $puck_url
#      curl -k -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_puck" $puck_url &> $results

# echo value: $value

echo set $puck_id \'$(echo $value)\' > $tmp_reddit
# echo set $puck_id \'$(echo $value | tr '\n' ' ')\' | redis-cli
redis-cli --pipe < $tmp_reddit

if [ $? != 0 ] ; then
    echo "failzor, unknown error, bailin' out"
    exit 3
fi

echo success\!
exit 0

