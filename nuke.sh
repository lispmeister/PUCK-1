
cd /etc/puck

killall redis-server
sudo /etc/init.d/puck stop

sudo rm -f redis/dump.rdb 
sudo rm -rf pucks/*

sudo /etc/init.d/redis*  start
sudo /etc/init.d/puck start

