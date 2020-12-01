sfdx-npm
========

Install node modules into your packages and automatically remove duplicate modules across 2GP packages
using Salesforce DX.

[![Version](https://img.shields.io/npm/v/sfdx-npm.svg)](https://npmjs.org/package/sfdx-npm)
[![CircleCI](https://circleci.com/gh/LukeKoz/sfdx-npm/tree/master.svg?style=shield)](https://circleci.com/gh/LukeKoz/sfdx-npm/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/LukeKoz/sfdx-npm?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/sfdx-npm/branch/master)
[![Codecov](https://codecov.io/gh/LukeKoz/sfdx-npm/branch/master/graph/badge.svg)](https://codecov.io/gh/LukeKoz/sfdx-npm)
[![Greenkeeper](https://badges.greenkeeper.io/LukeKoz/sfdx-npm.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/LukeKoz/sfdx-npm/badge.svg)](https://snyk.io/test/github/LukeKoz/sfdx-npm)
[![Downloads/week](https://img.shields.io/npm/dw/sfdx-npm.svg)](https://npmjs.org/package/sfdx-npm)
[![License](https://img.shields.io/npm/l/sfdx-npm.svg)](https://github.com/LukeKoz/sfdx-npm/blob/master/package.json)

## Installation

This is an SFDX plugin. Install this plugin to your SFDX instance.

```
$ sfdx plugins:install sfdx-npm
```

## Setup

This works by installing packages into the directory where package.json exists and where you run the command in the current working
directory.

In the force-app directory, run the following to create a package.json file:

`$ npm init`

## Second Generation Packaging

For second generation packaging, you will have a folder for each package. Each folder should contain their own package.json file.
Follow the above instructions to create this file for each package.

When you install node modules, this plugin will identify other instances of node modules across the whole project and remove any
duplicates.

## Usage

To install a node module into your package, use the same parameters as `npm install`. Change the prefix to `sfdx npm:install`.

```
$ sfdx npm:install my-module --save
```


## Roadmap

- CLI command for `$ sfdx npm:version:match [package]`
- CLI command for `$ sfdx npm:module:clean`
