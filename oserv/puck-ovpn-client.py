#!/usr/bin/env python

#
# be a client to a remote open VPN server
#
#  Usage: $0 [-dhv] [-c conf] [--debug] [--help] ip-or-hostname 
#

import ConfigParser
import SocketServer

import getopt
import json
import os
import socket
import string
import subprocess
import sys
import threading
import time
import urllib

from sh import openvpn

#
# two mini helper functions for the sh module
#
def process_stderr(line):
    print("ERR! %s" % line)

def process_stdout(line):
    print(line),


arg_string = "c:dhv"
arg_usage  = "[-dhv] [-c conf] [--debug] [--help] ip-or-hostname"

usage        = "Usage: %s %s" % (sys.argv[0], arg_usage)

debug      = False
verbose    = False

# holds all the json puck stuff
jpuck      = {}

#
# all that conf-y stuff goes here unless overwritten by an arg
#
puck_conf = "puck.ini"

#
# try out the opts
#
try:
    opts, args = getopt.getopt(sys.argv[1:], arg_string, ["help"])

except getopt.GetoptError as err:
    # print help information and exit:
    print(str(err)) # will print something like "option -a not recognized"
    print(usage)
    sys.exit(2)

verbose = False
for opt, argh in opts:

    # the puck's INI file
    if opt in ("-c", "--config"):
        puck_conf = argh
        if verbose:
            print("config = %s" % config)

    # debug/verbose/help...
    elif opt in ("-d", "--debug"):
        debug = True
        if verbose:
            print("Setting debug to true")

    elif opt == "-v":
        verbose = True
        print("verbose turned on")

    elif opt in ("-h", "--help"):
        print(usage)
        sys.exit()

    else:
        assert False, "unknown option: %s" % opt

#
# some things have to be there... target is one
#
try:
    other_puck = sys.argv[1]
    if verbose:
         print("other puck's IP address = %s" % other_puck)
    print("other puck's IP address = %s" % other_puck)
except:
    print("remote ip/hostname required")
    sys.exit(2)
    

#
# functions follow
#

#
# read the PUCK's json file, contains conf and various things
#
def load_jpuck():

    global jpuck

    try:
        pj = open(config.get('DEFAULT', 'puck_json'))

    except:
        print("Couldn't open %s" % config.get('DEFAULT', 'puck_json'))
        exit(1)

    jpuck  = json.load(pj)
    pj.close()


#
# execute openvpn, spit out the outty stuff in a basket
#
def guillotine(arguments):

    if verbose:
        print("executing openvpn %s" % arguments)

    # suck in the command
    from sh import openvpn

    proc = openvpn(
              arguments,
              _out=process_stdout, 
              _err=process_stderr,
              _bg=True
              )

    # possibly should just go all out asynch, but for now,
    # patience, youngster, patience....
    proc.wait()

    # did it work?
    if proc.exit_code:
        if verbose:
            print("openvpn failed with exit code %s" % proc.exit_code)
        return(1)
    else:
        if verbose:
            print("openvpn seemd to work fine")
        return(0)

#
# A very simple file, but this controls the client/server OpenVPN interaction
#
def create_OpenVPN_conf():

    if verbose:
        print("creating OpenVPN configuration file")

    jclient        = jpuck['PUCK']['OpenVPN']['client']
    jclient_config = jpuck['PUCK']['OpenVPN']['client']['config']

    try:
        ovpn_fp_c = open(jclient['conf_file'], "w")

    except:
        print("Couldn't open %s for writing" % jclient['conf_file'])
        exit(1)

    if verbose:
        print("generating client configuration file %s" % jclient['conf_file'])

    #
    # run over conf contents in json, write client config file
    #
    for name in jclient_config:
        if debug:
            print("%s : %s" % (name, jclient_config[name]))
        ovpn_fp_c.write("%s\t%s\n" % (name, jclient_config[name]))

    ovpn_fp_c.close()

#
# try to connect to the server via OpenVPN... do a
# sanity check; eventually will try N times then bail if no 
# response
#
def execute_vpn(args):

    n = 0
    sanity = False

    #
    # Do a little dance..make a little love...run OpenVPN tonight!
    #
    # run_openvpn = "%s --conf %s" % (config.get('OpenVPN','openvpn_exe'), config.get('OpenVPN','open_vpn_conf_client'))
    # run_openvpn = "%s %s" % (config.get('OpenVPN','openvpn_exe'), config.get('OpenVPN','open_vpn_conf_client'))

    if verbose:
        print("client executing openvpn")

    #
    # run it and spit out output as it happens....
    #
    if guillotine(args):
        print("fail!")
        exit(1)

#
# first things first - suck in config data
#
config = ConfigParser.ConfigParser()
config.read(puck_conf)

# then json puck data
load_jpuck()

# create the two conf files
create_OpenVPN_conf()

#
# do those clienty thingz you do so well
#
if verbose:
    print("running as client, %s is server" % other_puck)

#
# OpenVPN time
#
execute_vpn(jpuck['PUCK']['OpenVPN']['client']['conf_file'])


