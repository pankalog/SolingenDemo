import fetch from 'cross-fetch';
const PLACES_TYPES = {
    node: "N",
    way: "W",
    relation: "R"
};
export class NominatimJS {
    static NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/';
    static normalizeParams(params) {
        return {
            ...params,
            format: params.format || 'json',
            "accept-language": params["accept-language"] || params.accept_language
        };
    }
    static stringifyOsmId(osmId) {
        return `${PLACES_TYPES[osmId.type]}${osmId.id}`;
    }
    /**
     * Searches based on the given information. By default searches
     * against the Open Street Map Nominatim server. A custom endpoint
     * could be defined, using the "endpoint" parameter.
     * @param rawParams
     */
    static async search(rawParams) {
        const params = NominatimJS.normalizeParams(rawParams);
        const countryCodes = params.countrycodes || (params.countryCodesArray ? params.countryCodesArray.join(',') : undefined);
        const url = new URL(rawParams.endpoint || `${NominatimJS.NOMINATIM_ENDPOINT}search`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        if (countryCodes) {
            url.searchParams.append('countrycodes', countryCodes);
        }
        return fetch(url.toJSON())
            .then(res => res.json());
    }
    /**
     * Looks up for an array of given Open Street Map ids
     * @param osmIds
     * @param rawParams
     */
    static async lookup(osmIds, rawParams) {
        const params = NominatimJS.normalizeParams(rawParams);
        const url = new URL(rawParams.endpoint || `${NominatimJS.NOMINATIM_ENDPOINT}lookup`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        url.searchParams.append('osm_ids', osmIds.map(NominatimJS.stringifyOsmId).join(','));
        return fetch(url.toJSON())
            .then(res => res.json());
    }
}
