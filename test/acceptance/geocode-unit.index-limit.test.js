'use strict';
// Test that up to 256 indexes are supported.

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

/*
 * Test that adding the maximum number of indexes does not cause an overflow in tmpid
*/
const conf = {};
for (let i = 0; i < 255; i++) {
    conf['country' + i] = new mem({ maxzoom: 6, geocoder_name:'country' }, () => {});
}
conf['place'] = new mem({ maxzoom: 6, geocoder_name:'place' }, () => {});

const c = new Carmen(conf);
tape('index place', (t) => {
    t.deepEqual(Object.keys(conf).length, 256, '256 indexes configured');
    queueFeature(conf.place, {
        id:1,
        properties: {
            'carmen:text':'Chicago',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});

tape('index country', (t) => {
    const q = queue();
    for (let i = 0; i < 255; i++) {
        q.defer((cb) => {
            queueFeature(conf['country' + i], {
                id:1,
                properties: {
                    'carmen:text':'USA',
                    'carmen:zxy':['6/32/32'],
                    'carmen:center':[0,0]
                }
            }, cb);
        });
    }
    q.awaitAll(t.end);
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
tape('query place', (t) => {
    c.geocode('Chicago', { limit_verify: 1, debug: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.debug.spatialmatch.covers[0].tmpid, (255 * 2 ** 24) + 1, 'tmpid does not overflow');
        t.equals(res.debug.spatialmatch.covers[0].tmpid, res.debug.verifymatch[0].properties['carmen:tmpid'], 'tmpids consistent across phases');
        t.equals(res.features[0].place_name, 'Chicago, USA', 'found Chicago');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});
tape('reverse place', (t) => {
    c.geocode('0,0', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'Chicago, USA', 'found Chicago');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

/*
 * Test that there are no tmpid collisions from querying all 256 indexes
*/
const collisonConf = {};
for (let i = 0; i < 256; i++) {
    collisonConf['country' + i] = new mem({ maxzoom: 6, geocoder_name:'country' }, () => {});
}

const collisonCarmen = new Carmen(collisonConf);

tape('index country', (t) => {
    const q = queue();
    for (let i = 0; i < 256; i++) {
        q.defer((cb) => {
            queueFeature(collisonConf['country' + i], {
                id:1,
                properties: {
                    'carmen:text':'country' + i + '_', // the _ is added to differentiate every index name and prevent prefix matches
                    'carmen:zxy':['6/32/32'],
                    'carmen:center':[0,0]
                }
            }, cb);
        });
    }
    q.awaitAll(t.end);
});

tape('build queued features', (t) => {
    const q = queue();
    Object.keys(collisonConf).forEach((c) => {
        q.defer((cb) => {
            buildQueued(collisonConf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('tmpid collision', async(t) => {
    const tmpIdCount = {};
    const geocodePromiseArray = [];

    for (let i = 0; i < 256; i++) {
        geocodePromiseArray.push(new Promise((resolve,reject) => {
            collisonCarmen.geocode('country' + i + '_', { limit_verify: 1, debug: 1 }, (err, res) => {
                if (err) return reject(err);
                const spatialMatchTempId = res.debug.spatialmatch.covers[0].tmpid;
                t.equals(spatialMatchTempId, (i * 2 ** 24) + 1, 'tmpid does not overflow');
                t.equals(spatialMatchTempId, res.debug.verifymatch[0].properties['carmen:tmpid'], 'tmpids consistent across phases');
                t.equals(res.features[0].place_name, 'country' + i + '_', 'found place');
                t.equals(res.features[0].relevance, 1.00);
                tmpIdCount[spatialMatchTempId] = tmpIdCount[spatialMatchTempId] ? tmpIdCount[spatialMatchTempId] + 1 : 1;
                if (tmpIdCount[spatialMatchTempId] > 1) {
                    return reject('country' + i + '_' + ' tmpid has a collision');
                }
                return resolve();
            });
        }));
    }

    await Promise.all(geocodePromiseArray);
    t.equals(Object.keys(tmpIdCount).length, 256, '256 indexes geocoded');
    t.end();
});

/*
 * Test that a tmpid overflow occurs when using more than the maximum number of indexes
*/
const conf2 = {};
for (let i = 0; i < 256; i++) {
    conf2['country' + i] = new mem({ maxzoom: 6, geocoder_name:'country' }, () => {});
}
conf2['place'] = new mem({ maxzoom: 6, geocoder_name:'place' }, () => {});

const c2 = new Carmen(conf2);
tape('index place', (t) => {
    t.deepEqual(Object.keys(conf2).length, 257, '257 indexes configured');
    queueFeature(conf2.place, {
        id:1,
        properties: {
            'carmen:text':'Chicago',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});

tape('index country', (t) => {
    const q = queue();
    for (let i = 0; i < 256; i++) {
        q.defer((cb) => {
            queueFeature(conf2['country' + i], {
                id:1,
                properties: {
                    'carmen:text':'USA',
                    'carmen:zxy':['6/32/32'],
                    'carmen:center':[0,0]
                }
            }, cb);
        });
    }
    q.awaitAll(t.end);
});

tape('build queued features', (t) => {
    const q = queue();
    Object.keys(conf2).forEach((c2) => {
        q.defer((cb) => {
            buildQueued(conf2[c2], cb);
        });
    });
    q.awaitAll(t.end);
});
tape('query place', (t) => {
    c2.geocode('Chicago', { limit_verify: 1, debug: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.debug.spatialmatch.covers[0].tmpid, 1, 'tmpid overflows');
        t.equals(res.debug.spatialmatch.covers[0].tmpid, res.debug.verifymatch[0].properties['carmen:tmpid'], 'tmpids consistent across phases');
        t.equals(res.features[0].place_name, 'Chicago, USA', 'found Chicago');
        t.equals(res.features[0].relevance, 1.00);
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
