'use strict';

const gulp     				= require('gulp'),
			sassSyntax      = require('gulp-sass'),
			cleanCSS        = require('gulp-clean-css'),
			rename          = require('gulp-rename'),
			autoprefixer    = require('gulp-autoprefixer'),
			browserSync     = require('browser-sync'),
			notify          = require("gulp-notify"),
			concat         	= require('gulp-concat'),
			uglify         	= require('gulp-uglify'),
			htmlmin 				= require('gulp-html-minifier'),
			strip 					= require('gulp-strip-comments'),
			imagemin       	= require('gulp-imagemin'),
			cache         	= require('gulp-cache'),
			del            	= require('del'),
			svgSprite 			= require('gulp-svg-sprite'),
			svgmin   				= require('gulp-svgmin'),
			cheerio   			= require('gulp-cheerio'),
			replace   			= require('gulp-replace'),
			svgstore 				= require('gulp-svgstore'),
			filter 					= require('gulp-filter'),
			cfg            	= require('./package.json').config;


/**
* Таск 'gulp'
*
* Таск наблюдает за изменеием файлов scss, js и html. Функции watch и  серия
* последовательных функций scss, js, server работают  паралельно.
*
* Функция watch() наблюдает за изменением фалов.
*
* Функция scss() минифицирует scss в main.min.css и сохраняет в папке src/css.
*
* Функция js() минифицирует scripts.min.js и сохраняет в папке src/js.
*
* Функция server() разворачивает сервер browser Sync, который реагирует на
* изменения файлов scss, js, html.
*
*/

exports.default = gulp.parallel(watch, gulp.series(scss, js, server));


/**
* Таск 'gulp build'
*
* Таск cоздает новую папку dist, выполняет заданные функции и перемещает
* файлы функций. Функции выполняются последовательно.
*
* Функиця remove() зачищает папку dist, если она есть.
*
* Файлы scss, js, html - минифицируются соответствующими функциями scss(),
* js(), html() как main.min.css, scripts.min.js, index.html.
*
* Функция build перемещает папку fonts и миницифированные файлы css, js
*
* Функция image() перемещает все картинки в папке image и favicon в папку
* dist.
*
* Функция sprite() перемещает все svg файлы в один спрайт sprite.svg. После
* перемещает в папку dist.
*
* Файлы svg перемещаются в спрайт командой "gulp spritesvg" или
* "gulp svgstore".
*
*/

exports.build = gulp.series(remove, gulp.series(scss, js, html, build, image, sprite));


/**
* Таск 'gulp clearcache'
*
* Таск очишает кэш всех плагинов gulp.
*
*/

exports.clearcache = clearcache;


/**
* Таск 'gulp spritesvg'
*
* Таск  создает спрайт sprite.svg в папке src/img/ и перемещает  все
* svg файлы с папки src/img/svg
*
*/

exports.spritesvg = spritesvg;


/**
* Таск 'gulp storesvg'
*
* Таск  создает спрайт sprite.svg в папке src/img/ и перемещает  все
* svg файлы с папки src/img/svg
*
* Необходимо раскоментировать в js() svg4everybody.min.js
*
*/

exports.storesvg = storesvg;


function server(cb) {
	browserSync({
		server: {
			baseDir: './src'
		},
		notify: false,
	});
	cb();
}

function scss(cb) {
	return gulp.src(cfg.src.scss + '/main.scss')
	.pipe(sassSyntax().on("error", notify.onError()))
	.pipe(rename({suffix: '.min', prefix : ''}))
	.pipe(autoprefixer(['last 15 versions']))
	.pipe(cleanCSS()) // Optionally, comment out when debugging
	.pipe(gulp.dest(cfg.src.css))
	.pipe(browserSync.reload({stream: true}));
	cb();
}

function watch() {
	gulp.watch(cfg.src.scss + '/**/*.scss', { delay: 500 }, gulp.series(scss));
	gulp.watch('src/js/scripts.js', { delay: 500 }, gulp.series(js));
	gulp.watch(cfg.src.home + '*.html', { delay: 500 }, browserSync.reload);
}

function js(cb) {
	return gulp.src([
		//'src/libs/svg4everybody/svg4everybody.min.js',
		'src/js/scripts.js',
	])
	.pipe(concat('scripts.min.js'))
	.pipe(uglify())
	.pipe(gulp.dest('src/js'))
	.pipe(browserSync.reload({stream: true}));
	cb();
}

function html(cb) {
  return gulp.src(cfg.src.home + 'index.html')
    .pipe(strip())	// clean comments
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest(cfg.build.home));
		cb();
}

function image(cb) {
	return gulp.src(cfg.src.img + '/**/*')
	.pipe(filter(
		['src/img/images/**/*', 'src/img/favicon/**/*']
	))
	.pipe(cache(imagemin()))
	.pipe(gulp.dest(cfg.build.img));
	cb();
}

function sprite(cb) {
	return gulp.src(cfg.src.img + '/sprite.svg')
	.pipe(gulp.dest(cfg.build.img));
	cb();
}

function build(cb) {
	gulp.src('*.htaccess').pipe(gulp.dest('dist'));
	gulp.src(cfg.src.fonts + '/**/*').pipe(gulp.dest('dist/fonts'));
	gulp.src(cfg.src.css + '/main.min.css').pipe(gulp.dest('dist/css'));
	gulp.src(cfg.src.js + '/scripts.min.js').pipe(gulp.dest('dist/js'));
	cb();
}

function remove(cb) {
	 del.sync(cfg.build.home, {dryRun: true});
	 cb();
 }

function clearcache(cb) {
	 return cache.clearAll();
	 cb();
 }

function spritesvg(cb) {
	return gulp.src('src/img/svg/*.svg')
	// minify svg
		.pipe(svgmin({
			js2svg: {
				pretty: true
			}
		}))
		// remove all fill, style and stroke declarations in out shapes
		.pipe(cheerio({
			run: function ($) {
				$('[fill]').removeAttr('fill');
				$('[stroke]').removeAttr('stroke');
				$('[style]').removeAttr('style');
				$('style').remove();
			},
			parserOptions: {xmlMode: true}
		}))
		// cheerio plugin create unnecessary string '&gt;', so replace it.
		.pipe(replace('&gt;', '>'))
		// build svg sprite
		.pipe(svgSprite({
			mode: {
				symbol: {
					sprite: "../sprite.svg",
					render: {
						scss: {
							dest:'../../libs/svg4everybody/_sprite.scss',
							template: "src/libs/svg4everybody/templates/_sprite_template.scss"
						}
					}
				}
			}
		}))
		.pipe(gulp.dest('src/img/'));
		cb();
}

function storesvg(cb) {
	return gulp
		.src('src/img/svg/*.svg')
		// minify svg
		.pipe(svgmin({
			js2svg: {
				pretty: true
			}
		}))
		// remove all fill, style and stroke declarations in out shapes
		.pipe(cheerio({
			run: function ($) {
				$('[fill]').removeAttr('fill');
				$('[stroke]').removeAttr('stroke');
				$('[style]').removeAttr('style');
			},
			parserOptions: {xmlMode: true}
		}))
		.pipe(svgstore())
		.pipe(rename({basename: 'sprite'}))
		.pipe(gulp.dest('src/img'));
		cb();
}
