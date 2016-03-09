# sdf-cartographer

Signed distance field texture atlas and lookup table generator for OpenGL ES text support.

# Installation

`npm install`

# CLI

To create an SDF from a font file (.ttf, .otf):

`node bin/font-to-sdf --from-file=/Library/Fonts/Arial.ttf Arial.sdf`

Or from a font family available on the system:

`node bin/font-to-sdf --from-family="Arial" Arial.sdf`

# Web Server

To start a web server with a simple dynamic HTML interface:

`node server`
