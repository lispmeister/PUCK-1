#!/bin/bash

#
# put the ip of the vpn server into the proxy
#
#
# Assuming we're *.*.*.6, they are *.*.*.1
#

vip=$(ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && match($1, "^tun1$")) { n = 1; dev = $1; all[dev]="" }} END { for (i in all) print all[i]}' | sed 's/6$/1/')

echo putting $vip into haproxy conf

sed 's/D3CK_SERVER/'"$vip"'/' haproto.txt > haproxy.cf

