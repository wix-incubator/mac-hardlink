#!/usr/bin/env node
const cp = require('child_process');
const fs = require('fs');
const _ = require('lodash');

const shouldShowHelp = _.includes(process.argv, '-h');
const unlinkOnly = _.includes(process.argv, '-u');
const source = process.argv[2];
const dest = process.argv[3];

let npmignoreLines = [];
const blacklist = ['node_modules', '.git', '.github', '.gradle', 'package.json', '.gitignore', '.npmignore', '.idea'];

function ensureHLN() {
  try {
    cp.execSync(`which hln`);
  } catch (e) {
    console.log('hln does not exists. installing...');
    cp.execSync(`brew install hardlink-osx`);
  }
}

function assertSourceExists() {
  if (!fs.existsSync(source)) {
    throw new Error(`${source} does not exist`);
  }
}

function ensureDestExists() {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
  }
}

function getNpmIgnore() {
  const npmignorePath = `${source}/.npmignore`;
  if (!fs.existsSync(npmignorePath)) {
    return [];
  }
  const content = _.trim(fs.readFileSync(npmignorePath));
  return _.split(content, '\n');
}

function shouldSkip(file) {
  return isDefaultSkip(file) || isInNpmIgnore(file);
}

function isDefaultSkip(file) {
  return _.includes(blacklist, file);
}

function isInNpmIgnore(file) {
  return _.find(npmignoreLines, (line) => {
    return file === line || fs.statSync(`${source}/${file}`).isDirectory() ? new RegExp(line).exec(`${file}/`) : new RegExp(line).exec(file);
  });
}

function execSilently(cmd) {
  cp.execSync(`${cmd} || true`, {stdio: ['ignore', 'ignore', 'ignore']});
}

function unhardlink(file) {
  execSilently(`hln -u ${file}`);
}

function hardlink(from, to) {
  cp.execSync(`hln ${from} ${to}`);
}

function hardlinkRecursively() {
  _.forEach(fs.readdirSync(source), (f) => {
    if (shouldSkip(f)) {
      return;
    }

    const srcFullPath = `${source}/${f}`;
    const destFullPath = `${dest}/${f}`;

    unhardlink(destFullPath);
    if (unlinkOnly) {
      console.log(`unlinking ${destFullPath}`);
      return;
    }

    execSilently(`rm -rf ${destFullPath}`);
    console.log(`hardlinking ${srcFullPath} to ${destFullPath}`);
    hardlink(srcFullPath, destFullPath);
  });
}

function showHelp() {
  console.log(`
  mac-hardlinks
  
    usage: 
        hardlink [src] [dest]   : link from src to dest
        hardlink [src] -u       : unlink src

`);
}

function run() {
  if (shouldShowHelp) {
    showHelp();
    return;
  }
  assertSourceExists();
  ensureHLN();
  if (!unlinkOnly) {
    ensureDestExists();
  }
  npmignoreLines = getNpmIgnore();
  hardlinkRecursively();
}

run();
