#!/bin/bash -x 
#
# create a new puck via curl
#
# Usage: $0 puck-id picture IP-addr 'ints-n-ips-in-json' owner email [puck-ip]
#
puck_host="localhost"
puck_port="8080"
puck_home="/etc/puck"
keystores="/etc/puck/pucks"
client_keys="/etc/puck/vpn_client"
tmp="$puck_home/tmp"
results="$tmp/_puck_create_results.$$"
new_puck="$tmp/_new_puck.$$"

tmp_files="$results $new_puck"

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
$puck_home/create_tlsauth.sh $puck_id

# not all awks are equal... sigh... substring broken on raspbian
# don't even say that mawk does things "differently"... then don't
# call it awk, you fuckers.  Pissed at time lost.

# clumsy way to get the content into json form
v_crt=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystores/$puck_id/puckroot.crt)
v_cert=$(awk '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystores/$puck_id/puck.crt)
v_ta=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystores/$puck_id/ta.key)

# dont give our secret key to remotes ;)
v_key="{}"
if [ "$puck_ip" = "@" ] ; then
    v_key=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystores/$puck_id/puck.key)
fi

v_dh="{}"
if [ -f $keystores/$puck_id/dh.params ] ; then
    v_dh=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $keystores/$puck_id/dh.params)
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
(
cat <<E_O_C
{
    "key"                 : "$puck_id",
    "value":{
            "name"        : "$name",
            "PUCK_ID"     : "$puck_id",
            "image"       : "$image",
            "ip_addr"     : "$ip_addr",
            "ip_addr_vpn" : "$ip_addr_vpn",
            $all_net,
            "owner" : {
                "name"    : "$name",
                "email"   : "$email"
            },
            $vpn,
            $remote_vpn
    }
}
E_O_C
) > $new_puck

echo $new_puck

#
# use curl to put the JSON into the DB
#
echo "using curl to create PUCK..."

echo curl -k -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_puck" $puck_url
     curl -k -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_puck" $puck_url &> $results

if [ $? != 0 ] ; then
   echo "curl REST to PUCK server failed to create PUCK"
   exit 3
fi

#
# crude result checking... TODO - fix this when figure out
# return codes from UI...
#
if `grep -q "$duplicate" $results` ; then
   echo JSON already in DB
   exit 4
elif `grep -q "$invalid" $results` ; then
   echo mangled JSON
   exit 5
elif `grep -q "$noserver" $results` ; then
   echo couldn\'t connect to $url
   exit 6
elif `grep -q "$serverborkage" $results` ; then
   echo internal server error $url
   exit 7
# elif `grep -q "$error" $results` ; then
#    echo Invalid method
#    exit 4

# elif `grep -q "$success" $results` ; then
else
   echo success\!
   exit 0
fi

echo "unknown error, bailin\' out"

exit 8

