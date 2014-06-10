#!/bin/bash -x

cd /etc/puck

sudo killall redis-server

sleep 2

sudo /etc/init.d/puck stop

sudo rm -f /etc/puck/redis/dump.rdb 
sudo rm -rf /etc/puck/pucks/*
sudo rm -rf /etc/puck/public/uploads/*

sudo /etc/init.d/redis*  start
# sudo /etc/init.d/puck start

