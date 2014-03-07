#!/bin/bash -x

sip="10.48.81.1"
int="172.17.0.2"
ext="192.168.0.62"

int_eth="eth0"
sip_eth="tun1"

PORT=5060
PORT=6666
PROTO=udp
PROTO=tcp


# iptables -t filter -A FORWARD    -p $PROTO  --dport 5040 -d $sip -j ACCEPT
# iptables -t filter -A FORWARD    -p $PROTO  --dport 5040 -s $sip -m state --state ESTABLISHED,RELATED -j ACCEPT
# iptables -t nat    -A PREROUTING -i $int  -p $PROTO      -d $int  --dport 5040 -j DNAT --to-destination $sip:5040


iptables -A PREROUTING -t nat -i $sip_eth -p $PROTO --dport $PORT -j DNAT --to $sip:$PORT

iptables -A INPUT -p $PROTO -m state --state NEW --dport $PORT -i $sip_eth -j ACCEPT



