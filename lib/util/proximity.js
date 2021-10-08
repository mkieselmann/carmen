'use strict';
const point = require('@turf/helpers').point;
const turfdist = require('@turf/distance').default;
const SphericalMercator = require('@mapbox/sphericalmercator');
const constants = require('../constants');

const tileSize = 256;
const merc = new SphericalMercator({
    size: tileSize
});
const VARIANCE_CONSTANT = variance(0.75, 0.5);

module.exports.distance = distance;
module.exports.center2zxy = center2zxy;
module.exports.scoredist = scoredist;
module.exports.scoreWeight = scoreWeight;
module.exports.distWeight = distWeight;
module.exports.scaleRadius = scaleRadius;
module.exports.gauss = gauss;
module.exports.variance = variance;
module.exports.distscore = distscore;
module.exports.relevanceScore = relevanceScore;

/**
 * distance - Return the distance in miles between a proximity point and a feature.
 *
 * The distance returned is `min(distanceToCenter, distanceToFurthestCornerOfCover)`
 *
 * At the point this function is used, features do not have a full geometry loaded.
 * The `center` point is known to be within the feature. For very large features the center
 * point may be much further than the closest point in the feature. To make this calculation
 * more accurate we use the spatial information in the cover's x, y, z coord. Since
 * the feature is partially located somewhere in the cover's tile, the distance to the feature
 * must be smaller than the distance to the furthest corner in the tile.
 *
 * @param {Array} proximity A lon/lat array
 * @param {Array} center A lon/lat array
 * @param {Cover} cover that is known to cover the feature
 * @return {Float} distance in miles between prox & centroid or prox & the furthest point in cover
 */
function distance(proximity, center, cover) {
    if (!proximity) return 0;

    const centerDist = turfdist(point(proximity), point(center), { units: 'miles' });
    // calculate the distance to the furthest corner of the cover
    const maxCoverDist = Math.max(
        distanceToXYZ(proximity, cover.x + 0, cover.y + 0, cover.zoom),
        distanceToXYZ(proximity, cover.x + 0, cover.y + 1, cover.zoom),
        distanceToXYZ(proximity, cover.x + 1, cover.y + 0, cover.zoom),
        distanceToXYZ(proximity, cover.x + 1, cover.y + 1, cover.zoom));
    return Math.min(centerDist, maxCoverDist);
}

/**
 * Calculate distance between proximity point and tile coordinate
 *
 * @param {Array<number>} proximity - lon, lat array
 * @param {number} x -  tile x coordinate
 * @param {number} y -  tile y coordinate
 * @param {number} z -  tile z coordinate
 * @return {number} distance in miles
 */
function distanceToXYZ(proximity, x, y, z) {
    return turfdist(point(proximity), point(merc.ll([x * tileSize, y * tileSize], z)), { units: 'miles' });
}

/**
 * center2zxy - given a lon/lat and zoom level return the zxy tile coordinates
 *
 * @param {Array} center A lon/lat array
 * @param {Integer} z Zoom level
 * @return {Array} zxy in format [z, x, y]
 */
function center2zxy(center, z) {
    center = [
        Math.min(180,Math.max(-180,center[0])),
        Math.min(85.0511,Math.max(-85.0511,center[1]))
    ];

    const px = merc.px(center, z);
    return [z, Math.round(px[0] / tileSize), Math.round(px[1] / tileSize)];
}

/**
 * Combine score and distance into a single score for sorting.
 *
 * @param {Number} score The score of the feature
 * @param {Number} minScore The lowest score of all features in all indexes.
 * @param {Number} maxScore The maximum score of all features in all indexes
 * @param {Number} dist The distance from the feature to the proximity point in miles.
 * @param {String} zoom The vector tile zoom level of the index the feature is part of.
 * @param {Number} radius Optional proximity radius to override the zoom-based default.
 * @return {Number} proximity adjusted score value between 1 and 5,000
 */
function scoredist(score, minScore, maxScore, dist, zoom, radius, type) {
    const scoreVal = scoreWeight(score, minScore, maxScore);
    const distVal = distWeight(dist, zoom, radius, type);
    return distVal * scoreVal;
}

/**
 * Weigh score to a value between 1 and 500. This value is combined with a dist value
 * to calculate scoredist. Score is scaled linearly to maintain proportional distances
 * between a given feature's score and the highest score of all features in all indexes.
 *
 * @param {Number} score The score of the feature.
 * @param {Number} minScore The lowest score of all features in all indexes.
 * @param {Number} maxScore The highest score of all features in all indexes.
 * @return {Number} scaled score value
 */
function scoreWeight(score, minScore, maxScore) {
    // scale score to a value between 1 and 500
    const normalizedScore = (score - minScore) / (maxScore - minScore);
    return (normalizedScore * 499) + 1;
}

