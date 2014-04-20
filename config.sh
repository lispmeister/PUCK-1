#
# various bits and piecees that belong in a conf file
#

PATH=$PATH:/usr/local/bin:/usr/local/nodey/bin

#
# source this if using shell, like:
#
#   . /etc/puck/config.sh
#

#
# crypto
#
KEY_SIZE=1024
KEY_LIFE=365

bits_o_128=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')

# vpn_life_puck=365
# vpn_life_tmp=30

# file/dir locations
PUCK_HOME="/etc/puck"
PUCK_LOGS="$PUCK_HOME/logs"
PUCK_TMP="$PUCK_HOME/tmp"

hell="$PUCK_HOME/f-u-openssl"

keystore="$PUCK_HOME/pucks"
puck_keystore="$keystore/PUCK"

puck_proto="https"
puck_host="localhost"
puck_port="8080"

puck_url="$puck_proto://$puck_host:$puck_port"


client_keys="/etc/puck/vpn_client"


# for Certs
C="AQ"               # country
ST="White"           # state 
L="Pucktown"         # city
O="Puckasaurus Rex"  # organization
CN="$bits_o_128.example.com"      # hmm....
days="-days $KEY_LIFE"     # 999 days from now

# putting it all together
magic="-subj /C=$C/ST=$ST/L=$L/O=$L/CN=$CN"

