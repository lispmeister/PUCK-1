#!/usr/bin/env python

#
# first stab at puck prototype
#
#  Usage: $0 [-dhv] [-c conf] [--debug] [--help] --mode/-m client/server -p other_puck_ip -P other_puck_PGP_fingerprint
#
# if the fingerprint has spaces in it, make sure you use quotes!
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


arg_string = "c:dhm:p:P:t:T:v"
# arg_usage  = "[-dhv] [-c conf] [--debug] [--help] --mode/-m client|server -p other_puck -P other_puck_PGP_fingerprint\n\t(make sure to quote fingerprints if they have space inside!)"
arg_usage  = "[-dhv] [-c conf] [--debug] [--help] --mode/-m client||server [-t IP-our-side] [-T IP-other-side]\n\t(make sure to quote fingerprints if they have space inside!)"
usage      = "Usage: %s %s" % (sys.argv[0], arg_usage)

debug     = False
verbose   = False

# holds all the json puck stuff
jpuck     = {}

#
# magic UDP data
#
openvpn_test = "\x38\x01\x00\x00\x00\x00\x00\x00\x00"

#
# all that conf-y stuff goes here unless overwritten by an arg
#
puck_conf = "puck.ini"

#
# do we have a wise user, a lame programmer or ...?
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

   # other puck's IP addr
   if opt == "-p":
      other_puck = argh
      if verbose:
         print("other puck's IP address = %s" % other_puck)

   # other puck's PGP fingerprint
   elif opt == "-P":
      other_finger = argh

      if verbose:
         print("other puck's fingerprint:\t%s" % other_finger)

   # the puck's INI file
   elif opt in ("-c", "--config"):
      puck_conf = argh
      if verbose:
         print("config = %s" % config)

   # e.g. client or server
   elif opt in ("-m", "--mode"):
      mode = argh
      if verbose:
         print("mode = %s" % mode)

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

   if mode == 'client':

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

   # server
   else:

      jserver        = jpuck['PUCK']['OpenVPN']['server']
      jserver_config = jpuck['PUCK']['OpenVPN']['server']['config']

      try:
         ovpn_fp_s = open(jserver['conf_file'], "w")

      except:
         print("Couldn't open %s for writing" % jserver['conf_file'])
         exit(1)

      if verbose:
         print("generating server configuration file: %s" % jserver['conf_file'])

      #
      # run over conf contents in json, write server config file
      #
      for name in jserver_config:
         if debug:
            print("%s : %s" % (name, jserver_config[name]))
         ovpn_fp_s.write("%s\t%s\n" % (name, jserver_config[name]))

      ovpn_fp_s.close()

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
# generate OpenVPN key
#
def gen_openvpn_key() :

   if verbose:
      print("generating OpenVPN key to stash in %s" % config.get('OpenVPN','open_vpn_key'))

   openvpn_exe = config.get('OpenVPN','openvpn_exe')

   if guillotine("--secret", jpuck['PUCK']['OpenVPN']['client']['conf_file']['secret']):
      print("fail!")
      exit(1)

#
# first things first - suck in config data
#
config = ConfigParser.ConfigParser()
config.read(puck_conf)

# then json puck data
load_jpuck()

#
# some things have to be there/true/etc.
#
try:
   mode
except NameError:
   print("-m/--mode option required; either use '-m server' or '-m client'")
   exit(3)
if mode != "client" and mode != "server":
   print("Correct -m/--mode options required; either use '-m server' or '-m client'")


# create the two conf files
create_OpenVPN_conf()

#
# do those clienty thingz you do so well
#
if mode == "client":
   if verbose:
      print("running as client, %s is server" % other_puck)

   #
   # is the server even there?
   #
   # check_pulse(other_puck)

   #
   # OpenVPN time
   #
   execute_vpn(jpuck['PUCK']['OpenVPN']['client']['conf_file'])

#
# The yin to the client's yang... fire up server if can, timeout
# if waited too long for a response
#
elif mode == "server":
   if verbose:
      print("running as server")

   server_timeout = config.getint('OpenVPN','ping_timeout') * config.getint('OpenVPN','number_of_attempts')

   #
   # wait for client to say hi... hello out there...?
   #
   # if verify_client(other_puck, fingerprint, other_finger):
   #    print("who the hell was that, anyway?")
   #    exit(1)

   # got the config and verification, time to get to biz
   if verbose:
      print("firing up openvpn server")

   if guillotine(jpuck['PUCK']['OpenVPN']['server']['conf_file']):
      print("fail!")
      exit(1)



# shouldn't get this, already checked, but for sanity....
else:
   print("neither client or server... figure out which duck you want to be and try again.")
   exit(1)