/**
 * Weigh distance to a value between 1 and 10. This value is combined with a score value
 * to calculate scoredist. Dist is scaled along a gaussian curve so that features
 * close to the proximity point receive relatively the same weight, after which
 * distance weighting decays rapidly, then levels out towards the edge of the
 * proximity radius.
 * @param {Number} dist The distance in miles from the feature to the proximity point
 * @param {String} zoom The vector tile zoom level of the index the feature is part of.
 * @param {Number} radius Optional proximity radius to override the zoom-based default.
 * @return {Number} scaled score value
 */
function distWeight(dist, zoom, radius, type) {
    const distRatio = dist / (radius || scaleRadius(zoom, type));
    const gaussVal = gauss(distRatio * 3, VARIANCE_CONSTANT);
    return (9 * gaussVal) + 1;
}

/**
 * Set proximity radius by feature type
 * @param {String} zoom The vector tile zoom level of the index the feature is part of.
 * @return {Number} scaled radius in miles
 */
function scaleRadius(zoom, type) {
    let radius;
    if (zoom <= 6) {
        // country, region
        radius = constants.Z6_PROXIMITY_RADIUS;
    } else if (zoom <= 12) {
        // district, place, locality, postcode, neighborhood
        radius = constants.Z12_PROXIMITY_RADIUS;
    } else {
        // poi, address
        radius = constants.Z14_PROXIMITY_RADIUS;
    }

    if (type && type === 'neighborhood') radius = constants.Z14_PROXIMITY_RADIUS;
    return radius;
}

/**
 * Calculate a value between 0 and 1 along a gassian curve (normal distribution).
 * Used to calculate  distweight and scoredist. From https://www.elastic.co/guide/en/elasticsearch/reference/master/query-dsl-function-score-query.html#_supported_decay_functions
 *
 * @param {Number} nDist The normalized distance (distance / scaledRadius for that
 * feature type) between the feature and the proximity point.
 * @param {Number} variance The variance (σ²) of the gaussian curve.
 * @param {Number} offset The normalized distance from the proximty point at
 * which the gauss value is the same as it would be at the origin. For example,
 * an offset of 0.025 would set the gauss value to 1 for all features within 5
 * miles of the proximity point given a 200 mile scaledRadius.
 * @return {Number} normalized dist value along a gaussian curve between 0 and 1
 */
function gauss(nDist, variance, offset = 0) {
    return Math.exp(-0.5 * Math.pow(Math.max(0, nDist - offset), 2) / variance);
}

/**
 * Calculates the variance (σ² or squared standard deviation) of normalized
 * distances along a gaussian curve. scale and decay define an x and y value
 * that the gauss curve will fit. The larger the variance, the more spread out
 * the gauss curve will be.
 *
 * @param {Number} scale The normalized distance at decay gauss value
 * @param {Number} decay The gauss value at scale normalized distance
 * @return {Number} variance of gaussian curve
 */
function variance(scale, decay) {
    if (decay === 0) throw new Error('decay must be > 0');
    return -0.5 * (Math.pow(scale, 2) / Math.log(decay));
}

/**
 * Similar to `scoredist`, used for including score + distance when sorting features returned by a reverse query.
 * @param {Number} dist The distance in meters from the feature to the query point
 * @param {Number} score The feature's score
 * @return {Number} distance-adjusted score value
 */
function distscore(dist, score) {
    // Consider all distances within a limit to be equivalent
    const minDistance = 35.0;
    const distanceScale = 1000.0;
    const roundingPrecision = 1.0e4;
    return Math.round(score * (distanceScale / (Math.max(dist, minDistance))) * roundingPrecision) / roundingPrecision;
}

/**
 * Combine scoredist and relevance into a single score for sorting. Apply penalties.
 *
 * @param {Number} relev The score of the feature
 * @param {Number} scoredist proximity adjusted score value between 1 and 5000
 * @param {Number} address The carmen:address property of the feature. Equal to
 * the street number if the user's query matches an address number and point in
 * the address cluster.
 * @param {Boolean} omitted True if the street's nearest endpoints match.
 * @param {String} ghost True if the feature's carmen:score property is < 0.
 * @return {Number} composite scoredist and relevance score between 0 and 1
 */
function relevanceScore(relev, scoredist, address, ghost) {
    // add a slight penalty to features with carmen:address === null
    // omitted geometries, or scores of < 0
    if (address === null) relev = Math.max(0, relev - 0.0008);
    if (ghost) relev = Math.max(0, relev - 0.01);
    // scale scoredist to a value between 0 and 1, give a weight of 0.4
    const scoreDistWeight = ((scoredist - 1) / (5000 - 1)) * 0.4;
    // give relevance score a weight of 0.6
    const relevWeight = relev * 0.6;
    return relevWeight + scoreDistWeight;
}
