#!/bin/bash -x

#
#   A haiku to openssl:
#
#       openssl
#       a black crane over the lake
#       may you rot in hell
#
echo "A haiku to openssl:"
echo
echo "  openssl"
echo "  a black crane over the lake"
echo "  may you rot in hell"
echo

cd /etc/d3ck/f-u-openssl

. /etc/d3ck/config.sh

. d3ck-vars

./clean-all

rm -f ca.* d3ck.* vpn_client.*

echo Key size will be $KEY_SIZE bits

# randomish CN for CA
tmp=$KEY_CN
KEY_CN=$bits_o_128

# create CA
openssl req $magic -batch -nodes -new -newkey rsa:$KEY_SIZE -config stupid.conf -keyout ca.key -out ca.crt -x509 -days $KEY_LIFE

openssl req $magic -batch -nodes -new -newkey rsa:$KEY_SIZE -subj /C=$KEY_COUNTRY/CN=$KEY_CN -config stupid.conf -keyout d3ck.key -out d3ck.req -batch

KEY_CN=$tmp

# server
openssl ca $magic -batch -in d3ck.req -out d3ck.crt -config stupid.conf -days $KEY_LIFE -batch

# client
openssl req $magic -new -newkey rsa:$KEY_SIZE -config stupid.conf -keyout vpn_client.key -out vpn_client.req -batch -nodes
openssl ca $magic -batch -in vpn_client.req -out vpn_client.crt -config stupid.conf -days $KEY_LIFE -batch

chmod -R 755 /etc/d3ck/f-u-openssl/keys
