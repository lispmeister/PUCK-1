#!/bin/bash -x

#
#  Try to start a VPN between the PUCK we're on and the remote one - the start of a bold new world...!
#
#  Usage: $0 target
#
#
puck_host="https://localhost"
puck_port="8080"
puck_url="$puck_host:$puck_port/puck"
puck_home="/etc/puck"
tmp="$puck_home/tmp"
results="$tmp/_puck_create_results.$$"

app_dir=`pwd`
bin_dir="$app_dir/exe"

tmp_files="$results"

if [ $# -ne 2 ] ; then
   echo "Usage: $0 pid ip-addr"
   exit 6
fi

# kill off any witnesses... er, the evidence
# trap "rm -f $tmp_files" EXIT

pid="$1"
ip=$2

ca="       --ca  $puck_home/pucks/$pid/puckroot.crt"
key="     --key  $puck_home/pucks/$pid/puck.key"
cert="   --cert  $puck_home/pucks/$pid/puck.crt"
# dh="       --dh  $puck_home/pucks/$pid/dh_param"
# tls="--tls-auth  $puck_home/pucks/$pid/ta.key"

date >> $tmp/vvveeeeppppn
chmod 777 $tmp/vvveeeeppppn

echo ""
echo ""
echo ""
echo "vpn-ing away to $ip" | tee -a $tmp/vvveeeeppppn

# cd $HOME
# $bin_dir/p0v.py -m client &

# openvpn $ca $tls $key $cert $dh --remote $ip --config C.conf
openvpn $ca $key $cert --remote $ip --config C.conf

exit 0

