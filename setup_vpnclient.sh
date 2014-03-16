#!/bin/bash

#
# setup the keys for vpn clients
#
# Usage: $0
#
usage="Usage: $0"

# key dirs
keystore="/etc/puck/pucks"
puckland="$keystore/PUCK"
vpn="$keystore/vpn_client"

# not all awks are equal... sigh... substring broken on raspbian
# don't even say that mawk does things "differently"... then don't
# call it awk, you fuckers.  Pissed at time lost.
ca=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $puckland/puckroot.crt)
key=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $vpn/vpn_client.key)
cert=$(awk '{json = json " \"" $0 "\",\n"}END{print substr(json,1, match(json, ",[^,]*$") -1)}' $vpn/vpn_client.crt)

# XXX hardcoding port/proto for a bit
vpn='"vpn_client" : {
        "port"     : "8080",
        "protocol" : "tcp",
        "ca"       : ['"$ca"'],
        "key"      : ['"$key"'],
        "cert"     : ['"$cert"']
        }'

#       "tlsauth"  : ['"$tls"'],
#       "dh"       : ['"$dh"]'

echo $vpn

exit $?

