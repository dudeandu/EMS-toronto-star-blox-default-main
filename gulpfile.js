"use strict";

// SET THESE VARIABLES

const projectPath = "bloxtemplate" //example: climatechange
const macroName = "seaBloxTemplate()" // example: seaClimateChangeSvalbard()

// END SET THESE VARIABLES

//https://gist.github.com/jeromecoupe/0b807b0c1050647eb340360902c3203a
//https://css-tricks.com/gulp-for-beginners/
// Load plugins
const autoprefixer = require("autoprefixer");
const {
    Blob
} = require('buffer');

// Polyfill File for environments (e.g. Node 18) that don't expose it globally
if (typeof File === 'undefined') {
    global.File = class File extends Blob {
        constructor(bits, name, opts = {}) {
            super(bits, opts);
            this.name = name;
            this.lastModified = opts.lastModified || Date.now();
        }
        get[Symbol.toStringTag]() {
            return 'File';
        }
    };
}
const sourcemaps = require('gulp-sourcemaps');
const browsersync = require("browser-sync").create();
const cssnano = require("cssnano");
const del = require("del");
const gulp = require("gulp");
const {
    transform
} = require('gulp-html-transform');
const path = require('path');
const srcset = require('gulp-srcset').default;
const newer = require("gulp-newer");
const plumber = require("gulp-plumber");
const postcss = require("gulp-postcss");
const rename = require("gulp-rename");
const sass = require("gulp-sass")(require("sass"));
const fileinclude = require('gulp-file-include');
const useref = require('gulp-useref');
const terser = require('gulp-terser');
const gulpIf = require('gulp-if');
const purgecss = require('gulp-purgecss')
const imageminPngquant = require('imagemin-pngquant')
const urlPrefixer = require('gulp-url-prefixer');
const htmlmin = require('gulp-htmlmin');
const replace = require('gulp-replace');
const mergeStream = require('merge-stream');

const responsiveWidths = [2480, 1920, 1280, 1024, 860, 540, 320];

const handleError = (task) => function(err) {
    console.error(`[${task}]`, err && err.message ? err.message : err);
    if (this && typeof this.emit === 'function') {
        this.emit('end');
    }
};

// Attach plumber (swallow-and-continue error handling) only while watching.
// In one-shot builds `watching` is false, so errors propagate normally and
// gulp marks the task — and the whole build — as errored with a non-zero exit.
const applyPlumber = (stream, task) =>
    watching ? stream.pipe(plumber({ errorHandler: handleError(task) })) : stream;

const buildSrcsetString = (src, widths = responsiveWidths) => {
    const ext = path.extname(src);
    if (!ext) return '';
    const base = src.slice(0, -ext.length);
    return widths.map((width) => `${base}-${width}w${ext} ${width}w`).join(', ');
};

const applySrcsetTransform = async ($) => {
    const setSizesAttr = ($el) => {
        const dataSizes = $el.attr('data-sizes');
        if (dataSizes) {
            $el.attr('sizes', dataSizes);
        }
    };

    $('img[data-src]').each((_, el) => {
        const $el = $(el);
        const dataSrc = $el.attr('data-src');
        if (!dataSrc) return;

        const srcset = buildSrcsetString(dataSrc);
        if (srcset) {
            $el.attr('srcset', srcset);
        }

        $el.attr('src', dataSrc);
        setSizesAttr($el);
    });

    $('source[data-src]').each((_, el) => {
        const $el = $(el);
        const dataSrc = $el.attr('data-src');
        if (!dataSrc) return;

        const srcset = buildSrcsetString(dataSrc);
        if (srcset) {
            $el.attr('srcset', srcset);
        }

        setSizesAttr($el);
    });
};



const liveImagePrefix = '[% compImgPath %]';
const liveCssPrefix = 'https://projects-images.thestar.com/' + projectPath + '/images';
// const liveJsPrefix = './libraries/flex/components/torstar_special_articles/resources/scripts/' + projectPath + "/";
const liveJsPrefix = '"+compImgPath+"';


const devPrefix = 'https://qa4.thestar.com/content/dam/thestar/special_articles/toronto-zoning/'


// Remove unused css
// be careful when using this. Always check that the page is still working properly at all breakpoints and especially for classes that are added via javascript
function purge() {
    return gulp.src('dist/css/main.css')
        .pipe(purgecss({
            content: ['dist/*.html'],
            safelist: ["ls-is-cached", "lazyloaded", "lazyload", "active"] //Add tags to whitelist here
            // alternativly comment out css in the css file using /*! purgecss start ignore */ CSS YOU DON'T WANT TO PURGE HERE /*! purgecss end ignore */
        }))
        .pipe(gulp.dest('dist/css'))
    // .pipe(rename({ suffix: ".min" }))
}


