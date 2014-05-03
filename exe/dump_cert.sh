#!/bin/bash

#
#  dump out a certificate's details; uses openssl
#
#  Usage: $0 target
#

if [ $# -ne 1 ] ; then
   echo "Usage: $0 file"
   exit 1
fi

if [ ! -r "$1" ] ; then
   echo "The file \"$1\" doesn't exist or isn't readable by this program"
   exit 2
fi

cert="$1"

# extract the good bits
# openssl x509 -text -in "$1" | egrep '^ *Signature Algorithm:|^ *Issuer:|^ *Not Before:|^ *Not After '
openssl x509 -text -in "$1" | awk '{ split($0, line, ":") }
     /^ *Signature Algorithm:/ { if (! seen) print line[2]; seen = 1 }
     /^ *Issuer:/              { for (i = 2; i <= (length(line) - 1); i++) printf("%s:", line[i]); print line[length(line)]}
     /^ *Not Before:/          { for (i = 2; i <= (length(line) - 1); i++) printf("%s:", line[i]); print line[length(line)]}
     /^ *Not After /           { for (i = 2; i <= (length(line) - 1); i++) printf("%s:", line[i]); print line[length(line)]}'


# SHA1 fingerprint
openssl x509 -noout -fingerprint -in $1


exit 0

