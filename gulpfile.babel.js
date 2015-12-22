/* eslint-disable no-loop-func */

import 'dotenv/config';
import browserify from 'browserify';
import browserSync from 'browser-sync';
import del from 'del';
import fetch from 'node-fetch';
import fs from 'fs';
import gulp from 'gulp';
import Handlebars from 'handlebars';
import igdeploy from 'igdeploy';
import mkdirp from 'mkdirp';
import mergeStream from 'merge-stream';
import path from 'path';
import prettyData from 'gulp-pretty-data';
import runSequence from 'run-sequence';
import source from 'vinyl-source-stream';
import subdir from 'subdir';
import vinylBuffer from 'vinyl-buffer';
import watchify from 'watchify';
import AnsiToHTML from 'ansi-to-html';

const $ = require('auto-plug')('gulp');
const ansiToHTML = new AnsiToHTML();

const AUTOPREFIXER_BROWSERS = [
  'ie >= 8',
  'ff >= 30',
  'chrome >= 34',
];

const DEPLOY_TARGET = ''; // e.g. 'features/YOUR-PROJECT-NAME'

const BROWSERIFY_ENTRIES = [
  'scripts/main.js',
];

const BROWSERIFY_TRANSFORMS = [
  'babelify',
  'debowerify',
];

const OTHER_SCRIPTS = [
  'scripts/top.js'
];

let env = 'development';

