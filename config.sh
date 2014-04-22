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
export KEY_SIZE=1024
export KEY_LIFE=365

export bits_o_128=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null| hexdump |awk '{$1=""; printf("%s", $0)}' | sed 's/ //g')

export vpn_life_puck=365
export vpn_life_tmp=30

# file/dir locations
export PUCK_HOME="/etc/puck"
export PUCK_LOGS="$PUCK_HOME/logs"
export PUCK_TMP="$PUCK_HOME/tmp"

export hell="$PUCK_HOME/f-u-openssl"

export keystore="$PUCK_HOME/pucks"
export puck_keystore="$keystore/PUCK"

export puck_proto="https"
export puck_host="localhost"
export puck_port="8080"

export puck_cipher="AES-128-CBC"
# puck_cipher="AES-256-CBC" # ???
export puck_auth="SHA1"

export puck_url="$puck_proto://$puck_host:$puck_port"

export client_keys="/etc/puck/vpn_client"

# for Certs
export KEY_COUNTRY="AQ"             # country
export KEY_PROVINCE="White"         # state 
export KEY_CITY="Pucktown"          # city
export KEY_ORG="PuckasaurusRex"     # organization
export KEY_OU="SillyLittleArms"     # org unit
export KEY_EMAIL="puck@example.com" # org unit
# COMMON_NAME="$bits_o_128.example.com"      # hmm....
export COMMON_NAME="*"
export KEY_NAME="PUCK"              # X509 Subject Field
export KEY_CN="$COMMON_NAME"

export days="-days $KEY_LIFE"       # 999 days from now

# putting it all together
export magic="-subj /C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/CN=$KEY_CN"

