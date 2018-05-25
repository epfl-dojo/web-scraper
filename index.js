const express = require('express')
const app = express()
var redis = require("redis").createClient()
var rp = require("request-promise-native")
var URL = require('url')
var debug = require("debug")("index.js")
const cheerio = require('cheerio')

if (process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  var redis = require("redis").createClient(rtg.port, rtg.hostname);

  redis.auth(rtg.auth.split(":")[1])
} else {
    var redis = require("redis"), client=redis.createClient();
}

client.on("error", function (err) {
  console.log("Error " + err);
});

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(3000, () => console.log('Example app listening on http://localhost:3000 !'))


function scrape (url, depth, opts){
  if (! opts) opts = {}
  if (depth <= 0) return

  rp(url)
    .then(function(contents) {
      const $ = cheerio.load(contents)
      client.set(url, contents, redis.print);
      let base_url = url

      if (opts.keep && ! opts.keep(url)) return

      $('a').map(function (i, e) {
        let href = $(e).attr('href')
        if (!href || href.match('mailto:')) return
        let url = URL.resolve(base_url,href)
        debug("Now scraping: " + url)
        scrape (url, depth-1, opts)
      })
    })
  .catch(function (err) {
    console.log("Sorry " + err + " - " + url  )
  })
}

let url = "https://sti.epfl.ch/"

scrape(url, 5, {
  keep(url) { return url.match("sti.epfl.ch") }
})
// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });
