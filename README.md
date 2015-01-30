# singalong.js
**A product of the Karaoke Research Council**

Singalong is a suite of tools for rehearsing and facilitating live musical performances using a web browser.

* A browser karaoke display with lyric highlighting that works in real time without the use of a click track
* A similiar interface for live chord charts or "fake books" to facilitate live band karaoke and singalongs
* A control interface where song progress is controlled by a band member using inexpensive USB foot pedals, or a computer keyboard
* A set of HTML5-based virtual instruments that allows non-musicians and/or audience members to play along with the band in perfect time

##Core technologies
Node, socket.io, HTML5, jQuery, gyro.js, hammer.js, howler.js, the Fluid (R3) SoundFont, socket-ntp-krcmod, teoria.js

Written entirely in javascript and HTML5. Socket.io broadcasts lyrics and chord change data between a central server and one to many display and/or virtual instrument clients. A band member or conductor can trigger chord changes using a familiar "chord chart" interface via an inexpensive USB or MIDI foot pedal (or any other kind of input device) to control the progress of a given song.

There's two main parts:
##singalong.js
An karaoke-like presentation for your browser. Two modes: a "classic" karaoke mode with lyric highlighting and a "fake book" mode to feed chord changes to any musician playing along. A typical use for singalong.js uses a scheduler to transmit lyric and/or chord changes, perfectly synchronized to several devices at once over a wireless LAN.

##playalong.js
New in release 0.6, playalong.js is a musical instrument designed to run in a distributed fashion across several mobile devices, such as smart phones and tablets. It consists of three instruments: fingerStrummer, angleRider, and waveRider. Tones emitted from these client devices change on the fly to stay in sync with chord sheet information currently being displayed by singalong.js's scheduler. Virtual instruments include:

* Accordian
* Banjo
* Bells
* Blips
* Guitar
* Human chorus
* Marimba
* Organ
* Piano
* Pizzacato strings
* Strings section

## Key Controls
Once playalong is running, a client attached to localhost may control the output of any attached client using the following keystrokes:

* D - Advance to the next chord (I assign the right foot pedal to this key) 
* A - Go back to the previous chord (I assign the left foot pedal to this key) 
* L - Advance to the next lyric
* J - Go back to the previous lyric 
* W - Modulate song up 1/2 step 
* S - Modulate song down 1/2 step 
* B - Sharp/flat notation override 
* H - Turn off/on lyric highlighting for all devices

## Usage 
To install:
First, download and install node.js for your platform if you haven't already 

http://nodejs.org/download/

Once complete, open a command prompt, console, or shell and type:

```$ npm install -g singalong```

Keep your console open and change the current directory to a directory you would like to use as a location for storing your songs.

Then, type:
 
```$ singalong```

At startup, singalong looks for a subdirectory called "songs" under the folder you are calling it from. If that directory doesn't exist, singalong creates it and copies "I've Been Workin' On The Railroad" as a starter song.

To add additional songs, place text files containing chord charts in the ./songs subdirectory, and an optional .ogg file to sync it to in ./audio if you want automatic lyrics highlighting for performances.

## Lag
In order to accurately calibrate clients, playalong.js needs a baseline latency, that is, my laptop's sound card's lag in the browser, or 182 ms. Since your sound card probably sucks less than mine, you will need to manually modify singalong.js to override this latency. Please note that the application doesn't have the ability as of yet to offset for latencies other than 182, this is a to-fix bug. If you're having problems with client sync, this is probably it. The line to change is at the very top of singalong.js. It currently reads:

```
globalOffset=182;
```

First determine your computer's sound card latency in the browser you'll be using to control singalong. I don't have an demo that can do this yet, sorry. Basically, you need to mic your keyboard and speaker and measure the amount of time it takes from hitting a key that triggers a sound to when the sound comes out the sound card. This page shows you the gist: https://ccrma.stanford.edu/~matt/latencytest/

Then, delete useragents.nedb in your local directory and calibrate a few clients against your PC until the server can start accurately guessing latencies.

From the menu, hit "Administration" in the lower right corner. Start calibration and hit refresh until all clients are synced up. Save the values to the database and your system will be able to more and more accurately guess client latencies in the future.

### User experience
At its most basic level, Singalong is a way to auto-scroll chord charts using a USB foot pedal or the "D" key of your keyboard.  The chord charts are displayed as large as possible on the screen.

