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

ca=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-1) }' $puckland/puckroot.crt)
key=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-1) }' $vpn/vpn_client.key)
cert=$(awk '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-1) }' $vpn/vpn_client.crt)

# tls=$(awk  '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-1) }' $puckland/ta.key)
# dh=$(awk   '{json = json " \"" $0 "\",\n"}END{print substr(json,0,length(json)-1) }' $puckland/dh.params)

# ca=$(awk   '{json = sprintf("%s\"%s\",\n", json, $0)}END{print substr(json,0,length(json)-1) }' $puckland/puckroot.crt)
# tls=$(awk  '{json = sprintf("%s\"%s\",\n", json, $0)}END{print substr(json,0,length(json)-1) }' $puckland/ta.key)
# dh=$(awk   '{json = sprintf("%s\"%s\",\n", json, $0)}END{print substr(json,0,length(json)-1) }' $puckland/dh.params)
# key=$(awk  '{json = sprintf("%s\"%s\",\n", json, $0)}END{print substr(json,0,length(json)-1) }' $keystore/vpn_client/puck.key)
# cert=$(awk '{json = sprintf("%s\"%s\",\n", json, $0)}END{print substr(json,0,length(json)-1) }' $keystore/vpn_client/puck.crt)

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

