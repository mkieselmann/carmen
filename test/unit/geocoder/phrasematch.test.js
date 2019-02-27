/* eslint-disable require-jsdoc */
'use strict';
const tape = require('tape');
const phrasematch = require('../../../lib/geocoder/phrasematch');
const termops = require('../../../lib/text-processing/termops');
const token = require('../../../lib/text-processing/token');

function bearablePermutations(permutations) {
    return permutations.map((v) => {
        return {
            phrase: Array.from(v[0]),
            mask: v[0].mask,
            ender: v[0].ender,
            endingType: v[1]
        };
    });
}

function fakeFuzzyMatches(permutations) {
    return bearablePermutations(permutations).map((v) => {
        return  [{
            phrase: v.phrase,
            edit_distance: 0,
            ending_type: v.endingType
        }];
    });
}

function fakeCarmen(reader) {
    return {
        geocoder_universal_text: true,
        complex_query_replacer: [],
        _geocoder: {
            freq: new Map()
        },
        _dictcache: { reader }
    };
}

tape('findMaskBounds', (t) => {
    const findMaskBounds = phrasematch.findMaskBounds;
    t.deepEqual(findMaskBounds(0b0001, 20), [0,0]);
    t.deepEqual(findMaskBounds(0b0011, 20), [0,1]);
    t.deepEqual(findMaskBounds(0b0111, 20), [0,2]);
    t.deepEqual(findMaskBounds(0b1111, 20), [0,3]);
    t.deepEqual(findMaskBounds(0b0010, 20), [1,1]);
    t.deepEqual(findMaskBounds(0b0110, 20), [1,2]);
    t.deepEqual(findMaskBounds(0b1110, 20), [1,3]);
    t.deepEqual(findMaskBounds(0b0100, 20), [2,2]);
    t.deepEqual(findMaskBounds(0b1100, 20), [2,3]);
    t.deepEqual(findMaskBounds(0b1000, 20), [3,3]);

    // Doesn't bridge gaps
    t.deepEqual(findMaskBounds(0b1001, 20), [0,0]);
    t.deepEqual(findMaskBounds(0b0101, 20), [0,0]);

    // No bits set in mask return non mask
    t.deepEqual(findMaskBounds(0b0000, 20), [-1, -1]);

    t.end();
});

tape('requiredMasks', (t) => {
    const requiredMasks = phrasematch.requiredMasks;
    t.deepEqual(requiredMasks({ owner: [0,1,2,3,4] }), [], 'No masks for unaltered ownership');

    t.deepEqual(requiredMasks({ owner: [0,0,1,2,3] }), [3], 'replaced into 2 tokens');
    t.deepEqual(requiredMasks({ owner: [0,0,0,1,2] }), [7], 'replaced into 3 tokens');
    t.deepEqual(requiredMasks({ owner: [0,1,1,2,3] }), [6], 'replaced into 2 tokens, offset from start');
    t.deepEqual(requiredMasks({ owner: [0,1,2,3,3] }), [24], 'replaced into 2 tokens, at end');
    t.deepEqual(requiredMasks({ owner: [0,0,0,1,1] }), [7,24], '2 replacement expanded tokens');

    // TODO decide what the behavior should be when tokens are removed.
    t.deepEqual(requiredMasks({ owner: [0,1,3,4,5] }), []);
    t.deepEqual(requiredMasks({ owner: [0,0,2,3,4] }), [3]);
    t.deepEqual(requiredMasks({ owner: [0,0,0,3,4] }), [7]);
    t.deepEqual(requiredMasks({ owner: [0,2,2,2,4] }), [14]);
    t.deepEqual(requiredMasks({ owner: [0,3,4,5,8] }), []);
    t.deepEqual(requiredMasks({ owner: [1,2,3,4,5] }), []);

    t.end();
});

tape('fuzzyMatchWindows', (t) => {
    let args;
    let envokedCnt = 0;
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            envokedCnt++;
            if (envokedCnt > 1) throw new Error('fuzzyMatchWindows called more than once');
            args = [a, b, c, d];
            return [];
        }
    });
    phrasematch(c, termops.tokenize('100 Main Street'), {}, (err, results, source) => {
        t.error(err);
        t.deepEqual(args, [['100', 'main', 'street'], 0, 0, 0]);
        t.end();
    });
});

