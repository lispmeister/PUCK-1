
cd /etc/puck

sudo /etc/init.d/redis-server stop
sudo /etc/init.d/puck stop

sudo rm -f /etc/puck/redis/dump.rdb 
sudo rm -rf /etc/puck/pucks/*

sudo /etc/init.d/redis-server start
sudo /etc/init.d/puck start

