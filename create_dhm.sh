#!/bin/bash

#
# Generate DHM keys. Will create a symlink for the PUCK's
# openvpn will use the generated one next time.
#
# This can take a very, very long time on the Pi
#

if [ "X$1" = "X" ]; then
    echo "Usage: $0 key-size-in-bits"
    exit 1
fi

KEY_SIZE=$1

keyfile="/etc/puck/pucks/PUCK/dh$KEY_SIZE.params"
vpn_keyfile="/etc/puck/pucks/PUCK/dh.params"

if [ -f $keyfile -o -f $vpn_keyfile ] ; then
    echo "Not going to overwrite existing DH key with same name ($keyfile or $vpn_keyfile)"
    exit 2
fi

echo creating DH parameters... 
echo ... unfasten your seatbelt and take a walk, maybe a vacation, this\'ll take awhile....

mkdir /etc/puck/PUCK 2> /dev/null

# start crankin' on DH...
time openssl dhparam -out $keyfile $KEY_SIZE

# create a symlink so this is used by openvpn
rm -f $vpn_keyfile
ln -s $keyfile $vpn_keyfile

