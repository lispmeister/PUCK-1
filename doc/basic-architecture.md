Basic architecture
-------------------

Browser to deck network encrypted, then changes to http *within*
the d4ck - e.g. from nginx to node server. This was done in an
effort to escape the hell that is javascript/browser/https interaction
and retain zero configuration on the client (e.g. browser.)

So:

    browser -> https -> nginx -> http -> nodejs

When a d3ck wants to talk to another d3ck it was originally:

    d3ck_one -> https -> d3ck_two

But the benefits of client-side cert auth became clear over time,
so it's been starting to move in that direction.

Directory Structure, files, etc.
---------------------------------

/etc/d3ck - main d3ck directory

    exe         - where various OS/shell programs live, executed by the main

    conf        - eventually decided things *should* be here, but now only
                  nginx is there

    f-u-openssl - the ssl cert generation stuff

    public      - all the browser/client stuff

    d3cks       - all the d3ck certificate files and junk (including the
                  D3cks have a subdir corresponding to their d3ck ID (e.g.

                  /etc/d3ck/d3cks/4EA45A067FD1DCCD65E442ECD31AEA5F69674A33);

                  the d3ck nodejs is running on has a symlink - 'D3CK' -
                  in that subdir for ease of access, so /etc/d3cks/D3CK
                  will always go to the home d3ck area.

                  if my d3ck sends yours keys for client-side-auth they'll
                  also show up in your d3cks subdir, prefixed by an
                  underscore;
                  e.g.

                  /etc/d3ck/d3cks/4EA...3/_cli3nt.cert

                  This was done for sanity and testing.

                  Finally a JSON bundle is in the client subdirs as well;
                  this is a bundle of all the certs and basic d3ck info
                  that was sent to each client, including the image that
                  shows up in their UI. Left for testing as well, but
                  perhaps not a bad thing.

More perhaps should be kept in redis; currently basic d3ck and client info
is there as well as logging (more later on that.)


Authentication
---------------

Auth is done via the passport auth package, and mostly in the
"auth" function.

Bcrypt is used to encrypt the user's password and is kept in a
json file "secretz.json" in /etc/d3ck.

If something comes from 127.0.0.1 it gets an auth bypass; this
is used for things like "node, call-this-shell-exe to start vpn" or
whatever.


Authorization
--------------

This is just a skeleton but for completeness...

Pretty simple in theory; there are capabilities that a d3ck has, like
video, file transfer, etc.  Each other d3ck (lookup by d3ck-ID) you
know about has a yes/no/??? for each potential capability, They try to
do something, you look it up, it will pass/fail/need-confirm/etc.

In practice this is where things start getting a bit complex in the
MENTAL MODEL - less so the code.

For instance I might let markus execute programs on my d3ck, but I
would like to say yes or no to each request. I can only do that if I'm
logged in, whether in real-time or queued up or whatever.

The capabilities structure is in D3CK.json; it looks something like this:

 "capabilities" : {
     "friend request":       { "paranoid": "off", "moderate": "ask",
"trusting": "on"  },
     "VPN":                  { "paranoid": "ask", "moderate": "ask",
"trusting": "on"  },

     [...]

Each line is a capability; there are currently 3 types of user types,
paranoid, moderate, and trusting, and they all have different defaults
for various capabilities (the paranoid being the most... cautious.)

Eventaully all these could be overwritten on a d3ck-by-d3ck basis - e.g.
I'm paranoid, but for you, markus, I make an exception.

NOTE: if you are a client d3ck initiating communications with another
d3ck then the 2nd d3ck's capability matrix will be used. In general this
is true for the security model - you accept the remote's restrictions or
lack of the same.


A couple of current issues/failings
------------------------------------

There is no general purpose mechanism for alerting the user of things.
I've started that recently, but is in a nascent state.

That means things can fail silently, even if the server has said "ackkkkk".
Yes, I suck. So much wasted time on https got me here.

The server itself only uses console.logs - I didn't really understand
the one you'd chosen early on, so rather than use it incorrectly I simply
ripped it out. There was no one here to speak in its defense ;)


That said, interesting actions save logs in redis, and are spit out on
demand (mostly used for the messages area in the UI right now); this
includes
who contacted you when, file transfers, calls, etc.