//  fileInclude
function html() {
    return applyPlumber(gulp.src(['app/index.html', 'app/graphics/*.html'], { base: 'app' }), 'html')
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(transform(applySrcsetTransform))
        .pipe(gulp.dest('dist/'));
}


// BrowserSync
function browserSync(done) {
    browsersync.init({
        server: {
            baseDir: "dist/",

        },
        port: 8080,
        // proxy: 'http://127.0.0.1:8080/dist/',
        //online: false,
        reloadDelay: 1000,
        reloadDebounce: 1000,
        injectChanges: false
    });
    done();
}

// BrowserSync Reload
function browserSyncReload(done) {
    browsersync.reload();
    done();
}

// Clean assets
function clean() {
    // return del(["dist/"]);
    return del(['dist/**/*', '!dist/images']);
}

// Clean assets
function fullClean() {
    // return del(["dist/"]);
    return del(['dist/']);
}

// Global configuration for all images
var resimgconfig = {
    // Use progressive (interlace) scan for JPEG and PNG output
    progressive: true,
    // Strip all metadata
    withMetadata: false,
    errorOnEnlargement: false,
    withoutEnlargement: true, // copy original file with/without renaming
    skipOnEnlargement: false
};

// Moves everything in the image folder. optimizing if nessisary
function moveImages() {
    return gulp
        .src("app/images/**/*")
        .pipe(newer("dist/images"))
        // .pipe(
        //     imagemin([
        //         imagemin.gifsicle({ interlaced: true }),
        //         imagemin.mozjpeg({ progressive: true }),
        //         imagemin.optipng({ optimizationLevel: 5 }),
        //         imagemin.svgo({
        //             plugins: [{
        //                 removeViewBox: false,
        //                 collapseGroups: true
        //             }]
        //         })
        //     ])
        // )
        .pipe(gulp.dest("dist/images"));
}

// Resizes and optimizes jpg and png images
function resizeImages() {
    //npmjs.com/package/gulp-srcset/v/1.0.1?activeTab=readme
    // gulp.src("app/images/*.{jpg,JPG,jpeg,JPEG}")
    // if you want all images even in subfolders
    const jpgWebp = gulp.src("app/images/**/*.{jpg,JPG,jpeg,JPEG}")
        .pipe(srcset([{
            width: [2480, 1920, 1280, 1024, 860, 540, 320],
            format: ['jpg', 'webp']
        }], {
            skipOptimization: true,
            postfix: function postfix(width, mul) {
                return mul === 1 ? '' : `-${width}w`;
            },
            processing: {
                webp: {
                    quality: 90
                },
                jpg: {
                    quality: 70
                }
            }
        }))
        .pipe(gulp.dest("dist/images"));


    // gulp.src("app/images/*.{png,PNG}")
    // if you want all images even in subfolders
    const pngWebp = gulp.src("app/images/**/*.{png,PNG}")
        .pipe(srcset([{
            width: [2480, 1920, 1280, 1024, 860, 540, 320],
            format: ['png', 'webp']
        }], {
            skipOptimization: true,
            postfix: function postfix(width, mul) {
                return mul === 1 ? '' : `-${width}w`;
            },
            processing: {
                webp: {
                    quality: 80
                },
                png: {
                    quality: 20
                }
            },
            optimization: {
                png: imageminPngquant({
                    quality: [0.5, 0.8]
                })
            }
        }))
        .pipe(gulp.dest("dist/images"));

    return mergeStream(jpgWebp, pngWebp);
}



// function images(cb) {
//   [1000, 2000].forEach(function (size) {
//     gulp.src('src/images/**/*.{jpg,jpeg,png}')
//       .pipe(imageResize({ width: size }))
//       .pipe(rename(function (path) { path.basename = `${path.basename}@${size}w`; }))
//       .pipe(imagemin())
//       .pipe(gulp.dest('dist/images'))
//   });
//   cb();
// }

// CSS task
function css() {
    return gulp
        .src("app/scss/**/*.scss")
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: "expanded"
        }))
        .pipe(postcss([autoprefixer(), cssnano()]))
        .pipe(gulpIf(env != 'live', sourcemaps.write('.')))
        // .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest("dist/css/"))
        .pipe(browsersync.stream());
}

// Direct copy js
function copyScripts() {
    return (
        gulp
        .src(["app/js/**/*"])
        .pipe(plumber())
        .pipe(gulp.dest("dist/js/"))

    );
}

function copyModulesScripts() {
    return (
        // Copies the modules folder
        gulp
        .src(["app/js/modules/**/*"])
        .pipe(plumber())
        .pipe(gulp.dest("dist/js/modules"))
    );
}

