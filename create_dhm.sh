#!/bin/bash

#
# Generate DHM keys. Will create a symlink for the PUCK's
# openvpn will use the generated one next time.
#
# This can take a very, very long time on the Pi
#

. /etc/puck/config.sh

keyfile="$keystore/PUCK/dh$KEY_SIZE.params"
vpn_keyfile="$keystore/PUCK/dh.params"

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

