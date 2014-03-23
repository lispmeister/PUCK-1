#!/bin/bash

#
# when the VPN goes up
#

echo "VPN is down!"

echo Server     :  $remote
echo VPN IP     :  $ifconfig_pool_local_ip
echo proto/port :  $proto/$remote_port_
echo Device     :  $dev

echo Bytes received : $bytes_received
echo Bytes sent     : $bytes_sent

dev=$1
mtu=$2   # no idea, actually
mtu2=$3  # no idea, actually
local_ip=$4

echo VPN IP  :  $local_ip

remote_ip=$(echo $local_ip | sed 's/\.[0-9]*$/.1/')

echo Server  :  $remote_ip
echo Device  :  $dev
echo MTU     :  $mtu
echo MTU2    :  $mtu2

