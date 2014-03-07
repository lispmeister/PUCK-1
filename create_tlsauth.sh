#!/bin/bash

#
# Generate a tls-auth key.
#
#   Usage: $0 PUCK-id
#
# For the client, so give this their PUCK id
#
#

if [ "X$1" = "X" ]; then
    echo "Usage: $0 PUCK-id"
    exit 1
fi

pid=$1

puck_area="/etc/puck/pucks/"
keyfile="$puck_area/$pid/ta.key"

if [ -f $keyfile ] ; then
    echo "Not going to overwrite existing key ($keyfile)"
    exit 2
fi

mkdir $puck_area/$pid 2> /dev/null

echo creating tls-auth key... can\'t seem to change it, fixed at 2048 bits

# start crankin' on DH...
openvpn --genkey --secret $keyfile

