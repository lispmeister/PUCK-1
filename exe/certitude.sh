#!/bin/bash

#
# dump some key (ahem) details about a cert out in JSON format
#
# Usage: $0 cert.crt/cert.pem
#
usage="Usage: $0 cert.crt"
cert="$1"

tmp="/etc/puck/tmp"
tmp_file="/etc/puck/tmp/certy.$$"

if [ "X$1" = "X" ]; then
    echo $usage
    exit 1
fi

if [ ! -r "$cert" ] ; then
    echo "Either cert file ($cert) doesn't exist or I can't read it, bailin'"
    exit 2
fi

# kill the evidence
trap "rm -f $tmp_file" EXIT

# finally!
openssl x509 -in "$cert" -noout -text &> $tmp_file

if [ $? != 0 ] ; then
    echo "openssl had a hard time with the file; output below, quitting:"
    cat $tmp_file
fi

# could get it all at once... but we'll run this once in a blue moon, so
# a few more CPU cycles die because of my sloth...
signature_algo=$( awk     '/Signature Algorithm/   {print $NF;          exit }' $tmp_file)
issuer=$(         awk -F: '/Issuer/                {print $2;           exit }' $tmp_file)
val_before=$(     awk     '/Not Before/            {print $0;           exit }' $tmp_file)
val_after=$(      awk     '/Not After/             {print $0;           exit }' $tmp_file)
subject=$(        awk     '/Subject/               {print $0;           exit }' $tmp_file)
public_algo=$(    awk     '/Public Key Algorithm:/ {print $NF;          exit }' $tmp_file)
rsa_pub_key=$(    awk     '/RSA Public Key/        {print $(NF-1), $NF; exit }' $tmp_file)

# the line *after* the matching line
cert_type=$(      awk     '{ if (x > 0) { print $0; exit }} /Netscape Cert Type:/ {x=1}' $tmp_file)

(echo '{"certificate details" : {'
echo '"signature algorithm"  : "'"$signature_algo"'",'
echo '"issuer"               : "'"$issuer"'",'
echo '"invalid before"       : "'"$val_before"'",'
echo '"invalid after"        : "'"$val_after"'",'
echo '"subject"              : "'"$subject"'",'
echo '"public key algorithm" : "'"$public_algo"'",'
echo '"RSA public key"       : "'"$rsa_pub_key"'",'
echo '"certificate type"     : "'"$cert_type"'"'
echo '}}') | sed 's/   *//g'

# echo $val_before
# echo $val_after
# echo $subject
# echo $public_algo
# echo $rsa_pub_key
# echo $cert_type

