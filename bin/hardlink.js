#!/usr/bin/env node
const exec = require('shell-utils').exec;
const fs = require('fs');
const _ = require('lodash');
const p = require('path');

const shouldShowHelp = _.includes(process.argv, '-h');
const unlinkOnly = _.includes(process.argv, '-u');

const source = process.argv[2];
const dest = unlinkOnly ? source : process.argv[3];

let gitignoreLines = [];
const blacklist = ['node_modules', '.git', '.github', '.gradle', 'package.json', '.gitignore', '.npmignore', '.idea'];

function ensureHLN() {
  try {
    exec.execSync(`which hln`);
  } catch (e) {
    console.log('hln does not exists. installing...');
    exec.execSync(`brew install hardlink-osx`);
  }
}

function ensureDestExists() {
  if (!fs.existsSync(dest)) {
    exec.execSync(`mkdir -p ${dest}`);
  }
}

function getGitIgnore() {
  const gitignorePath = `${source}/.gitignore`;
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }
  const content = _.trim(fs.readFileSync(gitignorePath));
  return _.split(content, '\n');
}

function shouldSkip(file) {
  return isDefaultSkip(file) || isInGitIgnore(file);
}

function isDefaultSkip(file) {
  return _.includes(blacklist, file);
}

function isInGitIgnore(file) {
  return _.find(gitignoreLines, (line) => {
    return file === line || fs.statSync(`${source}/${file}`).isDirectory() ? new RegExp(line).exec(`${file}/`) : new RegExp(line).exec(file);
  });
}

function unhardlink(file) {
  exec.execSyncSilent(`hln -u ${file} || true`);
}

function hardlink(from, to) {
  exec.execSyncSilent(`hln ${from} ${to}`);
}

function hardlinkRecursively() {
  _.forEach(fs.readdirSync(source), (f) => {
    if (shouldSkip(f)) {
      return;
    }

    const srcFullPath = `${source}/${f}`;
    const destFullPath = `${dest}/${f}`;

    const rs = p.resolve(process.cwd(), srcFullPath);
    const rd = p.resolve(process.cwd(), destFullPath);
    if (_.includes(rd, rs)) { //avoid infinite recursion
      console.log(`skipping ${f}`);
      return;
    }

    unhardlink(destFullPath);
    if (unlinkOnly) {
      console.log(`unlinking ${f}`);
      return;
    }

    exec.execSyncSilent(`rm -rf ${destFullPath} || true`);
    console.log(`hardlinking ${f}`);
    hardlink(srcFullPath, destFullPath);
  });
}

function showHelp() {
  console.log(`
  mac-hardlinks
  
    usage: 
        hardlink [src] [dest]   : link from src to dest
        hardlink [dest] -u      : unlink dest

`);
}

function run() {
  if (shouldShowHelp) {
    showHelp();
    return;
  }
  if (!fs.existsSync(source)) {
    console.log(`hardlink: "${source}" does not exists`);
    return;
  }
  if (!unlinkOnly) {
    ensureDestExists();
  }
  ensureHLN();
  gitignoreLines = getGitIgnore();
  hardlinkRecursively();
}

run();
