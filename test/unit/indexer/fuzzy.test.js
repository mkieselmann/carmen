'use strict';
const tape = require('tape');
const tmpdir = require('os').tmpdir();
const carmenCore = require('@mapbox/carmen-core');

tape('create', (t) => {
    const dict = new carmenCore.FuzzyPhraseSetBuilder(tmpdir);
    t.ok(dict, 'FuzzyPhraseSetBuilder built');
    t.end();
});

tape('fuzzyPhraseSet lookup', (t) => {
    const dict = new carmenCore.FuzzyPhraseSetBuilder(tmpdir);

    dict.insert(['the', 'quick', 'brown', 'fox', 'jumped', 'over', 'the', 'lazy', 'dog']);
    dict.finish();

    const set = new carmenCore.FuzzyPhraseSet(tmpdir);
    t.equal(set.contains(['the', 'quick', 'dog'], carmenCore.ENDING_TYPE.nonPrefix), false);
    t.equal(set.contains(['not', 'in', 'set'], carmenCore.ENDING_TYPE.nonPrefix), false);
    t.equal(set.contains(['the', 'quick', 'brown'], carmenCore.ENDING_TYPE.nonPrefix), false);
    t.equal(set.contains(['the', 'quick', 'brown'], carmenCore.ENDING_TYPE.anyPrefix), true);
    t.end();
});
