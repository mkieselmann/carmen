'use strict';
const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../lib/util/addfeature');

const conf = {
    address: new mem({ maxzoom: 6, geocoder_address: 1, geocoder_name:'address' }, () => {})
};
const c = new Carmen(conf);

tape('index address', (t) => {
    const address = {
        id:100,
        properties: {
            'carmen:text':'17th st',
            'carmen:center':[0,0],
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    queueFeature(conf.address, address, t.end);
});
tape('build queued features', (t) => {
    const q = queue();
    Object.keys(conf).forEach((c) => {
        q.defer((cb) => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('100 17th', (t) => {
    c.geocode('100 17th', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('100 17t', (t) => {
    c.geocode('100 17t', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('100 17', (t) => {
    c.geocode('100 17', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
