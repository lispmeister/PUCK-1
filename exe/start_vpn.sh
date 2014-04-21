#!/bin/bash -x

#
#  Try to start a VPN between the PUCK we're on and the remote one - the start of a bold new world...!
#
#  Usage: $0 target
#

. /etc/puck/config.sh

results="$PUCK_TMP/_puck_create_results.$$"

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

ca="       --ca  $keystore/$pid/puckroot.crt"
key="     --key  $keystore/$pid/puck.key"
cert="   --cert  $keystore/$pid/puck.crt"
tls="--tls-auth  $keystore/$pid/ta.key"
# dh="       --dh  $puck_home/pucks/$pid/dh_param"

# cd $HOME
# $bin_dir/p0v.py -m client &

# openvpn $ca $tls $key $cert $dh --remote $ip --config C.conf
openvpn $ca $tls $key $cert --remote $ip --config C.conf

exit 0

