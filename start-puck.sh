#!/bin/bash -x

# redis-server &

node main.js &

# for testing only... get something in the 10.x.y/24 zone
x=$((RANDOM%254+1))
y=$((RANDOM%254+1))

base10="10.$x.$y"

#
# why in the name of holy fuck does openvpn require a /29 or bigger?
# Did /31 kill their dog or something?  There must be a reason... somewhere...
#
mask10="255.255.255.248"

cd oserv

openvpn --server $base10.0 $mask10 --config S.conf &

yate -c /etc/yate/ -vvvvv -d -l /tmp/yate.log -Dt

