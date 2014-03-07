#!/bin/bash

#
# Generate root CA
#
# key command line magic courtesy of http://superuser.com/questions/226192/openssl-without-prompt
#

if [ "X$1" = "X" ]; then
    echo "Usage: $0 name"
    exit 1
fi

# key stuff

org="$1"
keystore="/etc/puck/pucks/PUCK/"
key="$keystore$org".key
crt="$keystore$org".crt

if [ -f $key -o -f $crt ] ; then
    echo "Not going to overwrite existing root cert with same name ($org.key or $org.crt)"
    exit 2
fi

echo creating root cert... currently takes about a minute on a Raspberry Pi model B

mkdir $keystore 2> /dev/null


C="AQ"               # country
ST="White"           # state 
L="Pucktown"         # city
O="Puckasaurus Rex"  # organization
CN="localhost"       # could use IP if static, I suppose
days="-days 999"     # 999 days from now

magic="-subj /C=$C/ST=$ST/L=$L/O=$L/CN=$CN"

KEY_SIZE=4096
KEY_SIZE=512

# finally!
# openssl genrsa --config /etc/puck/openssl_puck.conf -out $key $KEY_SIZE                                      # create it
# openssl genrsa -out $key $KEY_SIZE                                      # create it
# openssl req $magic -nodes -new -x509 -days 1000 -key $key -out $crt     # sign it

openssl req $magic -nodes -newkey rsa:$KEY_SIZE -new -x509 -days 1000 -keyout $key -out $crt

# if the above worked....
if [ $? != 0 ] ; then
    echo "certificate/key creation failed"
    exit 3
fi

