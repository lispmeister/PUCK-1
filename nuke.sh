#!/bin/bash -x

cd /etc/d3ck

sudo killall redis-server

sleep 2

sudo /etc/init.d/d3ck stop

sudo rm -f /etc/d3ck/redis/dump.rdb 
sudo rm -rf /etc/d3ck/d3cks/*
sudo rm -rf /etc/d3ck/public/uploads/*
sudo rm -rf /etc/d3ck/secretz.json

sudo rm -f /etc/d3ck/public/img/????????????????????????????????????????.???

cp /dev/null /etc/d3ck/f-u-openssl/keys/index.txt

sudo rm -f /etc/d3ck/f-u-openssl/*.pem
sudo rm -f /etc/d3ck/f-u-openssl/*.crt
sudo rm -f /etc/d3ck/f-u-openssl/*.req

sudo /etc/init.d/redis*  start
# sudo /etc/init.d/d3ck start

