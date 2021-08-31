# Address Data

Although carmen is designed to serve as a data agnostic spatial search engine, one of the primary
use cases is to load address data into the engine. As such, some concessions have been made
in our data format to optimize for searching address data that are not applicable
for other layers of spatial data.  This document will serve as a guideline
for describing the expected format of address data as well as pitfalls you may encounter.

This document assumes that you have already read the generic [Data Sources](./docs/data-sources.md)
document.

## Address Features

Address features can encode one or all of several different types of address-like data.
These data types can include address points, interpolation lines, and/or intersections.

Data types can be submitted to carmen individually, or for optimal use, combined together
into features containing all three, based on geographic proximity/like street name.

### Universal Properties

The following properties are universal for all carmen address-like features:

- `id`
    - REQUIRED: An integer id unique accross features in this index
- `type`
    - REQUIRED: Must be a GeoJSON `Feature` type
- `properties.carmen:text`
    - REQUIRED: The street name of the address feature
    - The `carmen:text` value can contain multiple synonyms, delimited by a `,`
    - The primary street name should be the first value, with less relevant, or non-display
      names included after. The primary name will be returned in the `place_name` output for a
      geocode, while synonyms, if searched for, will apear in `matching_place_name`
- `properties.carmen:center`
    - REQUIRED: A calculated center point that falls on the surface of the `MultiPoint` feature.