Once singalong is running, open a browser window to your computer's IP address or domain name.  Typically something like http://localhost or http://192.168.1.5 or http://mycomputername.  Have users connect to the same address. They should see the same thing you see: a list of song files from ./songs

Click a song in your browser to load it.  Loaded songs begin with a list of all chords represented in the song. This is useful for an initial review of the chords if desired.

The active chord is highlighted and lyrics automatically scrolled and highlighted based on input given from a central controlling user or users. Hit the 'A' or 'D' key to recede or advance the current chord, respectively. To use with a two-pedal USB foot pedal, program the left pedal to emit the 'A' keystroke and the right pedal to emit the 'D' keystroke. Text is formatted to fit to the browser window width for maximum readability, and the song's key can be altered on-the-fly with the 'W' and 'S' keys. 

There's a basic karaoke editor that you can get to if accessing the server from the same PC the server's running from.

### Applications
Use in lieu of printed song sheets / fakebooks for:
* Casual singalongs at parties
* Live band karaoke
* Cell phone symphonies
* Music classes
* Band practice
* Concerts
* Church services
* Instructional videos
* Any other scenario where it is useful for lyrics and chord information to be grouped together on a screen and broadcast out to multiple display screens or mobile devices..


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

The public domain song Ive_Been_Workin_On_The_Railroad.txt is provided as a sample input file in the ./songs subdirectory.

## Purpose
I created this tool because I realized there is no standard tool to facilitate live-band-karaoke performances and realized these performances are often hard for singers to follow along with. I have used singalong to teach people new songs, live performances in front of audiences, and casual singalongs. Playalong.js represents an experiment to enable a new type of audience participation at events, allowing non-musicians to experience playing an instrument along with a band.

## Requirements 
A modern compliant browser with Javascript support is required to view and  control its output. Singalong has been tested in Chrome, Firefox, Opera, and the mobile browsers for Android and iPhone. Internet Explorer 6-8 are not supported due to use of JQuery 2.0 and also I was having trouble maintaining it. IE9's probably wonky, too.

Playalong.js requires a device and browser capable of playing OGG or WAV files via the Web Audio API.

## Todo 
This is my basic effort to make some software to do live-band karaoke and singalongs with my friends. I welcome help from more experienced coders and musicians.

* More sophisticated security. Currently, the sole security feature is that all input must come from the machine serving the singalong session. At the very least, a whitelist of allowed clients to send input. Currently, you can change 
```var disableSecurity=0;```
to
```var disableSecurity=1;```
... in singalong.js but that turns off everything. Eventually, it would be great to have a real authentication system allowing multiple private sessions to be happening at once.

* Code cleanup. I'm a Javascript novice and not the world's greatest programmer. The code could use an audit and I'm sure some things could be done more efficiently.

* Ability to change key signatures and then output new text format chord charts with the changes intact.

* Force refresh mode, for when you're actively editing a chord chart and don't want to have to return to the main menu to reload the current chart.

* "Client-only" option for standalone use where all server-side logic is moved to the client and files are loaded via copy-paste

* Determine if my crazy method for determining song sharpness/flatness has any basis in music theory whatsoever (it seems to work most of the time, though.)

## Changelog 
v0.6.0 - First release with the virtual instruments addon, playalong. Implemented a scheduler to predict upcoming chord changes.

v0.5.1 - Bug fixes, including one that un-breaks the application.

v0.5.0 - Karaoke mode implemented, including complete editor implemented. Most unacceptable bugs fixed.

v0.4.2 - eliminated "apostrophes in file names" bug

v0.4.1 - actually working as advertised version

v0.4.0 - initial port to node/socket.io and networked terminals

v0.3 - initial public release. Generated in perl and contained no server component. 0.4 series represents the first all-Javascript release.

## Credits
Written (so far) by Ross Brackett.

Special thanks to David Ney, Wes Davis, Rob Stauffer and Ben Rathkamp for helping me refine this user interface as well as all participants in the Winter Commission 2012 performance in Bellingham, WA, USA.

Singalong utilizes a bazillion cool javascript libraries. Thanks to the geniuses who made these things, otherwise this application would not exist. Oh, and also thanks to stackoverflow.com, you folks run a good website.

Thanks to node.js!