function copyGraphicsHtml() {
    return applyPlumber(gulp.src('app/graphics/*.html', { base: 'app' }), 'copyGraphicsHtml')
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(gulp.dest('dist/'));
}

// Transpile, concatenate and minify scripts
function scripts() {
    return (
        applyPlumber(gulp.src('app/index.html'), 'scripts')
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(useref())
        // Minifies only if it's a JavaScript file
        .pipe(gulpIf('*.js', terser()))
        .pipe(gulp.dest('dist/'))
    );
}


// Transpile, concatenate and minify scripts
function scriptsLive() {
    return (
        applyPlumber(gulp.src('app/index-live.html'), 'scriptsLive')
        .pipe(rename("index.html"))
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(useref())
        // Minifies only if it's a JavaScript file
        .pipe(gulpIf('*.js', terser()))
        .pipe(gulp.dest('dist/'))
    );
}

function addSrcset() {
    return applyPlumber(gulp.src('dist/index.html'), 'addSrcset')
        // Only remove tags (keep content) for non-live builds
        // For live builds, prefixHTMLLive will remove both tags and content
        .pipe(gulpIf(env !== 'live', replace(/\{\/?hideInBlox\}/g, "")))
        .pipe(transform(applySrcsetTransform))
        .pipe(gulp.dest('dist/'))
}

// // Transpile, concatenate and minify scripts
// function scripts() {
//   return (
//     gulp
//       .src(["app/js/**/*"])
//       .pipe(plumber())
//       .pipe(webpackstream(webpackconfig, webpack))
//       // folder only, filename is specified in webpack config
//       .pipe(gulp.dest("dist/js/"))
//       .pipe(browsersync.stream())
//   );
// }

//Add url prefix for live
function prefixHTMLLive() {
    return gulp.src('dist/index.html')
        .pipe(urlPrefixer.html({
            prefix: liveImagePrefix,
            attrs: ['href', 'src', 'data-src', 'data-srcset', 'srcset', 'content', 'data-vid-src', 'style', 'poster'],
            tags: ['link', 'a', 'img', 'embed', 'source', 'video', 'track'],
            splitOn: ','
        }))
        .pipe(replace(liveImagePrefix + "/images", liveImagePrefix))
        // Handle script tags separately - replace js path with [% compJSPath %] for non-external files
        .pipe(replace(/<script([^>]*)\ssrc="(?!https?:\/\/)js\/(.*?)"([^>]*)>/g, '<script$1 src="[% compJSPath %]/$2"$3>'))
        .pipe(replace("$$seaPath$$", projectPath))
        .pipe(replace("$$macroName$$", macroName))
        .pipe(replace(/{hideInBlox}([\s\S]*?){\/hideInBlox}/g, ""))
        .pipe(replace(/^<html[^>]*><head><\/head><body>/, ""))
        .pipe(replace(/<\/body><\/html>\s*$/, ""))

        .pipe(gulp.dest('dist/'))
}

function prefixCSSLive() {

    return gulp.src('dist/**/*.{css,less}')
        .pipe(urlPrefixer.css({
            prefix: liveCssPrefix,
        }))
        .pipe(replace(liveCssPrefix + "/images", liveCssPrefix))
        .pipe(gulp.dest('dist/'))
}

function prefixJSLive() {

    return gulp.src('dist/js/script.min.js')
        .pipe(urlPrefixer.js({
            prefix: liveJsPrefix,
            placeholderFuncName: 'imagePath'
        }))
        .pipe(gulp.dest('dist/js/'))
}

//Add url prefix for dev
function prefixHTMLDev() {
    return gulp.src('dist/index.html')
        .pipe(urlPrefixer.html({
            prefix: devPrefix,
            attrs: ['href', 'src', 'data-src', 'data-srcset', 'srcset', 'content'],
            tags: ['script', 'link', 'a', 'img', 'embed', 'source', 'video', 'track'],
            splitOn: ','
        }))
        .pipe(gulp.dest('dist/'))

}

function prefixCSSDev() {

    return gulp.src('dist/**/*.{css,less}')
        .pipe(urlPrefixer.css({
            prefix: devPrefix,
        }))
        .pipe(gulp.dest('dist/'))

}

function prefixJSDev() {

    //not in use

    return gulp.src('dist/**/*.js')
        .pipe(urlPrefixer.js({
            prefix: devPrefix,
            placeholderFuncName: 'imagePath'
        }))
        .pipe(gulp.dest('dist/'))

}

