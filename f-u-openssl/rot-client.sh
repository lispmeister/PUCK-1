#!/bin/bash -x

#
# create a set of client keys for a d3ck
#

#
#   A haiku to openssl:
#
#       openssl
#       a black crane over the lake
#       may you rot in hell
#

usage="$0 name-of-d3ck"

if [ "X$1" = "X" ]; then
    echo $usage
    exit 1
fi

echo "A haiku to openssl:"
echo
echo "  openssl"
echo "  a black crane over the lake"
echo "  may you rot in hell"
echo

cd /etc/d3ck/f-u-openssl

. /etc/d3ck/config.sh

. d3ck-vars

d3ck_home="$keystore/$1"
d3ck="$d3ck_home/$1"

mkdir "$d3ck_home" 2> /dev/null

echo Client key size will be $KEY_SIZE bits

# client
openssl req $magic -nodes -batch -new -newkey rsa:$KEY_SIZE -keyout $d3ck.key -out $d3ck.csr -config stupid.cnf

openssl ca $magic -cert ca.crt -batch -keyfile ca.key -days $KEY_LIFE -out $d3ck.crt -in $d3ck.csr -config stupid.cnf

chmod -R 755 /etc/d3ck/f-u-openssl/keys
