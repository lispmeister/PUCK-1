#!/bin/bash -x

#
#   A haiku to openssl:
#
#       openssl
#       a black crane over the lake
#       may you rot in hell
#

cd /etc/puck/f-u-openssl

. /etc/puck/config.sh

. puck-vars

./clean-all

rm -f ca.* puck.* vpn_client.*

echo Key size will be $KEY_SIZE bits

# randomish CN for CA
# tmp=$KEY_CN
# KEY_CN=$bits_o_128

# create CA
openssl req -batch -days $KEY_LIFE -nodes -new -newkey rsa:$KEY_SIZE -x509 -keyout ca.key -out ca.crt -config stupid.cnf

# server
openssl req $magic -batch -days $KEY_LIFE -nodes -new -newkey rsa:$KEY_SIZE -keyout puck.key -out puck.csr -extensions server -config stupid.cnf
openssl ca $magic -keyfile ca.key -cert ca.crt -batch -days $KEY_LIFE -out puck.crt -in puck.csr -extensions server -config stupid.cnf

# client
openssl req $magic -nodes -batch -new -newkey rsa:$KEY_SIZE -keyout vpn_client.key -out vpn_client.csr -config stupid.cnf
openssl ca $magic -cert ca.crt -batch -keyfile ca.key -days $KEY_LIFE -out vpn_client.crt -in vpn_client.csr -config stupid.cnf

chmod -R 755 /etc/puck/f-u-openssl/keys
