#!/bin/bash

#
#   A haiku to openssl:
#
#       openssl
#       a black crane over the lake
#       may you rot in hell
#

port="80"
proto="udp"

vpn_home="/etc/puck/pucks/vpn_client"

if [ "X$1" = "X" ]; then
    echo Usage: $0 name
    exit 1
else
    clientname="$1"
fi

keysize=1024
duration=30 # in days

vtarget="$vpn_home/$clientname"

cd /etc/puck/f-u-openssl

. puck-vars

# client

echo $vtarget

openssl req -nodes -batch -new -newkey rsa:$keysize -keyout "$vtarget.key" -out "$vtarget.csr" -config stupid.cnf
openssl ca -cert ca.crt -batch -keyfile ca.key -days $duration -out "$vtarget.crt" -in "$vtarget.csr" -config stupid.cnf

cd $vpn_home

# hmmm... id?
# openssl x509 -noout -fingerprint -in $vpn_home/$clientname.crt | awk -F= '{print $2}' | sed 's/://g' | tee -a $vpn_home/$clientname.pid

# get IP's of server
remote=$(ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && !match($1, "^tun")) { n = 1; dev = $1; all[dev]="" }} END { for (i in all) print "remote", all[i]}'| sed 's/,]$/]/')

(cat << EOV
dev tun
proto $proto
port  $port
$remote

cipher AES-128-CBC
auth SHA1

resolv-retry infinite

nobind
persist-key
persist-tun
client
verb 3

EOV

echo "<ca>"
cat /etc/puck/pucks/PUCK/ca.crt
echo "</ca>"
echo
echo "<cert>"
cat $vtarget.crt
echo "</cert>"
echo
echo "<key>"
cat $vtarget.key
echo "</key>") > $vtarget.ovpn
