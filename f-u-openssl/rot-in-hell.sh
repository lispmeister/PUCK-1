#!/bin/bash -x

#
#   A haiku to openssl:
#
#       openssl
#       a black crane over the lake
#       may you rot in hell
#

cd /etc/puck/f-u-openssl

. puck-vars

./clean-all

rm ca.* puck.* vpn_client.*

# create CA

openssl req -batch -days 3650 -nodes -new -newkey rsa:512 -x509 -keyout ca.key -out ca.crt -config stupid.cnf

# server

openssl req -batch -days 3650 -nodes -new -newkey rsa:512 -keyout puck.key -out puck.csr -extensions server -config stupid.cnf
openssl ca -keyfile ca.key -cert ca.crt -batch -days 3650 -out puck.crt -in puck.csr -extensions server -config stupid.cnf


# client

openssl req -nodes -batch -new -newkey rsa:512 -keyout vpn_client.key -out vpn_client.csr -config stupid.cnf
openssl ca -cert ca.crt -batch -keyfile ca.key -days 365 -out vpn_client.crt -in vpn_client.csr -config stupid.cnf

chmod -R 755 /etc/puck/f-u-openssl/keys
