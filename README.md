# [Guffipedia](https://ig.ft.com/sites/guffipedia/) [![Build Status][travis-image]][travis-url]

> The FT Guffipedia houses the finest corporate drivel from the archive of [Lucy Kellaway's annual Golden Flannel Awards](https://next.ft.com/stream/authorsId/Q0ItMDAwMDkyNg==-QXV0aG9ycw==) - as well as fresh twaddle submitted by readers and certified by Lucy Kellaway.

## Usage

To begin, clone this repo and running `npm i`.

You'll then need a `.env` file in the root of the project with a `SPREADSHEET_KEY` variable.

From then on run the app in development mode:

```shell
> npm start 
```

## Deploy

Commits to the master branch will build on CI. Successful builds will be published to live. Write tests to prevent bad code being made live.

## Uses Starter Kit

This project began life with the [starter-kit](https://github.com/ft-interactive/starter-kit).

## Licence
This software is published by the Financial Times under the [MIT licence](http://opensource.org/licenses/MIT). 

Please note the MIT licence includes only the software, and none of the content of this site, which is Copyright (c) Financial Times Ltd. For more information about re-publishing FT content, please contact our [syndication department](http://syndication.ft.com/).

[travis-url]: https://travis-ci.org/ft-interactive/guffipedia
[travis-image]: https://travis-ci.org/ft-interactive/guffipedia.svg
