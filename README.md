# singalong.js
A product of the Karaoke Research Council

Singalong is a node.js application for simultaneously scrolling chord charts 
(or "tab") in browser windows on multiple devices at once over a LAN. Songs are 
advanced one chord change at a time using an inexpensive USB foot pedal or via 
the help of an assistant.

## Key Controls
* D - Advance to the next chord (I assign the right foot pedal to this key) 
* A - Go back to the previous chord (I assign the left foot pedal to this key) 
* W - Module song up 1/2 step 
* S - Modulate song down 1/2 step 
* B - Sharp/flat notation override 

## Usage 
To install:
```$ npm install -g singalong```

To run: 
```$ singalong```

To add additional songs, place text files containing chord charts in 
the /songs subdirectory.

### User experience
Once singalong is running, open a browser windows to your computer's IP address 
or domain name.  Have users connect to the same address. They will see the same
thing you see!

Loaded songs begin with a list of all chords represented in the song. This is 
useful for an initial run-through of the chords if desired.

Active chords are highlighted and the song automatically scrolled
based on input given from a central controlling user or users. It is 
designed to be used in tandem with inexpensive USB foot pedals configured 
to send the 'D' or 'A' keys to progress or regress through the song respectively. 
Text is formatted to fit to the browser window width for maximum readability, 
and the song's key can be altered on-the-fly with the 'W' and 'S' keys. 

### Applications
Use in leiu of printed song sheets / fakebooks for :
* Casual singalongs at parties
* Live band karaoke
* Music classes
* Band practice
* Concerts
* Church services
* Any other scenario where it is useful for lyrics and chord information to be 
grouped together on a screen and broadcast out to multiple display screens or 
mobile devices..


## Input
Singalong accepts flat-formatted text chord charts as its input:

```
G
I've been working on the railroad
C                 G
All the live-long day.

Em
I've been working on the railroad
        A              D
Just to pass the time away.
```

The public domain song Ive_Been_Workin_On_The_Railroad.txt is provided as a 
sample input file in the /songs subdirectory.

## Purpose
I created this tool because I realized there is no standard tool to facilitate 
live-band-karaoke performances and realized these performances are often hard 
for singers to follow along with. I have used singalong to teach 
people new songs, live performances in front of audiences, and casual singalongs.

## Requirements 
A modern compliant browser with Javascript support is required to view and 
control its output. Singalong has been tested in Chrome, Firefox, Opera, and 
the mobile browsers for Android and iPhone. Internet Explorer 6, 7, and 8 
are not supported due to use of JQuery 2.0 and also I was having trouble with
it. 


## Todo 
This is my basic effort to make some software to do live-band karaoke and 
singalongs with my friends. I welcome help from more experienced coders
and musicians.

- [ ] More sophisticated security. Currently, the sole security feature is that
all input must come from the machine serving the singalong session. At the
very least, a whitelist of allowed clients to send input. Currently, you can
change 
```var disableSecurity=0;```
to
```var disableSecurity=1;```
... but that turns off everything.
Eventually, it would be great to have a real authentication system allowing
multiple private sessions to be happening at once.

* Code cleanup. I'm a Javascript novice and not the world's greatest programmer. 
The code could use an audit and I'm sure some things could be done more 
efficiently.

* Karaoke Mode: the ability to record and play back lyrics progress triggered 
by chord changes. Displayed on a special black screen, larger lyric format and 
no chords for singers at live-band Karaoke shows.

* "Client-only" option for standalone use where all server-side logic is moved to
the client and files are loaded via copy-paste

* Determine if my crazy method for determining song sharpness/flatness has any
basis in music theory whatsoever (it seems to work most of the time, though.)

## Changelog 
v0.4.0 -initial port to node/socket.io and networked terminals
v0.3 - initial public release. Generated in perl and contained no server 
component. 0.4 series represents the first all-Javascript release.

## Credits
Written (so far) by Ross Brackett.

Special thanks to David Ney, Wes Davis, Rob Stauffer and Ben Rathkamp 
for helping me refine this user interface as well as all participants in the 
Winter Commission 2012 performance in Bellingham, WA, USA.

Singalong utilizes the socket.io, express, and JQuery libraries. Thanks to the geniuses
who made these things, otherwise this application would not exist. Oh, and also
thanks to stackoverflow.com, you folks run a good website.

Thanks to node.js!
