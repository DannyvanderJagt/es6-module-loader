#! /usr/bin/env node
var program = require('commander');
var pkg = require('../package.json');
var ModuleLoader = require('../build/index.js');

program
    .version(pkg.version)
    .option('-r, --reverse', 'Reverse everything!')
    .parse(process.argv);

if(program.reverse){
    ModuleLoader.reverse();
}else{
    ModuleLoader.execute();
}
