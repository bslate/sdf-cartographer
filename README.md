# SDF Atlas Generator

Web- and command-line interface to generate signed distance field texture atlas and lookup tables for OpenGL ES text support. It is largely based on Mapbox's [`fontnik`](https://github.com/mapbox/node-fontnik) project.

If you happen to use C# or Xamarin, you can use the output of this tool with our [`sdf-client`](https://github.com/zotebook/sdf-client).

## Installation

`npm install`

## CLI

To create an SDF from a font file (.ttf, .otf):

`node bin/font-to-sdf --from-file=/Library/Fonts/Arial.ttf Arial.sdf`

Or from a font family available on the system:

`node bin/font-to-sdf --from-family="Arial" Arial.sdf`

## Web Server

To start a web server with a simple dynamic HTML interface:

`node .`

## Known Issues

Some fonts segfault the server. (e.g. `Osaka.ttf`)
