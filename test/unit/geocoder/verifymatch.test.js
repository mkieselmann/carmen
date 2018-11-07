'use strict';
const verifymatch = require('../../../lib/geocoder/verifymatch');
const tape = require('tape');
const bigAddress = require('../../fixtures/bigaddress.json');

tape('verifymatch.sortFeature', (t) => {
    t.test('generic features', (t) => {
        const input = [
            { id: 11, properties: { 'carmen:spatialmatch': { relev: 0.9 }, 'carmen:address': null } },
            { id: 10, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': null } },
            { id: 9, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26' }, geometry: { omitted: true } },
            { id: 8, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': -1 }, geometry: {} },
            { id: 7, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 2 }, geometry: {} },
            { id: 6, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 3 }, geometry: {} },
            { id: 5, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 4, 'carmen:position': 2 }, geometry: {} },
            { id: 4, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 5, 'carmen:position': 1 }, geometry: {} },
            { id: 3, properties: { 'carmen:relevance': 0.6, 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 5, 'carmen:position': 1 }, geometry: {} },
            { id: 2, properties: { 'carmen:relevance': 0.99, 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': null, 'carmen:scoredist': 5, 'carmen:position': 1 }, geometry: {} },
            { id: 1, properties: { 'carmen:relevance': 1.0, 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 5, 'carmen:position': 1 }, geometry: {} }
        ];
        input.sort(verifymatch.sortFeature);
        t.deepEqual(input.map((f) => { return f.id; }), [1,2,3,4,5,6,7,8,9,10,11]);

        t.end();
    });
    t.test('planet granite test case', (t) => {

        const input = [
            { id: 8, properties: { 'carmen:text': 'Planetal', 'carmen:spatialmatch': { relev: 1 }, 'carmen:scoredist': 1, 'carmen:relevance': 0.6 } },
            { id: 1, properties: { 'carmen:text': 'Planet Granite', 'carmen:spatialmatch': { relev: 0.96 }, 'carmen:scoredist': 10.999139, 'carmen:relevance': 0.6093304633333333 } },
            { id: 2, properties: { 'carmen:text': 'Planet Fitness,gym, fitness center', 'carmen:spatialmatch': { relev: 0.96 }, 'carmen:scoredist': 10.916823, 'carmen:relevance': 0.6090560766666666 } },
            { id: 3, properties: { 'carmen:text': 'Planet Fitness', 'carmen:spatialmatch': { relev: 0.96 }, 'carmen:scoredist': 10.895406, 'carmen:relevance': 0.6089846866666666 } },
            { id: 4, properties: { 'carmen:text': 'Planet Fitness', 'carmen:spatialmatch': { relev: 0.96 }, 'carmen:scoredist': 10.881766, 'carmen:relevance': 0.60893922 } },
            { id: 5, properties: { 'carmen:text': 'Planet Fitness', 'carmen:spatialmatch': { relev: 0.96 }, 'carmen:scoredist': 10.828728, 'carmen:relevance': 0.6087624266666666 } },
            { id: 6, properties: { 'carmen:text': 'Planet Thai', 'carmen:spatialmatch': { relev: 0.96 }, 'carmen:scoredist': 10.774937, 'carmen:relevance': 0.6085831233333333 } },
            { id: 7, properties: { 'carmen:text': 'Planet Street', 'carmen:spatialmatch': { relev: 0.96 }, 'carmen:scoredist': 10.999999, 'carmen:relevance': 0.60333333, 'carmen:address': null } }
        ];

        input.sort(verifymatch.sortFeature);
        t.deepEqual(input.map((f) => { return f.id; }), [1,2,3,4,5,6,7,8]);
        t.end();
    });
});

tape('verifymatch.sortContext (no distance)', (t) => {
    let c;
    const arr = [];

    c = [{ id: 10, properties: {} }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 9, properties: { 'carmen:address': '26' } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 8, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: { omitted: true } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 7, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 6, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 1 }, geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 5, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, _geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 4, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 2;
    arr.push(c);

    c = [{ id: 3, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    c._distance = 20;
    arr.push(c);

    c = [{ id: 2, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    c._distance = 10;
    arr.push(c);

    c = [{ id: 1, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2, 'carmen:position': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 0, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2, 'carmen:position': 1 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    t.deepEqual(arr.map((c) => { return c[0].id; }), [0,1,2,3,4,5,6,7,8,9,10]);

    t.end();
});

tape('verifymatch.sortContext (with distance)', (t) => {
    let c;
    const arr = [];

    c = [{ id: 6 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 5, properties: { 'carmen:address': '26' } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 4, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: { omitted: true } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 3, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 2;
    arr.push(c);

    c = [{ id: 2, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 1 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 1, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    t.deepEqual(arr.map((c) => { return c[0].id; }), [1,2,3,4,5,6]);

    t.end();
});

tape('verifymatch.sortContext (distance vs addresstype)', (t) => {
    let c;
    const arr = [];

    c = [{ id: 3 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 2, properties: { 'carmen:address': '26', 'carmen:scoredist': 1, 'carmen:addressnumber': [] } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 1, properties: { 'carmen:address': '26', 'carmen:scoredist': 2 } }];
    c._relevance = 1.0;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    t.deepEqual(arr.map((c) => { return c[0].id; }), [1,2,3]);

    t.end();
});

tape('verifymatch.verifyFeatures', (t) => {
    const doc = bigAddress;
    const query = ['9', 'stationsplein'];
    const spatialmatches = [{ 'relev':1,'covers':[{ 'x':33,'y':21,'relev':1,'id':558998,'idx':0,'tmpid':558998,'distance':0,'score':19,'scoredist':19,'scorefactor':19,'matches_language':true,'prefix':true,'mask':3,'text':'# stationsplein','zoom':6 }] }];
    const geocoder = {
        byidx: {
            0: {
                geocoder_address: true
            }
        }
    };
    doc.properties['carmen:addressnumber'] = [doc.properties['carmen:addressnumber']];
    doc.geometry = {
        type: 'GeometryCollection',
        geometries: [
            doc.geometry
        ]
    };
    doc.properties['carmen:types'] = ['address'];
    const filtered = verifymatch.verifyFeatures(query, geocoder, spatialmatches, [doc], {});
    t.ok(filtered.length <= 10, 'limit dupe address numbers to 10');
    t.end();

});
