#!/bin/bash -x

#
# Generate cert pair for PUCK
#
# Usage: $0 name client/server
#
# If "client" is specified, the server
# should sign.  If it's the server, sign 
# with the CA.
#
usage="Usage: $0 name client/server"

if [ "X$1" = "X" ]; then
    echo "Usage: $0 name client/server"
    exit 1
fi

if [ "X$2" = "X" ]; then
    echo "Usage: $0 name client/server"
    exit 1
fi

# should set...
# KEY_SIZE=512
. /etc/puck/config.sh

org="$1"

mode="$2"

# key files
key="$keystore/$org/puck.key"    # private key
pid="$keystore/$org/puck.pid"    # PUCK id
crt="$keystore/$org/puck.crt"    # certificate
csr="$keystore/$org/puck.csr"    # signing request

if [ $mode = "server" ]; then
    CAkey="$keystore/PUCK/puckroot.key"
    CAcrt="$keystore/PUCK/puckroot.crt"
else
    CAkey="$keystore/PUCK/puckroot.key"
    CAcrt="$keystore/PUCK/puckroot.crt"
    # CAkey="$keystore/PUCK/puck.key"
    # CAcrt="$keystore/PUCK/puck.crt"
fi

if [ -f $key -o -f $pid -o -f $crt -o -f $csr ]; then
    echo "Not going to overwrite existing cert with same name ($key or $pid or $crt or $csr)"
    exit 2
fi

mkdir $keystore/$org 2> /dev/null

echo creating client cert... could take awhile....

# finally!
openssl req -x509 $magic -nodes $days -key $CAkey -newkey rsa:$KEY_SIZE -keyout $key -out $crt

openssl req $magic -nodes -new -keyout $key -out $csr
openssl ca $magic -nodes -out $crt -in $csr

if [ $? != 0 ] ; then
    echo "certificate creation failed"
    exit 4
fi

chmod -R 755 $keystore/$org

# print SHA1 fingerprint
openssl x509 -noout -fingerprint -in $crt | awk -F= '{print $2}' | sed 's/://g' | tee -a $pid

