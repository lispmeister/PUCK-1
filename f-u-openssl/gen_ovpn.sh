#!/bin/bash -x

#
#   A haiku to openssl:
#
#       openssl
#       a black crane over the lake
#       may you rot in hell
#

clientname="$1"

cd /etc/puck/f-u-openssl

. puck-vars

# client

openssl req -nodes -batch -new -newkey rsa:512 -keyout $clientname.key -out $clientname.csr -config stupid.cnf
openssl ca -cert ca.crt -batch -keyfile ca.key -days 365 -out $clientname.crt -in $clientname.csr -config stupid.cnf