tape('fuzzyMatchWindows - expanded tokens', (t) => {
    let envokedCnt = 0;
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            envokedCnt++;
            if (envokedCnt > 1) throw new Error('fuzzyMatchWindows called more than once');
            t.deepEqual(a, ['100', 'herman', 'str']);
            const expected = [
                { start_position: 0, phrase: ['100', 'herman', 'str'], edit_distance: 0, ending_type: 0 },
                { start_position: 0, phrase: ['100', 'herman'], edit_distance: 0, ending_type: 0 },
                { start_position: 1, phrase: ['herman', 'str'], edit_distance: 0, ending_type: 0 },
                { start_position: 1, phrase: ['herman'], edit_distance: 0, ending_type: 0 },
                { start_position: 2, phrase: ['str'], edit_distance: 0, ending_type: 0 },
                { start_position: 0, phrase: ['100'], edit_distance: 0, ending_type: 0 }
            ];
            return expected;
        }
    });
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from:'([^ ]+)(strasse|str|straße)',
            to: { text: '$1 str', regex: true, skipDiacriticStripping: true, spanBoundaries: 0 }
        }
    ]);
    phrasematch(c, termops.tokenize('100 hermanstrasse'), {}, (err, results, source) => {
        t.error(err);
        t.equal(results.phrasematches.length, 3);
        const expected = {
            '100 herman str': { mask: 3, weight: 1 },
            'herman str': { mask: 2, weight: 0.5 },
            '100': { mask: 1, weight: 0.5 },
        };
        results.phrasematches.forEach((v) => {
            t.equal(v.mask, expected[v.phrase].mask, `Correct mask for "${v.phrase}"`);
            t.equal(v.weight, expected[v.phrase].weight, `Correct weight for "${v.phrase}"`);
        });
        t.end();
    });
});

tape('fuzzyMatchMulti - correct address permutations', (t) => {
    let args;
    let envokedCnt = 0;
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            envokedCnt++;
            if (envokedCnt > 1) throw new Error('fuzzyMatchMulti called more than once');
            args = [a, b, c];
            const r = [];
            for (let i = 0; i < a.length; i++) r.push([]);
            return r;
        }
    });
    c.geocoder_address = true;

    phrasematch(c, termops.tokenize('100 Main Street'), {}, (err, results, source) => {
        t.error(err);
        const expected = [
            { phrase: ['100','main','street'], mask: 7, ender: true, endingType: 0 },
            { phrase: ['1##','main','street'], mask: 7, ender: true, endingType: 0 },
            { phrase: ['100','main'], mask: 3, ender: false, endingType: 0 },
            { phrase: ['main','street'], mask: 6, ender: true, endingType: 0 },
            { phrase: ['1##','main'], mask: 3, ender: false, endingType: 0 },
            { phrase: ['100'], mask: 1, ender: false, endingType: 0 },
            { phrase: ['main'], mask: 2, ender: false, endingType: 0 },
            { phrase: ['street'], mask: 4, ender: true, endingType: 0 },
            { phrase: ['1##'], mask: 1, ender: false, endingType: 0 }
        ];
        const actual = bearablePermutations(args[0]);
        t.deepEqual(actual, expected);
        t.end();
    });
});

tape('fuzzyMatchMulti - correct address permutations: all numbers', (t) => {
    let args;
    let envokedCnt = 0;
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            envokedCnt++;
            if (envokedCnt > 1) throw new Error('fuzzyMatchMulti called more than once');
            args = [a, b, c];
            const r = [];
            for (let i = 0; i < a.length; i++) r.push([]);
            return r;
        }
    });
    c.geocoder_address = true;

    phrasematch(c, termops.tokenize('100 200 300'), {}, (err, results, source) => {
        t.error(err);
        const expected = [
            { phrase: ['100', '200', '300'], mask: 7, ender: true, endingType: 0 },
            { phrase: ['3##', '100', '200'], mask: 7, ender: false, endingType: 0 },
            { phrase: ['1##', '200', '300'], mask: 7, ender: true, endingType: 0 },
            { phrase: ['3##', '200'], mask: 6, ender: false, endingType: 0 },
            { phrase: ['1##', '200'], mask: 3, ender: false, endingType: 0 },
            { phrase: ['2##', '300'], mask: 6, ender: true, endingType: 0 },
            { phrase: ['200', '300'], mask: 6, ender: true, endingType: 0 },
            { phrase: ['100', '200'], mask: 3, ender: false, endingType: 0 },
            { phrase: ['2##', '100'], mask: 3, ender: false, endingType: 0 },
            { phrase: ['1##'], mask: 1, ender: false, endingType: 0 },
            { phrase: ['300'], mask: 4, ender: true, endingType: 0 },
            { phrase: ['2##'], mask: 2, ender: false, endingType: 0 },
            { phrase: ['200'], mask: 2, ender: false, endingType: 0 },
            { phrase: ['100'], mask: 1, ender: false, endingType: 0 },
            { phrase: ['3##'], mask: 4, ender: true, endingType: 0 }
        ];
        const actual = bearablePermutations(args[0]);
        t.deepEqual(actual, expected);
        t.end();
    });
});

