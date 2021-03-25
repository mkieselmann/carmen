#!/usr/bin/env node
'use strict';
if (!process.argv[2]) {
    console.log('Usage: carmen.js [file|dir] --query="<query>"');
    process.exit(1);
}

const fs = require('fs');
const path = require('path');
const Carmen = require('..');
const settings = require('../package.json');
const argv = require('minimist')(process.argv, {
    string: ['config', 'proximity', 'query', 'debug', 'types', 'tokens'],
    boolean: ['geojson', 'stats', 'help', 'version', 'autocomplete', 'fuzzyMatch', 'routing'],
    default: {
        'autocomplete': true,
        'fuzzyMatch': true,
        'routing': false
    }
});

if (argv.help) {
    console.log('carmen.js --query="<query>" [options]');
    console.log('[options]:');
    console.log('  --version                    Print the carmen version');
    console.log('  --tokens=<tokens.json>       Load global token file');
    console.log('  --config=<file.js>           Load index config from js (module)');
    console.log('  --limit="{limit}"            Customize the number of results returned');
    console.log('  --proximity="lng,lat"        Favour results by proximity');
    console.log('  --types="{type},..."         Only return results of a given type');
    console.log('  --stacks="{stack},..."       Only return results of a given stack');
    console.log('  --geojson                    Return a geojson object');
    console.log('  --language={ISO code}        Return responses in specified language (if available in index)');
    console.log('  --stats                      Generate Stats on the query');
    console.log('  --debug="feat id"            Follows a feature through geocode"');
    console.log('  --reverseMode="{mode}"       Sort features in reverse queries by one of `score` or `distance`');
    console.log('  --languageMode="strict"      Only return results with text in a consistent script family');
    console.log('  --autocomplete="true"        Submit as an autocomplete query');
    console.log('  --fuzzyMatch="true"          Allow fuzzy matching');
    console.log('  --bbox="minX,minY,maxX,maxY" Limit results to those within the specified bounding box');
    console.log(' --routing=true                Return routable points, if possible');
    console.log('  --help                       Print this report');
    process.exit(0);
}

if (argv.version) {
    console.log('carmen@' + settings.version);
    process.exit(0);
}

if (!argv.query) throw new Error('--query argument required');

let opts = {};
let carmenConfig = {};
if (argv.config) {
    opts = require(path.resolve(argv.config));
    if (opts.config) {
        carmenConfig = opts.config;
        delete opts.config;
    }
} else if (argv._.length > 2) { // Given Tile Source
    const src = path.resolve(argv._[argv._.length - 1]);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        opts = Carmen.autodir(src);
    } else {
        opts[path.basename(src)] = Carmen.auto(src);
    }
} else { // Default Tile Source
    opts = Carmen.autodir(path.resolve(__dirname + '/../tiles'));
}

if (!carmenConfig.tokens) carmenConfig.tokens = {};
if (argv.tokens) {
    carmenConfig.tokens = require(path.resolve(argv.tokens));

    if (typeof carmenConfig.tokens === 'function') carmenConfig.tokens = carmenConfig.tokens();
}

const carmen = new Carmen(opts, carmenConfig);

if (argv.proximity) {
    if (argv.proximity.indexOf(',') === -1)
        throw new Error('Proximity must be LNG,LAT');
    argv.proximity = [Number(argv.proximity.split(',')[0]), Number(argv.proximity.split(',')[1])];
}

if (argv.bbox) {
    if (argv.bbox.split(',').length !== 4)
        throw new Error('bbox must be minX,minY,maxX,maxY');
    argv.bbox = [
        Number(argv.bbox.split(',')[0]),
        Number(argv.bbox.split(',')[1]),
        Number(argv.bbox.split(',')[2]),
        Number(argv.bbox.split(',')[3])
    ];
}

if (argv.types) {
    argv.types = argv.types.split(',');
}

if (argv.country) argv.stacks = argv.country;

if (argv.stacks) {
    argv.stacks = argv.stacks.split(',');
}

if (argv.debug) argv.debug = parseInt(argv.debug);

if (argv.limit) argv.limit = parseInt(argv.limit);

if (argv.reverseMode) {
    if (argv.reverseMode !== 'score' && argv.reverseMode !== 'distance') throw new Error('reverseMode must be one of `score` or `distance`');
}

let load = +new Date();

carmen.geocode(argv.query, {
    'limit': argv.limit,
    'stacks': argv.stacks,
    'types': argv.types,
    'proximity': argv.proximity,
    'debug': argv.debug,
    'stats': true,
    'language': argv.language,
    'indexes': true,
    'reverseMode': argv.reverseMode,
    'languageMode': argv.languageMode,
    'bbox': argv.bbox,
    'routing': argv.routing,
    'autocomplete': argv.autocomplete,
    'fuzzyMatch': argv.fuzzyMatch,
}, (err, data) => {
    if (err) throw err;
    load = +new Date() - load;
    if (data.features.length && !argv.geojson) {
        console.log('Tokens');
        console.log('------');
        console.log(data.query.join(', '));
        console.log('');
        console.log('Features');
        console.log('--------');
        data.features.forEach((f) => {
            console.log('- %s %s (%s)', f.relevance.toFixed(2), f.place_name, f.id);
        });
        console.log('');
        console.log('Indexes');
        console.log('--------');
        data.indexes.forEach((i) => {
            console.log('- %s', i);
        });
        console.log('');
    }
    if (data.features.length && argv.geojson) {
        console.log(JSON.stringify(data, null, 2));
    }

    if (argv.debug && data.debug) {
        console.log('Debug');
        console.log('=====');
        console.log('id:', data.debug.id);
        console.log('extid:', data.debug.extid);
        console.log();

        console.log('PhraseMatch');
        console.log('-----------');
        Object.keys(data.debug.phrasematch).forEach((idx) => {
            console.log('  ', idx, JSON.stringify(data.debug.phrasematch[idx]));
        });
        console.log();

        console.log('SpatialMatch');
        console.log('------------');
        console.log('spatialmatch position:', data.debug.spatialmatch_position);
        console.log(JSON.stringify(data.debug.spatialmatch, null, 2));
        console.log();

        console.log('VerifyMatch');
        console.log('-----------');
        console.log('verifymatch position:', data.debug.verifymatch_position);
        console.log(JSON.stringify(data.debug.verifymatch, null, 2));
        console.log();
    }
    else if (!data.debug)
        console.log('No debug information collected (is this a reverse query?)');

    if (!argv.stats) process.exit(0);
    console.log('Stats');
    console.log('-----');
    console.log('- warmup:       %sms', load);
    console.log('- phrasematch:  %sms', data.stats.phrasematch.time);
    console.log('- spatialmatch: %sms', data.stats.spatialmatch.time);
    console.log('- verifymatch:  %sms', data.stats.verifymatch.time);
    console.log('- totaltime:    %sms', data.stats.time);

    process.exit(0);
});