- `properties.carmen:geocoder_stack`
    - OPTIONAL: This value can be used to allow users to filter results by an index vertical.
      An index vertical is the stacking of multiple indexes to form a result, ie (address, place, postcode, etc),
      while an index horizontal would be a single index (ie address or place, or postcode, etc)
      Internally we populate this with the two letter country code, to allow users to filter
      values by country. [ISO 3166-1 Alpha2 Standard](https://www.iso.org/iso-3166-country-codes.html)


### Address Points

The most basic and common type of address data is a `Point` type. Each point can
represent any geographic accuracy of address, from entrance, rooftop, to parcel centroid, etc.

Address points must be clustered before being passed into carmen. This is typically
done by combining addresses based on geographic proximity, like street name, and
a max size metric to ensure long highways are broken up into smaller town sized units.

Although carmen itself does not perform clustering, [PT2ITP](https://github.com/mapbox/pt2itp).
can create clusters that follow this format.

*Example JSON for Address Point Only Cluster*

```JSON
{
    "id": 4914387757785060,
    "type": "Feature",
    "properties": {
        "carmen:addressnumber": [
            "600",
            "601",
            "602",
            "603",
            "604",
            ],
            "carmen:text": "Galveston Street Southeast,US Highway 110",
            "carmen:geocoder_stack": "us",
            "carmen:center": [ -76.9989961, 38.8235612 ],
    },
    "geometry": {
        "type": "MultiPoint",
        "coordinates": [
            [ -76.9994694, 38.8240466 ],
            [ -76.9994929, 38.8237324 ],
            [ -76.9994077, 38.82405 ],
            [ -76.9994363, 38.8237197 ],
            [ -76.9993205, 38.8240264 ]
        ]
    }
}
```

- `properties.carmen:addressnumber`
    - REQUIRED: a flat array of address numbers that have been clustered within this feature
    - Each address number can be a string or integer type. For example `100, "100", "100a"`
      are all valid examples of supported addresses.
    - The `properties.carmen:addressnumber` is a parallel array to the coordinates array
      found at `geometry.coordinates`. This means that the lengths must be the same and that
      the address number of a given element within this array will have the same
      element position as the coordinates in the parallel geometry array. For example the number at `properties.carmen:addressnumber[0]`
      has its corresponding coordinates at `geometry.coordinates[0]`.
- `geometry.type`
    - REQUIRED: A geojson `MultiPoint` type
    - CAN be a `GeometryCollection` but if so it must follow the rules of defined in the
    [Combined Features](#combined-features) section of the document. `GeometryCollections`
    cannot follow the format as in the example above.
    - As per above, the `geometry.coordinates` array must be parallel to, and equal in length with
      the `properties.addressnumber` array.
- `properties.carmen:routable_points`
    - OPTIONAL: a flat array of address routable point objects `[{ coordinates: [1.111, 1.11] }]`, one address will have at most one routable point object for now.
    - Routable points are calculated by default when routing flag is on. If a `properties.carmen:routable_points` is included in the address point, it will override the default routable point.

### Interpolation Lines

Interpolation lines allow the user to search for addresses that do not have a specific known
point representation. For more information and background on interpolation, visit
[What is Interpolation](http://wiki.gis.com/wiki/index.php/Geocoding#Address_interpolation)

Like address points, interpolation lines should be clusterd into features that share
geographic proximity and like street names.
- [PT2ITP](https://github.com/mapbox/pt2itp) is a tool that will generate this data given a road network and address points.
- [CENSUS TIGER](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html) data can also be converted into
this format and used with few modifications.

Below is a compilation of the previous three address-like data formats (points, interpolation, & intersections) combined
into the single, more optimized indexing format. The only significant difference being the `geometry.type` being
a `GeometryCollection` and the double nesting of each of the address-like property values.

```JSON
{
    "id": 4914387757785060,
    "type": "Feature",
    "properties": {
        "carmen:rangetype": "tiger",
        "carmen:parityl": [ "E" ],
        "carmen:lfromhn": [ 600 ],
        "carmen:ltohn": [ 640 ],
        "carmen:parityr": [ "O" ],
        "carmen:rfromhn": [ 601 ],
        "carmen:rtohn": [ 631 ],
        "carmen:text": "Galveston Street Southeast,US Highway 123",
        "carmen:geocoder_stack": "us",
        "carmen:center": [ -76.9989961, 38.8235612 ]
    },
    "geometry": {
        "type": "MultiLineString",
        "coordinates": [[
            [ -76.999688, 38.823922 ],
            [ -76.999632, 38.823914 ],
            [ -76.99948, 38.823887 ],
            [ -76.999408, 38.823872 ],
            [ -76.999227, 38.823828 ],
            [ -76.999197, 38.823822 ],
            [ -76.99914, 38.823808 ],
            [ -76.999111, 38.8238 ],
            [ -76.999027, 38.823773 ],
            [ -76.998946, 38.823741 ],
            [ -76.998876, 38.823707 ],
            [ -76.998809, 38.823669 ],
            [ -76.998766, 38.823643 ],
            [ -76.998724, 38.823615 ],
            [ -76.998588, 38.823505 ],
            [ -76.9985091, 38.8234421 ]
        ]]
    }
}
```

Note: Interpolation properties all contain `l` (left) and `r` (right) prefixes. These
left/right prefixes are based on the direction of the linestring from the 0th coordinate
onward. When visualizing these values, ensure you check the orientation of the linestring
rather than using the L/R of your orientation to the feature on your screen.

- `properties.carmen:rangetype`
    - REQUIRED: The interpolation format. Accepted values: tiger
    - Carmen has the potential to support multiple forms of interpolation,
      however at the moment only `tiger` is currently implemented and supported.

Like address points, each element in the following flat arrays refers to the
corresponding element in the geometry coordinates array.

- `properties.carmen:parityl`
    - REQUIRED: Even/Odd identification for the left side of the linestring.
      Accepted values: `E` (even address numbers), `O` (odd address numbers) `null`, no interpolation.
- `properties.carmen:lfromhn`
    - REQUIRED: The address number that the interpolation segment begins at on the left side.
      Note that this is based purely on the direction of the linestring and as such
       lfromhn may be greater than or less than ltohn depending on the direction of the linestring.
- `properties.carmen:ltohn`
   - REQUIRED: The address at the end of a given segment on the left side.
- `properties.carmen:parityr`
   - REQUIRED: same as `parityl` except for the right side
- `properties.carmen:rfromhn`
   - REQUIRED: same as `lfromhn` except for the right side
- `properties.carmen:rtohn`
   - REQUIRED: same as `ltohn` except for the right side
- `geometry.type`
    - REQUIRED: A geojson `MultiLineString` type
    - CAN be a `GeometryCollection` but if so it must follow the rules of defined in the
    [Combined Features](#combined-features) section of the document. `GeometryCollections`
    cannot follow the format as in the example above.
    - As per above, the `geometry.coordinates` array must be parallel to, and equal in length with
      the `parity` & `from/to` arrays.

### Intersections

The final address data type are intersections. Carmen allows the user to search for intersections
using the syntax `<street> and <street>`

```JSON
{
    "id": 4914387757785060,
    "type": "Feature",
    "properties": {
        "carmen:intersections": [
            "6th Street Southeast",
            "Southern Avenue Southeast"
        ],
        "carmen:text": "Galveston Street Southeast",
        "carmen:geocoder_stack": "us",
        "carmen:center": [ -76.9989961, 38.8235612 ]
    },
    "geometry": {
        "type": "MultiPoint",
        "coordinates": [
            [ -76.999688, 38.823922 ],
            [ -76.9985091, 38.8234421 ]
        ]
    }
}
```

- `properties.carmen:intersections`
    - REQUIRED: A flat array containing a single name of each intersecting street
      If the intersecting street has multiple synonyms that you want the user to be
      able to search for, each synonym should have it's own element in the array.
- `geometry.type`
    - REQUIRED: A geojson `MultiPoint` type
    - CAN be a `GeometryCollection` but if so it must follow the rules of defined in the
    [Combined Features](#combined-features) section of the document. `GeometryCollections`
    cannot follow the format as in the example above.
    - As per above, the `geometry.coordinates` array must be parallel to, and equal in length with
      the `properties.carmen:intersections` array


### Combined Features

Combined features allow address-like data to be combined into a
single GeoJSON Feature and to be indexed in a more optimized form. By default, PT2ITP
outputs combined features.

The major difference between the individual features above and the combined features is the level of array nesting.

Combined features are always a `GeometryCollection` type, and each of the address features
defined above are nested to be parallel with the geometry in the collection array that they refer to.

For example, if a geometry collection has an interpolation MultiLineString in position 0, and an
address MultiPoint geometry in position 1, then the properties would look like:

```JSON
{
    "carmen:addressnumber": [null, [100, 101, 102]]
}
```

The following is a combined feature that has the properties necessary for address points, interpolation,
and intersection data combined into a single feature. Note the use of double nesting, and the `GeometryCollection`
geometry type.

Note: The order of the geometries in the array is solely based on where the non-null values are found
in the corresponding propreties. For example, a geometry ordering of `ITP Geometry, Points, Intersections` and
`Intersects, ITP Geometry, Points` are both equally valid. Do not hardcode scripts to assume the position
of a given type of address-like data in the `geometries` array.

```JSON
{
    "id": 4914387757785060,
    "type": "Feature",
    "properties": {
        "carmen:intersections": [
            null,
            null,
            [
                "6th Street Southeast",
                "Southern Avenue Southeast"
            ]
        ],
        "carmen:addressnumber": [
            null,
            [
                "600",
                "601",
                "602",
                "603",
                "604"
            ],
            null
        ],
        "carmen:rangetype": "tiger",
        "carmen:parityl": [
            [
                "E"
            ],
            null,
            null
        ],
        "carmen:lfromhn": [
            [
                600
            ],
            null,
            null
        ],
        "carmen:ltohn": [
            [
                640
            ],
            null,
            null
        ],
        "carmen:parityr": [
            [
                "O"
            ],
            null,
            null
        ],
        "carmen:rfromhn": [
            [
                601
            ],
            null,
            null
        ],
        "carmen:rtohn": [
            [
                631
            ],
            null,
            null
        ],
        "carmen:text": "Galveston Street Southeast",
        "carmen:geocoder_stack": "us",
        "carmen:center": [ -76.9989961, 38.8235612 ]
    },
    "geometry": {
        "type": "GeometryCollection",
        "geometries": [{
            "type": "MultiLineString",
            "coordinates": [[
                [ -76.999688, 38.823922 ],
                [ -76.999632, 38.823914 ],
                [ -76.99948, 38.823887 ],
                [ -76.999408, 38.823872 ],
                [ -76.999227, 38.823828 ],
                [ -76.999197, 38.823822 ],
                [ -76.99914, 38.823808 ],
                [ -76.999111, 38.8238 ],
                [ -76.999027, 38.823773 ],
                [ -76.998946, 38.823741 ],
                [ -76.998876, 38.823707 ],
                [ -76.998809, 38.823669 ],
                [ -76.998766, 38.823643 ],
                [ -76.998724, 38.823615 ],
                [ -76.998588, 38.823505 ],
                [ -76.9985091, 38.8234421 ]
            ]]
        },{
            "type": "MultiPoint",
            "coordinates": [
                [ -76.9994694, 38.8240466 ],
                [ -76.9994929, 38.8237324 ],
                [ -76.9994077, 38.82405 ],
                [ -76.9994363, 38.8237197 ],
                [ -76.9993205, 38.8240264 ]
            ]
        },{
            "type": "MultiPoint",
            "coordinates": [
                [ -76.999688, 38.823922 ],
                [ -76.9985091, 38.8234421 ]
            ]
        }]
    }
}

```

