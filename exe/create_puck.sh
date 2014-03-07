#!/bin/bash -x 
#
# create a new puck via curl
#
# Usage: $0 puck-id picture IP-addr owner email
#
puck_host="https://localhost"
puck_port="8080"
puck_home="/etc/puck"
keystores="/etc/puck/pucks"
client_keys="/etc/puck/vpn_client"
puck_url="$puck_host:$puck_port/puck"
tmp="$puck_home/tmp"
results="$tmp/_puck_create_results.$$"
new_puck="$tmp/_new_puck.$$"

tmp_files="$results $new_puck"

invalid="InvalidContent"
duplicate="already exists"
noserver="couldn't connect to host"
success="upload completely sent off"
method="Method Not Allowed"

if [ $# -ne 5 ] ; then
   echo "Usage: $0 key picture puck-ID  IP-addr owner email"
   exit 1
fi

# kill off the evidence
# trap "rm -f $tmp_files" EXIT

#
# no error checking whatsoever.  TODO: Fix this ;)
#
puck_id=$1
image=$2
ip_addr=$3
name=$4
email=$5

# from remote puck
#   public CA stuff
#   published client keys for me
#   pre-auth tla-stuff
#   vpn port
#   vpn proto

# create the tls-auth key for openvpn

# XXXXX - this needs to come from server...
$puck_home/create_tlsauth.sh $puck_id

# clumsy way to get the content into json form
v_crt=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-2) }' $keystores/$puck_id/puckroot.crt)
v_key=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-2) }' $keystores/$puck_id/puck.key)
v_cert=$(awk '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-2) }' $keystores/$puck_id/puck.crt)
v_dh=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-2) }' $keystores/$puck_id/dh.params)
v_ta=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-2) }' $keystores/$puck_id/ta.key)

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
        "PUCK" : {
            "name"        : "$name",
            "PUCK-ID"     : "$puck_id",
            "image"       : "$image",
            "ip_addr"     : "$ip_addr",
            "ip_addr_vpn" : "$ip_addr_vpn",
            "owner" : {
                "name"    : "$name",
                "email"   : "$email"
            },
            $vpn,
            $remote_vpn
        }
    }
}
E_O_C
) > $new_puck

#
# use curl to put the JSON into the DB
#
echo "using curl to create PUCK..."

echo curl -k -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_puck" $puck_url
     curl -v -k -H "Accept: application/json" -H "Content-type: application/json" -X POST -d "@$new_puck" $puck_url 2> $results

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
# elif `grep -q "$error" $results` ; then
#    echo Invalid method
#    exit 4

# elif `grep -q "$success" $results` ; then
else

   # ... unsure about how to deal with this, but for now...!
#  $puck_home/create_cert.sh $puck_id

   # if the above worked....
#  if [ $? != 0 ] ; then
#      echo "certificate/key creation failed"
#      exit 7
#  fi

   # XXX - should create it here to begin with...?
#  mv $puck_id.* $keystores/$puck_id

   echo success\!

   exit 0
fi

echo "unknown error, bailin\' out"

exit 8

