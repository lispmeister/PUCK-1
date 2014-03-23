#!/bin/bash -x

if [ -s /etc/puck ] ; then
    echo removing /etc/puck symlink
    rm -f /etc/puck
fi
if [ -d /etc/puck ] ; then
    echo Looks like the PUCK is already installed, bailin out
    exit 1
fi
# rm -rf /etc/puck
# sudo mv /etc/puck /etc/puck.old
sudo ln -s `pwd` /etc/puck

sudo ls -l /etc/redis/redis.conf
sudo ls -l /etc/init.d/puck
sudo ls -l /usr/local/sbin/puckd
sudo ls -l /etc/udev/rules.d/10-puck-key.rules

# redis has been a bit squirrely with naming... not sure what it is right now ;(
if [ -f /etc/redis/redis.conf ] ; then
    sudo mv /etc/redis/redis.conf /etc/redis/redis.conf.old
fi

sudo rm -f /etc/init.d/puck
sudo rm -f /usr/local/sbin/puckd
sudo rm -f /etc/udev/rules.d/10-puck-key.rules

sudo ln -s `pwd` /etc/puck
sudo mkdir /etc/puck/tmp
sudo mkdir /etc/puck/logs
sudo mkdir /etc/puck/redis
sudo mkdir /etc/puck/pucks
sudo chown redis.redis /etc/puck/redis

touch /etc/puck/logs/client_vpn.log
touch /etc/puck/logs/server_vpn.log
chmod 777 /etc/puck/logs/client_vpn.log
chmod 777 /etc/puck/logs/server_vpn.log

sudo chown -R pi /etc/puck
sudo chown -R redis /etc/puck/redis
sudo chmod 755 /etc/puck
sudo chmod 777 /etc/puck/tmp
sudo chmod 777 /etc/puck/logs

sudo rm -f /etc/puck/logs/*

sudo ln -s /etc/puck/redis/redis.conf /etc/redis/redis.conf
sudo ln -s /etc/puck/init.d.puck /etc/init.d/puck
sudo ln -s /etc/puck/sbin.puckd /usr/local/sbin/puckd
sudo ln -s  /etc/puck/10-puck-key.rules /etc/udev/rules.d/10-puck-key.rules

# in addition, some don't understand certain conf directives... here's
# an alternate configuration file to use if, when redis starts, it dies

sudo /etc/init.d/*redis* start

