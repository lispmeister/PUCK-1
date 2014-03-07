
cd /etc/puck

sudo /etc/init.d/redis-server stop
sudo /etc/init.d/puck stop

sudo rm -f redis/dump.rdb 
sudo rm -rf pucks/*

sudo /etc/init.d/redis-server start
sudo /etc/init.d/puck start

