// Ensures that we don't autocomplete token-replaced terms to the beginning of other words

'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

(() => {
    const conf = {
        poi: new mem({
            maxzoom: 6,
            geocoder_tokens: { 'District': 'Dt' }
        }, () => {}),
    };
    const c = new Carmen(conf);

    tape('index poi', (assert) => {
        const pois = [
            {
                id:1,
                properties: {
                    'carmen:text': 'DTOWN PARTY BUS',
                    'carmen:center': [0,0]
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[0,0]]
                }
            },
            {
                id:2,
                properties: {
                    'carmen:text': 'District',
                    'carmen:center': [1,0]
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[1,0]]
                }
            },
            {
                id:3,
                properties: {
                    'carmen:text': 'District Taco',
                    'carmen:center': [0,1]
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[0,1]]
                }
            }
        ];
        queueFeature(conf.poi, pois, assert.end);
    });

    tape('build', (assert) => { buildQueued(conf.poi, assert.end); });

    tape('Search "District"', (assert) => {
        c.geocode('District', { autocomplete: true }, (err, res) => {
            assert.ifError(err);
            assert.equal(res.features.length, 2, 'Don\'t return features where the token-replaced query is the beginning of another word');
            assert.deepEqual(res.features[0].place_name, 'District', 'Return features that exactly match the token-replaced query');
            assert.deepEqual(res.features[1].place_name, 'District Taco', 'Return features that autocomplete with a word boundary');
            assert.end();
        });
    });

    tape('Search "dt"', (assert) => {
        c.geocode('dt', { autocomplete: true }, (err, res) => {
            assert.ifError(err);
            assert.equal(res.features.length, 3, 'Return all features for a query of "dt" matching both abbreviated district and prefix-matching dtown');
            assert.end();
        });
    });

    tape('Search "dt "', (assert) => {
        c.geocode('dt ', { autocomplete: true }, (err, res) => {
            assert.ifError(err);
            assert.equal(res.features.length, 2, 'With terminal space, only match full-word version, not dtown');
            assert.deepEqual(res.features.map((feat) => feat.id), ['poi.2', 'poi.3'], 'Omit dtown party bus');

            c.geocode('dt/', { autocomplete: true }, (err, slashRes) => {
                assert.ifError(err);
                assert.deepEqual(res, slashRes, 'whitespace and other boundaries behave the same');
                assert.end();
            });
        });
    });
})();


tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
