/* eslint-disable require-jsdoc */
'use strict';
const test = require('tape');
const proximity = require('../../../lib/util/proximity');

const minScore = -1;
const maxScore = 1634443;
const ZOOM_LEVELS = {
    address: 14,
    poi: 14,
    neighborhood: 12,
    locality: 12,
    place: 12,
    region: 6,
    district: 9,
    country: 6
};

function compareScoreDist(a, b) {
    return b.properties['carmen:scoredist'] - a.properties['carmen:scoredist'];
}

function calculateScoreDist(input) {
    for (let k = 0; k < input.length; k++) {
        const feat = input[k];
        feat.properties['carmen:scoredist'] = parseFloat(proximity.scoredist(
            feat.properties['carmen:score'],
            minScore,
            maxScore,
            feat.properties['carmen:distance'],
            feat.properties['carmen:zoom'],
            feat.properties['carmen:proximity_radius'],
            feat.properties['carmen:types'] ? feat.properties['carmen:types'][0] : null
        ).toFixed(6));
    }
}

test('scoredist', (t) => {

    t.test('new york near san francisco', (t) => {
        // --query="new york" --proximity="-122.4234,37.7715"
        const input = [
            { properties: { 'carmen:text': 'New York,NY,NYC,New York City', 'carmen:distance': 2567.3550038898834, 'carmen:score': 31104, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'New Yorker Buffalo Wings', 'carmen:distance': 0.6450163846417221, 'carmen:score': 3, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { properties: { 'carmen:text': 'New York Frankfurter Co.', 'carmen:distance': 0.4914344651849769, 'carmen:score': 1, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { properties: { 'carmen:text': 'New York,NY', 'carmen:distance': 2426.866703400975, 'carmen:score': 79161, 'carmen:zoom': ZOOM_LEVELS.region } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'New York,NY', 'carmen:distance': 2426.866703400975, 'carmen:score': 79161, 'carmen:zoom': ZOOM_LEVELS.region, 'carmen:scoredist': 25.168365 } },
            { properties: { 'carmen:text': 'New York,NY,NYC,New York City', 'carmen:distance': 2567.3550038898834, 'carmen:score': 31104, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 10.496437 } },
            { properties: { 'carmen:text': 'New Yorker Buffalo Wings', 'carmen:distance': 0.6450163846417221, 'carmen:score': 3, 'carmen:zoom': ZOOM_LEVELS.poi, 'carmen:scoredist': 10.008055 } },
            { properties: { 'carmen:text': 'New York Frankfurter Co.', 'carmen:distance': 0.4914344651849769, 'carmen:score': 1, 'carmen:zoom': ZOOM_LEVELS.poi, 'carmen:scoredist': 10.003694  } }
        ];

        calculateScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('chicago near san francisco', (t) => {
        // --query="chicago" --proximity="-122.4234,37.7715"
        const input = [
            { properties: { 'carmen:text': 'Chicago', 'carmen:distance': 1855.8900334142313, 'carmen:score': 16988, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Chicago Title', 'carmen:distance': 0.14084037845690478, 'carmen:score': 2, 'carmen:zoom': ZOOM_LEVELS.poi } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Chicago Title', 'carmen:distance': 0.14084037845690478, 'carmen:score': 2, 'carmen:zoom': ZOOM_LEVELS.poi, 'carmen:scoredist': 10.008961 } },
            { properties: { 'carmen:text': 'Chicago', 'carmen:distance': 1855.8900334142313, 'carmen:score': 16988, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 6.186786 } }
        ];

        calculateScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('san near north sonoma county', (t) => {
        // --query="san" --proximity="-123.0167,38.7471"
        const input = [
            { properties: { 'carmen:text': 'Santa Cruz', 'carmen:distance': 133.8263938095184, 'carmen:score': 587, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'São Paulo', 'carmen:distance': 6547.831697209755, 'carmen:score': 36433, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', 'carmen:distance': 6023.053777668511, 'carmen:score': 26709, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'San Francisco', 'carmen:distance': 74.24466022598429, 'carmen:score': 8015, 'carmen:zoom': ZOOM_LEVELS.place } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'San Francisco', 'carmen:distance': 74.24466022598429, 'carmen:score': 8015, 'carmen:zoom': 12, 'carmen:scoredist': 29.62751 } },
            { properties: { 'carmen:text': 'São Paulo', 'carmen:distance': 6547.831697209755, 'carmen:score': 36433, 'carmen:zoom': 12, 'carmen:scoredist': 12.123395 } },
            { properties: { 'carmen:text': 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', 'carmen:distance': 6023.053777668511, 'carmen:score': 26709, 'carmen:zoom': 12, 'carmen:scoredist': 9.154632 } },
            { properties: { 'carmen:text': 'Santa Cruz', 'carmen:distance': 133.8263938095184, 'carmen:score': 587, 'carmen:zoom': 12, 'carmen:scoredist': 7.293636 } }
        ];
        calculateScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('santa cruz near sonoma county', (t) => {
        // --query="santa cruz" --proximity="-123.0167,38.7471"
        const input = [
            { properties: { 'carmen:text': 'Santa Cruz', 'carmen:distance': 133.8263938095184, 'carmen:score': 587, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Santa Cruz de Tenerife', 'carmen:distance': 5811.283048403849, 'carmen:score': 3456, 'carmen:zoom': ZOOM_LEVELS.place } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Santa Cruz', 'carmen:distance': 133.8263938095184, 'carmen:score': 587, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 7.293636 } },
            { properties: { 'carmen:text': 'Santa Cruz de Tenerife', 'carmen:distance': 5811.283048403849, 'carmen:score': 3456, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 2.055431 } }
        ];

        calculateScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('washington near baltimore', (t) => {
        // --query="washington" --proximity="-76.6035,39.3008"
        const input = [
            { properties: { 'carmen:text': 'Washington,DC', 'carmen:distance': 34.81595024835296, 'carmen:score': 7400, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Washington,WA', 'carmen:distance': 2256.6130314083157, 'carmen:score': 33373, 'carmen:zoom': ZOOM_LEVELS.region } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Washington,DC', 'carmen:distance': 34.81595024835296, 'carmen:score': 7400, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 31.520181 } },
            { properties: { 'carmen:text': 'Washington,WA', 'carmen:distance': 2256.6130314083157, 'carmen:score': 33373, 'carmen:zoom': ZOOM_LEVELS.region, 'carmen:scoredist': 11.189172 } }
        ];

        calculateScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('gilmour ave near guelph, on, canada', (t) => {
        // --query="gilmour ave" --proximity="-80.1617,43.4963"
        const input = [
            { properties: { 'carmen:text': 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', 'carmen:distance': 36.12228253928214, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address } },
            { properties: { 'carmen:text': 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', 'carmen:distance': 188.29482550861198, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address } },
            { properties: { 'carmen:text': 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', 'carmen:distance': 246.29759329605977, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address } },
            { properties: { 'carmen:text': 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', 'carmen:distance': 3312.294287119006, 'carmen:score': 3, 'carmen:zoom': ZOOM_LEVELS.address } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', 'carmen:distance': 36.12228253928214, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address, 'carmen:scoredist': 3.118235 } },
            { properties: { 'carmen:text': 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', 'carmen:distance': 3312.294287119006, 'carmen:score': 3, 'carmen:zoom': ZOOM_LEVELS.address, 'carmen:scoredist': 1.001221 } },
            { properties: { 'carmen:text': 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', 'carmen:distance': 188.29482550861198, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address, 'carmen:scoredist': 1.000305 } },
            { properties: { 'carmen:text': 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', 'carmen:distance': 246.29759329605977, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address, 'carmen:scoredist': 1.000305 } }
        ];

        calculateScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('cambridge near guelph, on, canada', (t) => {
        // --query="cambridge" --proximity="-80.1617,43.4963"
        const input = [
            { properties: { 'carmen:text': 'Cambridge, N1R 6A9, Ontario, Canada, CA', 'carmen:distance': 10.73122383596493, 'carmen:score': 294, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Cambridge, 02139, Massachusetts, United States', 'carmen:distance': 464.50390088754625, 'carmen:score': 986, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Cambridgeshire, United Kingdom', 'carmen:distance': 3566.2969841802374, 'carmen:score': 2721, 'carmen:zoom': ZOOM_LEVELS.place } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Cambridge, N1R 6A9, Ontario, Canada, CA', 'carmen:distance': 10.73122383596493, 'carmen:score': 294, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 10.8659 } },
            { properties: { 'carmen:text': 'Cambridgeshire, United Kingdom', 'carmen:distance': 3566.2969841802374, 'carmen:score': 2721, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 1.831034 }  },
            { properties: { 'carmen:text': 'Cambridge, 02139, Massachusetts, United States', 'carmen:distance': 464.50390088754625, 'carmen:score': 986, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 1.316536 } }
        ];

        calculateScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('oakland near oakland neighborhood, MD', (t) => {
        // --query="Oakland" --proximity="-76.83984375000489,36.043528125844574"
        const input = [
            { properties: { 'carmen:text': 'Oakland, District Heights, Maryland 20747, United States', 'carmen:distance': 262.6196672182887, 'carmen:score': 23, 'carmen:zoom': ZOOM_LEVELS.neighborhood, 'carmen:types': ['neighborhood']  } },
            { properties: { 'carmen:text': 'Oakland, California, United States', 'carmen:distance': 2487.507511918706, 'carmen:score': 2190, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:types': ['place'] } },
        ];

        const expected = [
            { properties: { 'carmen:text': 'Oakland, California, United States', 'carmen:distance': 2487.507511918706, 'carmen:score': 2190, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:types': ['place'], 'carmen:scoredist': 1.668918 } },
            { properties: { 'carmen:text': 'Oakland, District Heights, Maryland 20747, United States', 'carmen:distance': 262.6196672182887, 'carmen:score': 23, 'carmen:zoom': ZOOM_LEVELS.neighborhood, 'carmen:types': ['neighborhood'], 'carmen:scoredist': 1.007327 } }
        ];

        calculateScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('united states near washington dc', (t) => {
        // --query="United States" --proximity="-77.03361679999999,38.900039899999996"
        const input = [
            { properties: { 'carmen:text': 'United States of America, United States, America, USA, US', 'carmen:distance': 1117.3906777683906, 'carmen:score': 1634443, 'carmen:zoom': ZOOM_LEVELS.country  } },
            { properties: { 'carmen:text': 'United States Department of Treasury Annex', 'carmen:distance': 0.11774815645353183, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
        ];

        const expected = [
            { properties: { 'carmen:text': 'United States of America, United States, America, USA, US', 'carmen:distance': 1117.3906777683906, 'carmen:score': 1634443, 'carmen:zoom': ZOOM_LEVELS.country, 'carmen:scoredist': 562.681655 } },
            { properties: { 'carmen:text': 'United States Department of Treasury Annex', 'carmen:distance': 0.11774815645353183, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi, 'carmen:scoredist': 10.002915 } }
        ];

        calculateScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('missi near mission neighborhood san francisco', (t) => {
        // --query="missi" --proximity="-122.4213562,37.75234222"
        const input = [
            { id: 14, properties: { 'carmen:text': 'Mission District', 'carmen:distance': 0.641155642372423, 'carmen:score': -1, 'carmen:zoom': ZOOM_LEVELS.neighborhood } },
            { id: 2, properties: { 'carmen:text': 'Mission Terrace', 'carmen:distance': 2.0543295828567985, 'carmen:score': 50, 'carmen:zoom': ZOOM_LEVELS.neighborhood } },
            { id: 1, properties: { 'carmen:text': 'Mission', 'carmen:distance': 0.5365405586195869, 'carmen:score': 609, 'carmen:zoom': ZOOM_LEVELS.neighborhood } },
            { id: 3, properties: { 'carmen:text': 'Mission Bay', 'carmen:distance': 2.083206525530076, 'carmen:score': 46, 'carmen:zoom': ZOOM_LEVELS.neighborhood } },
            { id: 15, properties: { 'carmen:text': 'Mission Dolores', 'carmen:distance': 0.8734705397622807, 'carmen:score': -1, 'carmen:zoom': ZOOM_LEVELS.neighborhood } },
            { id: 8, properties: { 'carmen:text': 'Mission Branch Library', 'carmen:distance': 0.09171422623336412, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 12, properties: { 'carmen:text': 'Mission Tires & Service Center', 'carmen:distance': 0.41252770420569307, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 13, properties: { 'carmen:text': 'Mission Dental Care', 'carmen:distance': 0.47809299593103194, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 5, properties: { 'carmen:text': 'Mission Pie,cafe, coffee, tea, tea house', 'carmen:distance': 0.20888191032358838, 'carmen:score': 3, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 6, properties: { 'carmen:text': 'Mission\'s Kitchen,fast food', 'carmen:distance': 0.1618230166173522, 'carmen:score': 1, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 11, properties: { 'carmen:text': 'Mission Gastroclub', 'carmen:distance': 0.3514533005726089, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 18, properties: { 'carmen:text': 'Mission Skateboards', 'carmen:distance': 1.4633504101693179, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 7, properties: { 'carmen:text': 'Mission Cultural Center for Latino Arts,college, university', 'carmen:distance': 0.18621060494099984, 'carmen:score': 1, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 10, properties: { 'carmen:text': 'Mission Critter', 'carmen:distance': 0.24892887064676822, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 9, properties: { 'carmen:text': 'Mission Wishing Tree', 'carmen:distance': 0.10633212084221495, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 20, properties: { 'carmen:text': 'Mississippi', 'carmen:distance': 1873.3273481255542, 'carmen:score': 17955, 'carmen:zoom': ZOOM_LEVELS.region } },
            { id: 19, properties: { 'carmen:text': 'Mission Bay Mobile Home Park', 'carmen:distance': 15.112097493445267, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.neighborhood } },
            { id: 4, properties: { 'carmen:text': 'Mission-Foothill', 'carmen:distance': 19.97574371302543, 'carmen:score': 44, 'carmen:zoom': ZOOM_LEVELS.neighborhood } },
            { id: 16, properties: { 'carmen:text': 'Mission Workshop,bicycle, bike, cycle', 'carmen:distance': 0.821663496329208, 'carmen:score': 1, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { id: 17, properties: { 'carmen:text': 'Mission Pet Hospital', 'carmen:distance': 0.6281933184839765, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
        ];

        calculateScoreDist(input);
        input.sort(compareScoreDist);
        for (let i = 0; i < input.length; i++) {
            const feat = input[i];
            t.equal(i + 1, feat.id, `${feat.properties['carmen:text']}`);
        }
        t.end();
    });

    t.test('jfk airport near Yonkers', (t) => {
        // -- query="JFK" --proximity="-73.8987,40.9312"
        // Withouth the proximity radius, JFK Marina would have the highest scoredist, since it's much closer to the proximity point in Yonkers, NY
        const input = [
            { 'id': 2, 'properties': { 'carmen:text': 'JFK Marina', 'carmen:distance': 1.5874323231313108, 'carmen:score': 2, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { 'id': 1, 'properties': { 'carmen:text': 'JFK Airport', 'carmen:distance': 20.869597236876366, 'carmen:score': 323, 'carmen:zoom': ZOOM_LEVELS.poi, 'carmen:proximity_radius': 1000 } },
            { 'id': 3, 'properties': { 'carmen:text': 'JFK Fried Chicken', 'carmen:distance': 8.337828979299953, 'carmen:score':  0, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { 'id': 4, 'properties': { 'carmen:text': 'JFK Memorial Library', 'carmen:distance': 12.372310018772831, 'carmen:score': 1, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { 'id': 5, 'properties': { 'carmen:text': 'JFK Liquors', 'carmen:distance': 16.226635859349628, 'carmen:score': 6, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { 'id': 6, 'properties': { 'carmen:text': 'JFK AirTrain', 'carmen:distance': 16.721436332089933, 'carmen:score': 10, 'carmen:zoom': ZOOM_LEVELS.poi } }
        ];

        calculateScoreDist(input);
        input.sort(compareScoreDist);
        for (let i = 0; i < input.length; i++) {
            const feat = input[i];
            t.equal(i + 1, feat.id, `${feat.properties['carmen:text']}`);
        }
        t.end();
    });
    t.end();
});

test('scoreWeight', (t) => {
    const minScore = 0;
    const maxScore = 1000;
    t.equal(proximity.scoreWeight(0, minScore, maxScore), 1, 'score minScore => scoreWeight 1');
    t.equal(proximity.scoreWeight((maxScore - minScore) * 0.5, minScore, maxScore), 250.5, ' score of midpoint => scoreWeight 500.5');
    t.equal(proximity.scoreWeight(maxScore, minScore, maxScore), 500, 'score maxScore => scoreWeight 500');
    t.end();
});

test('distWeight', (t) => {
    t.equal(parseFloat(proximity.distWeight(400, 14).toFixed(4)), 1, 'dist 4x > scaleRadius => distWeight ~1');
    t.equal(parseFloat(proximity.distWeight(100, 14).toFixed(4)), 1.0001, 'dist = scaleRadius => distWeight ~1.0001');
    t.equal(proximity.distWeight(25, 14).toFixed(4), '5.5000', 'dist 1/4 scaleRadius => distWeight ~5.5');
    t.equal(proximity.distWeight(25, 12, null, 'neighborhood').toFixed(4), '5.5000', 'distWeight accepts type for radius override');
    t.equal(proximity.distWeight(0, 14), 10, 'dist 0 => distWeight 10');
    t.end();
});

test('scaleRadius', (t) => {
    t.equal(proximity.scaleRadius(6), 1800, 'zoom 6 radius 1800 miles');
    t.equal(proximity.scaleRadius(12), 600, 'zoom 12 radius 600 miles');
    t.equal(proximity.scaleRadius(14), 100, 'zoom 14 radius 100 miles');
    t.equal(proximity.scaleRadius(12, 'neighborhood'), 100, 'neighborhood radius 100 miles');
    t.equal(proximity.scaleRadius(12, 'locality'), 100, 'locality radius 100 miles');
    t.equal(proximity.scaleRadius(12, 'place'), 600, 'place defaults to zoom 12 radius 600 miles');
    t.equal(proximity.scaleRadius(14, 'address'), 100, 'address defaults to zoom 14 radius 100 miles');
    t.end();
});

test('gauss', (t) => {
    const scale = 0.75; // normalized distance
    const decay = 0.5; // gauss score
    const distVariance = proximity.variance(scale, decay);
    t.equal(proximity.gauss(0, distVariance), 1, 'normalized distance 0 => gauss 1');
    t.equal(proximity.gauss(scale, distVariance), decay, 'normalized distance 0.75 => gauss 0.5');
    t.equal(parseFloat(proximity.gauss(1, distVariance).toFixed(4)), 0.2916, 'normalized distance 1 => gauss ~0.29');
    t.equal(proximity.gauss(0.01, distVariance, 0.025), 1, 'normalized distance < offset => gauss 1');
    t.end();
});

test('variance', (t) => {
    t.throws(() => {
        proximity.variance(0.5, 0);
    }, Error, 'throws on decay of 0');
    // the larger the variance, the more spread out the curve is
    t.equal(parseFloat(proximity.variance(0.75, 0.5).toFixed(4)), 0.4058, 'scale 0.75, decay 0.5 => variance 0.4058');
    t.equal(parseFloat(proximity.variance(0.5, 0.5).toFixed(4)), 0.1803, 'scale 0.5, decay 0.5 => variance 0.1803');
    t.equal(parseFloat(proximity.variance(0.25, 0.5).toFixed(4)), 0.0451, 'scale 0.25, decay 0.5 => variance 0.0451');
    t.end();
});
