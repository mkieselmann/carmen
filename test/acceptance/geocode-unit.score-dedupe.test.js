'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

const conf = {
    region: new mem({ maxzoom: 6 }, () => {}),
    place: new mem({ maxzoom: 6 }, () => {})
};
const c = new Carmen(conf);
tape('index data', (t) => {
    const q = queue(1);
    q.defer((cb) => queueFeature(
        conf.place,
        {
            id: 1,
            properties: {
                'carmen:text': 'fake place 1',
                'carmen:center': [0,0],
                'carmen:score': -1
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        },
        cb
    ));
    q.defer((cb) => queueFeature(
        conf.place,
        {
            id: 2,
            properties: {
                'carmen:text': 'fake place 1',
                'carmen:center': [0,1.01],
                'carmen:score': 1
            },
            geometry: {
                type: 'Point',
                coordinates: [0,1.01]
            }
        },
        cb
    ));
    q.defer((cb) => queueFeature(
        conf.place,
        {
            id: 3,
            properties: {
                'carmen:text': 'fake place',
                'carmen:center': [0,0],
                'carmen:score': 1
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        },
        cb
    ));
    q.defer((cb) => queueFeature(
        conf.region,
        {
            id: 10,
            properties: {
                'carmen:text': 'region',
                'carmen:center': [0,0],
                'carmen:score': 1
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]]
            }
        },
        cb
    ));

    q.defer((cb) => buildQueued(conf.place, () => buildQueued(conf.region, cb)));

    q.awaitAll(t.end);
});

tape('test deduping features with identical text preserving the feature with a higher score', (t) => {
    c.geocode('fake place 1', { limit_verify: 5 }, (err, res) => {
        t.error(err);
        t.equals(res.features.length, 2, 'returned two of the three features');
        t.equals(res.features[0].id, 'place.2', 'returned fake place 1 with id = place.2 (the higher-scored one)');
        t.equals(res.features[0].place_name, 'fake place 1', 'returned fake place 1 feature with a higher score');
        t.equals(res.features.filter((f) => f.id === 'place.1').length, 0, 'place.1 was deduped away and not returned');
        t.ifError(err);
        t.end();
    });
});

tape('test deduping features with identical text preserving the feature with a higher score', (t) => {
    c.geocode('fake place 1 region', { limit_verify: 5 }, (err, res) => {
        t.error(err);
        t.equals(
            res.features[0].id,
            'place.1',
            'ghost feature is not deduped away because it spatially aligns and non-ghost feature does not'
        );
        t.equals(res.features[0].relevance, 1, 'winning feature has full relevance');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
