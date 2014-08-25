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
d3ck="$d3ck_home/cli3nt"

mkdir "$d3ck_home" 2> /dev/null

echo Client key size will be $KEY_SIZE bits

KEY_CN=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')
magic="-subj /C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/CN=$KEY_CN"

# client
openssl req $magic -nodes -batch -new -newkey rsa:$KEY_SIZE -keyout $d3ck.key -out $d3ck.csr -config stupid.conf

openssl ca $magic -cert ca.crt -batch -keyfile ca.key -days $KEY_LIFE -out $d3ck.crt -in $d3ck.csr -config stupid.conf

chmod -R 755 /etc/d3ck/f-u-openssl/keys
