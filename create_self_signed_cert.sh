#!/bin/bash

#
# Generate signed cert for PUCK
#
# some key command line magic courtesy of http://superuser.com/questions/226192/openssl-without-prompt
#

if [ "X$1" = "X" ]; then
    echo "Usage: $0 name"
    exit 1
fi
org="$1"

keystore="/etc/puck/"

# key files
pem="$keystore$org".pem
key="$keystore$org".key
pid="$keystore$org".pid

CAkey="$keystore/PUCK/puckroot.key"

if [ -f $key -o -f $pem -o -f $pid ]; then
    echo "Not going to overwrite existing cert with same name ($org.key or $org.pem or $org.pid)"
    exit 2
fi

echo creating host cert... currently takes about a minute on a Raspberry Pi model B

C="AQ"               # country
ST="White"           # state 
L="Pucktown"         # city
O="Puckasaurus Rex"  # organization
CN="localhost"       # could use IP if static, I suppose
days="-days 999"     # 999 days from now

KEY_SIZE=4096
KEY_SIZE=512

magic="-subj /C=$C/ST=$ST/L=$L/O=$L/CN=$CN"

# finally!
openssl req -new -newkey rsa:$KEY_SIZE $days -nodes -key $CAkey -x509 $magic -out $pem -keyout $key

# if the above worked....
if [ $? != 0 ] ; then
    echo "certificate/key creation failed"
    exit 3
fi

# print SHA1 fingerprint
openssl x509 -noout -fingerprint -in $pem | awk -F= '{print $2}' | sed 's/://g' | tee -a $pid