//removes uri for local js
function localURI() {
    const js = gulp.src('dist/js/script.min.js')
        .pipe(urlPrefixer.js({
            prefix: liveJsPrefix,
            placeholderFuncName: 'imagePath'
        }))
        .pipe(gulp.dest('dist/js/'))

    //   gulp.src('dist/js/script.min.js')
    //     .pipe(urlPrefixer.js({
    //         prefix: '.',
    //         placeholderFuncName: 'imagePath'
    //     }))
    //     .pipe(gulp.dest('dist/js/'))

    const html = gulp.src('dist/index.html')
        .pipe(replace("{projectPath}", projectPath))
        .pipe(replace("[% paywallStart() %]", "<div id='blox-paywall'>"))
        .pipe(replace("[% subContentStart(); %]", "<div id='blox-subcontent'>"))
        .pipe(replace("[% subContentStop(); %]", "</div>"))
        .pipe(replace("[% paywallEnd(); %]", "</div>"))
        .pipe(gulp.dest('dist/'))

    return mergeStream(js, html);
}

function minifyHTML() {
    return gulp.src('dist/*.html')
        .pipe(htmlmin({
            // collapseWhitespace: true,
            // preserveLineBreaks: true,
            removeComments: true,
            caseSensitive: true,
            includeAutoGeneratedTags: false,
            // removeRedundantAttributes: true,
            // sortClassName: true,
            // collapseWhitespace: true,
            // minifyCSS: true,
            // minifyJS: true,
            // collapseInlineTagWhitespace: true
        }))
        .pipe(gulpIf(env == 'live', rename(projectPath + '.utl')))
        .pipe(gulp.dest('dist'))
};


// Watch files
function watchFiles() {
    gulp.watch("app/scss/**/*", css, localURI);
    gulp.watch("app/js/**/*", gulp.series(js, localURI, browserSyncReload));

    gulp.watch(
        [
            "app/*.html",
        ],
        gulp.series(css, js, localURI, browserSyncReload)
    );
    gulp.watch("app/images/**/*", images, localURI);
}

let env = process.env.NODE_ENV || 'dev';

let watching = false;
function setWatching(done) {
    watching = true;
    done();
}

function setLive(done) {
    env = "live"
    done()
}

// define complex tasks
const js = gulp.series(scripts, copyModulesScripts, copyGraphicsHtml, addSrcset);
const jsLive = gulp.series(scriptsLive, copyModulesScripts, addSrcset);
const images = gulp.parallel(moveImages, resizeImages);
const rebuild = gulp.series(fullClean, gulp.parallel(css, images, js), localURI);
const build = gulp.series(clean, gulp.parallel(css, images, js), localURI);
const quick = gulp.series(clean, gulp.parallel(css, js), localURI);
const buildDirect = gulp.series(clean, html, gulp.parallel(css, images, copyScripts));
const watch = gulp.series(setWatching, quick, gulp.parallel(watchFiles, browserSync));
// const buildLive = gulp.series(clean, gulp.parallel(css, images, js), gulp.series(prefixHTMLLive,prefixCSSLive,prefixJSLive));
const compile = gulp.parallel(css, images, js);
const compileLive = gulp.parallel(css, images, jsLive);


// https://stackoverflow.com/questions/70869994/using-gulp-series-to-run-two-tasks-sequentially-isnt-working-as-expected
const addLivePrefix = gulp.series(prefixCSSLive, prefixJSLive, prefixHTMLLive);
const buildLive = gulp.series(setLive, clean, compileLive, addLivePrefix, minifyHTML);

const addDevPrefix = gulp.series(prefixCSSDev, prefixJSDev, prefixHTMLDev);
const buildDev = gulp.series(clean, compile, addDevPrefix, minifyHTML);

const prefixLive = gulp.series(prefixCSSLive, prefixJSLive, prefixHTMLLive);
// export tasks
// Remove unused css
// be careful when using this. Always check that the page is still working properly at all breakpoints and especially for classes that are added via javascript
exports.purge = purge;
// Minifiy HTML (remove comments)
exports.minifyHTML = minifyHTML;
// Compress images
exports.images = images;
// Compile Sass
exports.css = css;
// Transpile, concatenate and minify scripts
exports.js = js;
// Deletes all files from output directory except images (fullClean deletes images)
exports.clean = clean;
// Preforms clean then builds images, css and js
exports.build = build;
// Deletes everything including images then builds the project again. Slower than build
exports.rebuild = rebuild;
// Instead of proccessing and minifying js this just copys it. Usefull if you are getting js errors
exports.buildDirect = buildDirect;
// Watches for changes in the files and syncs to default browser
exports.watch = watch;
// default gulp preforms a build
exports.quick = quick;
// Final for dev build
exports.buildDev = buildDev;
// Final for live build
exports.buildLive = buildLive;
// everything in build except images
exports.default = build;

exports.prefixLive = prefixLive;
