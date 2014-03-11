#!/bin/bash -x

ls -l /etc/redis/redis.conf
ls -l /etc/init.d/puck
ls -l /usr/local/sbin/puckd
ls -l /etc/udev/rules.d/10-puck-key.rules

# redis has been a bit squirrely with naming... not sure what it is right now ;(
if [ -f /etc/redis/redis.conf ] ; then
    sudo mv /etc/redis/redis.conf /etc/redis/redis.conf.old
fi

rm -f /etc/init.d/puck
rm -f /usr/local/sbin/puckd
rm -f /etc/udev/rules.d/10-puck-key.rules

ln -s `pwd` /etc/puck
mkdir /etc/puck/tmp
mkdir /etc/puck/logs
mkdir /etc/puck/redis
mkdir /etc/puck/pucks
chown redis.redis /etc/puck/redis

sudo chown -R pi /etc/puck
sudo chown -R redis /etc/puck/redis
sudo chmod 755 /etc/puck
sudo chmod 777 /etc/puck/tmp
sudo chmod 777 /etc/puck/logs

rm -f /etc/puck/logs/*

ln -s /etc/puck/redis/redis.conf /etc/redis/redis.conf
ln -s /etc/puck/init.d.puck /etc/init.d/puck
ln -s /etc/puck/sbin.puckd /usr/local/sbin/puckd
ln -s  /etc/puck/10-puck-key.rules /etc/udev/rules.d/10-puck-key.rules

# in addition, some don't understand certain conf directives... here's
# an alternate configuration file to use if, when redis starts, it dies

/etc/init.d/*redis* start

