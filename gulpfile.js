// @ts-nocheck
'use strict'

const gulp = require('gulp')
const istanbul = require('gulp-istanbul')
const jshint = require('gulp-jshint')
const mocha = require('gulp-mocha')
const stylish = require('jshint-stylish')

const packageJSON = require('./package')

const jshintConfig = packageJSON.jshintConfig

gulp.task('lint', function () {
  return gulp
    .src(['./*.js', 'routes/**/*.js', 'test/**/*.js', 'controller/**/*.js'])
    .pipe(jshint(jshintConfig))
    .pipe(jshint.reporter(stylish))
})

gulp.task('unittest', function () {
  return gulp
    .src(['*.js', 'routes/**/*.js'])
    .pipe(istanbul()) // Covering files
    .pipe(istanbul.hookRequire()) // Force `require` to return covered files
    .on('finish', function () {
      gulp
        .src(['test/*.test.js'])
        .pipe(mocha({ reporter: 'nyan' }))
        .pipe(istanbul.writeReports())
    })
})

gulp.task('test', gulp.series('unittest'))

gulp.task('default', gulp.series('lint', 'test'))
