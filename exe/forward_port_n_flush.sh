#!/bin/bash

# The same as forward_port.sh except this calls flush.sh to clear
# out any old routes/iptables rules
#
# See flush.sh & forward_port.sh for more on what this does
#

if [ $# -ne 5 ] ; then
   echo "Usage: $0 up|down port-1 ip-2 port-2 tcp|udp"
   exit 1
fi

# up or down?
if [ "X$1" = "Xup" ] ; then
    direction="up"
elif [ "X$1" = "Xdown" ] ; then
    direction="down"
else
    echo First argument must be either \"up\" or \"down\"
    exit 2
fi

local_port=$2
remote_ip=$3
remote_port=$4
proto=$5

# out with the old
echo flushing old iptables rules n routes
bash /etc/puck/exe/flush.sh

# will not reverse this, as other PUCK stuff might break, but ensure it's on!
echo "1" > /proc/sys/net/ipv4/ip_forward

# get the ip addrs for a host, in its mind
all_ips=$(ifconfig | awk '{if (n) { all[dev] = substr($2, match($2, ":") + 1); n = 0 }} {if (match($0, "^[^ \t]") && $1 != "lo" && !match($1, "^tun")) { n = 1; dev = $1; all[dev]="" }} END { for (i in all) printf("%s ", all[i]) ; print ""}'| sed 's/,]$/]/')

if [ $direction = "up" ] ; then
    for ip in $all_ips; do
        echo "forwarding $proto traffic from $ip : $local_port => $remote_ip : $remote_port"
        echo iptables -t nat -A PREROUTING  -p tcp -d $ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        echo iptables -t nat -A POSTROUTING -p tcp --dport $remote_port -j MASQUERADE
        iptables -t nat -A PREROUTING  -p tcp -d $ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        iptables -t nat -A POSTROUTING -p tcp --dport $remote_port -j MASQUERADE
    done
else
    for ip in $all_ips; do
        echo "disabling forwarding of $proto traffic from $ip : $local_port => $remote_ip : $remote_port"
        echo iptables -t nat -D PREROUTING  -p tcp -d $ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        echo iptables -t nat -D POSTROUTING -p tcp --dport $remote_port -j MASQUERADE
        iptables -t nat -D PREROUTING  -p tcp -d $ip --dport $local_port   -j DNAT --to-destination $remote_ip:$remote_port
        iptables -t nat -D POSTROUTING -p tcp --dport $remote_port -j MASQUERADE
    done
fi


