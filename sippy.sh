#!/bin/bash -x

eth="eth0"
VBR="bridge-virt0"
sip="tun1"

ip_ext="172.17.0.2"
ip_sip="10.48.81.1"

PORT=6666
PROTO=tcp

iptables -t nat -N $VBR

iptables -t nat -A PREROUTING  -p $PROTO --dport $PORT -d $ip_ext -j $VBR
iptables -t nat -A OUTPUT      -p $PROTO --dport $PORT -d $ip_ext -j $VBR
iptables -t nat -A $VBR        -p $PROTO --dport $PORT -j DNAT --to-destination $ip_sip

iptables -t nat -I POSTROUTING -p $PROTO --dport $PORT -s $ip_sip -j SNAT --to-source $ip_ext

# RPF, RIP
echo 2 > /proc/sys/net/ipv4/conf/eth0/rp_filter
echo 2 > /proc/sys/net/ipv4/conf/$sip/rp_filter



iptables -t raw -A PREROUTING --destination all -p tcp --dport 6666 -j TRACE

