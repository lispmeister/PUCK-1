#!/bin/bash -x

#
# recursively rsync A to B
#

dst=/puff/puck/PUCK
src=/etc/puck/

if [ -d $dst -a -d $src ] ; then
    cd $dst
    rsync -av         $src .
    chown -R belly-up $dst
    chmod -R 777      $dst/.git
else
    echo failzor, one or more dirs dont exist
    exit 1
fi