tape('fuzzyMatchMulti - single term', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['baltimore'], edit_distance: 0, ending_type: 0 }]
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;

    phrasematch(c, termops.tokenize('baltimore'), {}, (err, results, source) => {
        t.error(err);
        t.equal(results.phrasematches.length, 1);
        const expected = {
            'baltimore': { mask: 1, weight: 1 },
        };
        results.phrasematches.forEach((v) => {
            t.equal(v.mask, expected[v.phrase].mask, `Correct mask for "${v.phrase}"`);
            t.equal(v.weight, expected[v.phrase].weight, `Correct weight for "${v.phrase}"`);
        });
        t.end();
    });
});

tape('fuzzyMatchMulti - basic masks', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['100', 'main'], edit_distance: 0, ending_type: 0 }],
                [{ phrase: ['1##', 'main'], edit_distance: 0, ending_type: 0 }],
                [{ phrase: ['100'], edit_distance: 0, ending_type: 0 }],
                [{ phrase: ['main'], edit_distance: 0, ending_type: 0 }],
                [{ phrase: ['1##'], edit_distance: 0, ending_type: 0 }]
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;

    phrasematch(c, termops.tokenize('100 main'), {}, (err, results, source) => {
        t.error(err);
        t.equal(results.phrasematches.length, 5);
        const expected = {
            '1##': { mask: 1, weight: 0.5 },
            '100': { mask: 1, weight: 0.5 },
            'main': { mask: 2, weight: 0.5 },
            '100 main': { mask: 3, weight: 1 },
            '1## main': { mask: 3, weight: 1 }
        };
        results.phrasematches.forEach((v) => {
            t.equal(v.mask, expected[v.phrase].mask, `Correct mask for "${v.phrase}"`);
            t.equal(v.weight, expected[v.phrase].weight, `Correct weight for "${v.phrase}"`);
        });
        t.end();
    });
});

tape('fuzzyMatchMulti - masks for expanded terms', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['herman', 'str', '100'], edit_distance: 0, ending_type: 0 }],
                [{ phrase: ['1##', 'herman', 'str'], edit_distance: 0, ending_type: 0 }],
                [{ phrase: ['herman', 'str'], edit_distance: 0, ending_type: 0 }],
                [{ phrase: ['100'], edit_distance: 0, ending_type: 0 }],
                [{ phrase: ['1##'], edit_distance: 0, ending_type: 0 }]
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from:'([^ ]+)(strasse|str|straße)',
            to: { text: '$1 str', regex: true, skipDiacriticStripping: true, spanBoundaries: 0 }
        }
    ]);

    phrasematch(c, termops.tokenize('hermanstrasse 100'), {}, (err, results, source) => {
        t.error(err);
        t.equal(results.phrasematches.length, 5);
        const expected = {
            'herman str 100': { mask: 3, weight: 1 },
            '1## herman str': { mask: 3, weight: 1 },
            'herman str': { mask: 1, weight: 0.5 },
            '100': { mask: 2, weight: 0.5 },
            '1##': { mask: 2, weight: 0.5 },
        };
        results.phrasematches.forEach((v) => {
            t.equal(v.mask, expected[v.phrase].mask, `Correct mask for "${v.phrase}"`);
            t.equal(v.weight, expected[v.phrase].weight, `Correct weight for "${v.phrase}"`);
        });
        t.end();
    });
});