// function to get an array of objects that handle browserifying
function getBundlers(useWatchify) {
  return BROWSERIFY_ENTRIES.map(entry => {
    var bundler = {
      b: browserify(path.posix.resolve('client', entry), {
        cache: {},
        packageCache: {},
        fullPaths: useWatchify,
        debug: useWatchify
      }),

      execute: function () {
        var stream = this.b.bundle()
          .on('error', function (error) {
            handleBuildError.call(this, 'Error building JavaScript', error);
          })
          .pipe(source(entry.replace(/\.js$/, '.bundle.js')));

        // skip sourcemap creation if we're in 'serve' mode
        if (useWatchify) {
          stream = stream
            .pipe(vinylBuffer())
            .pipe($.sourcemaps.init({loadMaps: true}))
            .pipe($.sourcemaps.write('./'));
        }

        return stream.pipe(gulp.dest('.tmp'));
      }
    };

    // register all the transforms
    BROWSERIFY_TRANSFORMS.forEach(function (transform) {
      bundler.b.transform(transform);
    });

    // upgrade to watchify if we're in 'serve' mode
    if (useWatchify) {
      bundler.b = watchify(bundler.b);
      bundler.b.on('update', function (files) {
        // re-run the bundler then reload the browser
        bundler.execute().on('end', reload);

        // also report any linting errors in the changed file(s)
        gulp.src(files.filter(file => subdir(path.resolve('client'), file))) // skip bower/npm modules
          .pipe($.eslint())
          .pipe($.eslint.format());
      });
    }

    return bundler;
  });
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/ /g, '-').replace(/['\(\)]/g, '');
}

// compresses images (client => dist)
gulp.task('compress-images', () => gulp.src('client/**/*.{jpg,png,gif,svg}')
  .pipe($.imagemin({
    progressive: true,
    interlaced: true,
  }))
  .pipe(gulp.dest('dist'))
);

// minifies JS (.tmp => dist)
gulp.task('minify-js', () => gulp.src('.tmp/**/*.js')
  .pipe($.uglify({output: {inline_script: true}})) // eslint-disable-line camelcase
  .pipe(gulp.dest('dist'))
);

// minifies CSS (.tmp => dist)
gulp.task('minify-css', () => gulp.src('.tmp/**/*.css')
  .pipe($.minifyCss({compatibility: '*'}))
  .pipe(gulp.dest('dist'))
);

// copies over miscellaneous files (client => dist)
gulp.task('copy-misc-files', () => gulp.src(
  [
    'client/**/*',
    '!client/**/*.{html,scss,js,jpg,png,gif,svg,hbs}', // all handled by other tasks,
  ], {dot: true})
  .pipe(gulp.dest('dist'))
);

// inlines short scripts/styles and minifies HTML (dist => dist)
gulp.task('finalise-html', done => {
  gulp.src('.tmp/**/*.html')
    .pipe(gulp.dest('dist'))
    .on('end', () => {
      gulp.src('dist/**/*.html')
        .pipe($.smoosher())
        .pipe($.minifyHtml())
        .pipe(gulp.dest('dist'))
        .on('end', done);
    });
});

// clears out the dist and .tmp folders
gulp.task('clean', del.bind(null, ['.tmp/*', 'dist/*', '!dist/.git'], {dot: true}));

// // runs a development server (serving up .tmp and client)
gulp.task('serve', ['download-data', 'styles'], function (done) {
  var bundlers = getBundlers(true);

  // execute all the bundlers once, up front
  var initialBundles = mergeStream(bundlers.map(function (bundler) {
    return bundler.execute();
  }));
  initialBundles.resume(); // (otherwise never emits 'end')

  initialBundles.on('end', function () {
    // use browsersync to serve up the development app
    browserSync({
      server: {
        baseDir: ['.tmp', 'client'],
        routes: {
          '/bower_components': 'bower_components'
        }
      }
    });

    // refresh browser after other changes
    gulp.watch(['client/styles/**/*.{scss,css}'], ['styles', 'scsslint', reload]);
    gulp.watch(['client/images/**/*'], reload);

    gulp.watch(['./client/**/*.hbs', 'client/words.json'], () => {
      runSequence('templates', reload);
    });

    runSequence('templates', done);
  });
});

// builds and serves up the 'dist' directory
gulp.task('serve:dist', ['build'], done => {
  require('browser-sync').create().init({
    open: false,
    notify: false,
    server: 'dist',
  }, done);
});

// preprocess/copy scripts (client => .tmp)
// (this is part of prod build task; not used during serve)
gulp.task('scripts', () => mergeStream([
  // bundle browserify entries
  getBundlers().map(bundler => bundler.execute()),
  // also copy over 'other' scripts
  gulp.src(OTHER_SCRIPTS.map(script => 'client{/_hack,}/' + script)).pipe(gulp.dest('.tmp'))
]));

// builds stylesheets with sass/autoprefixer
gulp.task('styles', () => gulp.src('client/**/*.scss')
  .pipe($.sourcemaps.init())
  .pipe($.sass({includePaths: 'bower_components'})
    .on('error', function (error) {
      handleBuildError.call(this, 'Error building Sass', error);
    })
  )
  .pipe($.autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
  .pipe($.sourcemaps.write('./'))
  .pipe(gulp.dest('.tmp'))
);

// lints JS files
gulp.task('eslint', () => gulp.src('client/scripts/**/*.js')
  .pipe($.eslint())
  .pipe($.eslint.format())
  .pipe($.if(env === 'production', $.eslint.failAfterError()))
);

// lints SCSS files
gulp.task('scsslint', () => gulp.src('client/styles/**/*.scss')
  .pipe($.scssLint({bundleExec: true}))
  .pipe($.if(env === 'production', $.scssLint.failReporter()))
);

// makes a production build (client => dist)
gulp.task('build', done => {
  env = 'production';

  runSequence(
    // preparatory
    ['clean', /* 'scsslint', 'eslint', */ 'download-data', 'create-rss-feed'],
    // preprocessing (client/templates => .tmp)
    ['scripts', 'styles', 'templates'],
    // optimisation (+ copying over misc files) (.tmp/client => dist)
    ['minify-js', 'minify-css', 'compress-images', 'copy-misc-files'],
    // finalise the HTML in dist (by inlining small scripts/stylesheets then minifying the HTML)
    ['finalise-html'],
  done);
});

// task to deploy to the interactive server
gulp.task('deploy', done => {
  if (!DEPLOY_TARGET) {
    console.error('Please specify a DEPLOY_TARGET in your gulpfile!');
    process.exit(1);
  }

  igdeploy({
    src: 'dist',
    destPrefix: '/var/opt/customer/apps/interactive.ftdata.co.uk/var/www/html',
    dest: DEPLOY_TARGET,
  }, error => {
    if (error) return done(error);
    console.log(`Deployed to http://ig.ft.com/${DEPLOY_TARGET}/`);
  });
});

// downloads the data from bertha to client/words.json
const SPREADSHEET_URL = `https://bertha.ig.ft.com/republish/publish/gss/${process.env.SPREADSHEET_KEY}/data`;
gulp.task('download-data', () => fetch(SPREADSHEET_URL)
  .then(res => res.json())
  .then(spreadsheet => {
    const words = {};

    for (const row of spreadsheet) {

      row.slug = slugify(row.word);

      if (words[row.slug]) throw new Error('Already exists: ' + row.slug);

      words[row.slug] = row;
    }

    let wordArray = Object.keys(words);

    let slugIndex = wordArray.sort();

    const sortedWords = {};

    for (const word of wordArray) {
      sortedWords[word] = words[word];
    }

    let monthNames = [
      "January", "February", "March",
      "April", "May", "June", "July",
      "August", "September", "October",
      "November", "December"
    ];

    for (const row of spreadsheet) {
      let currentSlug = slugify(row.word);

      words[currentSlug].relatedwords = words[currentSlug].relatedwords.map(relatedWord => ({
        slug: slugify(relatedWord),
        word: words[slugify(relatedWord)].word
      }));

      let slugPointer = null;

      if (slugIndex.indexOf(currentSlug) > 0) {
        slugPointer = slugIndex.indexOf(currentSlug) - 1;
      } else {
        slugPointer = slugIndex.length - 1;
      }

      words[currentSlug].previousWord = {
        slug: words[slugIndex[slugPointer]].slug,
        word: words[slugIndex[slugPointer]].word
      };

      if (slugIndex.indexOf(currentSlug) < slugIndex.length - 1) {
        slugPointer = slugIndex.indexOf(currentSlug) + 1;
      } else {
        slugPointer = 0;
      }

      words[currentSlug].nextWord = {
        slug: words[slugIndex[slugPointer]].slug,
        word: words[slugIndex[slugPointer]].word
      };

      words[currentSlug].showPerpetratorData = words[currentSlug].perpetrator
                                              || words[currentSlug].usagesource ? true : null;
      if(words[currentSlug].wordid) {
        words[currentSlug].wordid = words[currentSlug].wordid.substring(4,words[currentSlug].wordid.length);
      }

      let date = new Date(words[currentSlug].submissiondate);

      words[currentSlug].formatteddate = monthNames[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
    }

    fs.writeFileSync('client/words.json', JSON.stringify(sortedWords, null, 2));

    let dateIndex = wordArray.sort(function (a, b) {
      return new Date(words[b].submissiondate) - new Date(words[a].submissiondate);
    });

    const homewords = {};

    homewords[dateIndex[0]] = words[dateIndex[0]];

    let randomNumber = Math.floor(Math.random() * (dateIndex.length - 1)) + 1;
    homewords[dateIndex[randomNumber]] = words[dateIndex[randomNumber]];

    fs.writeFileSync('client/homewords.json', JSON.stringify(homewords, null, 2));
  })
);

gulp.task('templates', () => {
  Handlebars.registerPartial('top', fs.readFileSync('client/top.hbs', 'utf8'));
  Handlebars.registerPartial('bottom', fs.readFileSync('client/bottom.hbs', 'utf8'));

  const definitionPageTemplate = Handlebars.compile(fs.readFileSync('client/definition-page.hbs', 'utf8'));

  const words = JSON.parse(fs.readFileSync('client/words.json', 'utf8'));

  for (const slug of Object.keys(words)) {
    const word = words[slug];
    const definitionPageHtml = definitionPageTemplate({
      trackingEnv: (env === 'production' ? 'p' : 't'),
      page: "definition",
      word
    });

    mkdirp.sync(`.tmp/${slug}`);
    fs.writeFileSync(`.tmp/${slug}/index.html`, definitionPageHtml);
  }

  const homewords = JSON.parse(fs.readFileSync('client/homewords.json', 'utf8'));

  const mainPageTemplate = Handlebars.compile(fs.readFileSync('client/main-page.hbs', 'utf8'));
  const mainPageHtml = mainPageTemplate({
    trackingEnv: (env === 'production' ? 'p' : 't'),
    page: "main",
    homewords,
    words,
  });
  fs.writeFileSync(`.tmp/index.html`, mainPageHtml);

  const thanksPageTemplate = Handlebars.compile(fs.readFileSync('client/thanks-page.hbs', 'utf8'));
  const thanksPageHtml = thanksPageTemplate({
    trackingEnv: (env === 'production' ? 'p' : 't'),
    page: "thanks"
  })
  fs.writeFileSync(`.tmp/thanks.html`, thanksPageHtml);
});

gulp.task('create-rss-feed', ['download-data'], () => {

  const rssTitle = 'Guffipedia';
  const rssLink = 'http://ft.com/guff';
  const rssDescription = 'Lucy Kellaway’s dictionary of business jargon and corporate nonsense';

  const words = JSON.parse(fs.readFileSync('client/words.json', 'utf8'));

  let wordArray = Object.keys(words);
  let dateIndex = wordArray.sort(function (a, b) {
    return new Date(words[b].submissiondate) - new Date(words[a].submissiondate);
  });

  let rssString = `<?xml version="1.0"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${rssTitle}</title><link>${rssLink}</link><description>${rssDescription}</description>`;
  for (const word of dateIndex) {
    rssString += '<item>';
    rssString += `<title>${words[word].word}</title>`;
    rssString += `<link>http://ig.ft.com/sites/guffipedia/${words[word].slug}/</link>`;
    rssString += `<guid>http://ig.ft.com/sites/guffipedia/${words[word].slug}/</guid>`;
    if(words[word].definition) {
      let descriptionTemplate = Handlebars.compile('{{definition}}');
      let descriptionHtml = descriptionTemplate({definition: words[word].definition});
      rssString += `<description>${descriptionHtml}</description>`;
    }
    rssString += '</item>';
  }
  rssString += '</channel></rss>';

  fs.writeFileSync('rss.xml', rssString);

  gulp.src('rss.xml')
    .pipe(prettyData({type: 'prettify'}))
    .pipe(gulp.dest('.'));
});

// helpers
let preventNextReload; // hack to keep a BS error notification on the screen
function reload() {
  if (preventNextReload) {
    preventNextReload = false;
    return;
  }

  browserSync.reload();
}

function handleBuildError(headline, error) {
  if (env === 'development') {
    // show in the terminal
    $.util.log(headline, error && error.stack);

    // report it in browser sync
    let report = `<span style="color:red;font-weight:bold;font:bold 20px sans-serif">${headline}</span>`;
    if (error) report += `<pre style="text-align:left;max-width:800px">${ansiToHTML.toHtml(error.stack)}</pre>`;
    browserSync.notify(report, 60 * 60 * 1000);
    preventNextReload = true;

    // allow the sass/js task to end successfully, so the process can continue
    this.emit('end');
  }
  else throw error;
}
