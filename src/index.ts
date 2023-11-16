import { default as Openrouteservice } from "openrouteservice/dist/Openrouteservice.js";
import express from "express";
import { ISearchResult, NominatimJS } from "./nominatim.js";
import { Feature, Point, Position } from "geojson";
import { MatrixQuery, MatrixResponse } from "openrouteservice/dist/matrix.js";
import { Profile } from "openrouteservice/dist/common.js";
import { DirectionsFormat, DirectionsResponse, DirectionsUnits, DirectionsQuery, DirectionsResponseJSON } from "openrouteservice/dist/directions.js";
import * as mqtt from "mqtt";
import payload from './teltonikaPayload.json';
import { hostname } from "os";
import {decodePolyline} from './orsHelper.js'
const app = express();
const port = 3000;
const ors: Openrouteservice = new Openrouteservice(
	"5b3ce3597851110001cf6248faa70c30976b49ae947cf92dcb6fcd68",
	"http://localhost:8082/ors",
	);
	
	
	const places = [
		"Schloss Burg",
		"Deutsches Klingenmuseum",
		"Hendrich's Drop Forge",
		"Müngstener Brückenpark",
		"Altstadt Gräfrath",
		"Museum Plagiarius",
		"Kunstmuseum Solingen",
		"Balkhauser Kotten",
		"Bergisches Straßenbahnmuseum",
		"Sengbachtalsperre",
	];
	
	// const pubs = await Promise.all(
	// 	places.map(async (elem: string) => {
	// 		return await reverseGeocode(elem)
	// 		.then((res: ISearchResult[]) => {
	// 			return res.length >= 1 ? res[0] : undefined;
	// 		})
	// 		.catch((err) => {
	// 			console.log(err.response);
	// 			return undefined;
	// 		});
	// 	})
	// );
	
	async function reverseGeocode(place: string): Promise<ISearchResult[]> {
		return NominatimJS.search({
			amenity: "pub",
			city: "Solingen",
			country: "Germany",
			
			// endpoint: "https://geocode.maps.co/"
		});
	}
	
	app.get("/", async (req, res) => {
		console.log("received request");
		// const processedPlaces: (ISearchResult | undefined)[] = await Promise.all(
		// 	places.map(async (elem: string) => {
		// 		return await reverseGeocode(elem)
		// 		.then((res: ISearchResult[]) => {
		// 			return res.length >= 1 ? res[0] : undefined;
		// 		})
		// 		.catch((err) => {
		// 			console.log(err.response);
		// 			return undefined;
		// 		});
		// 	})
		// 	);
		
		const pubs = await reverseGeocode("")
		.then((res: ISearchResult[]) => {
			return res.length >= 1 ? res : undefined;
		})
		.catch((err) => {
			console.log(err.response);
			return undefined;
		});
		
		if (pubs == undefined) {
			console.log("fail");
			return;
		}
		
		const filteredPlaces: ISearchResult[] = [];
		
		pubs.forEach((elem) => {
			if (elem != undefined) filteredPlaces.push(elem);
		});
		
		console.log(filteredPlaces);
		
		
		
		var placeCoordinates: Point[] = filteredPlaces.map((elem) => {
			return {
				type: "Point",
				coordinates: [parseFloat(elem.lon), parseFloat(elem.lat)],
			} as Point;
		});
		
		const jsonFeatures: Feature[] = placeCoordinates.map((elem) => {
			return {
				type: "Feature",
				geometry: {
					type: elem.type,
					coordinates: elem.coordinates,
				},
				properties: null,
			} as Feature;
		});
		
		let matrix: MatrixQuery = {
			locations: placeCoordinates.map((elem) => {
				return elem.coordinates;
			}),
			resolve_locations: true,
			units: DirectionsUnits.KILOMETERS
		};
		
		const profile: Profile = Profile.DRIVING_CAR;
		
		const response : MatrixResponse = await ors
		.getMatrix(profile, matrix)
		.then((res: any) => {
			console.log(res);
			return res;
		})
		.catch((err: any) => {
			console.log(err);
			return undefined;
		});
		
		const dirs : (DirectionsResponseJSON | undefined)[][] = [[]];
		
		
		
		
		
		
		// response.destinations.forEach((dest) => {
		//   response.sources.forEach(async (source) => {
		
		//   })
		// })
		
		// await Promise.all(dirs.map(Promise.all.bind(Promise)));
		console.log(dirs);
		for (let i = 0; i < response.destinations.length; i++) {
			const dest = response.destinations[i]
			if(dirs[i] == undefined) dirs[i] = [];
			for (let j = 0; j < response.sources.length; j++) {
				const source = response.sources[j];

				if(source == null || dest == null) {
					console.log(`Route ${i}, ${j} is null`)
					continue;
				}
				await getDirections(source.location, dest.location, Profile.DRIVING_CAR)
				.then((res) => {
					dirs[i][j] = res
				})
				.catch((err) => {
					console.log(err);
					dirs[i][j] = undefined;
				})
			}
		}
		
		for (let i = 0; i < response.destinations.length; i++) {
			const dest = response.destinations[i]
			for (let j = 0; j < response.sources.length; j++) {
				// const client = mqtt.connect("fleet.openremote.app", {clientId: `source${i}dest${j}`, port: 8883});
				const source = response.sources[j];
				const directions: DirectionsResponseJSON | undefined = dirs[i][j];
				if(directions == undefined) continue;
				// console.log(dirs[i][j]);
				const geometry : any[] = decodePolyline(directions.routes[0].geometry!, true);
				
				directions.routes[0].segments.forEach((segment) => {
					segment.steps.forEach((step) => {
						console.log(geometry[step.waypoints[1]])
						// console.log(step)da
						// let editablePayload = payload;
			
						// editablePayload.state.reported.latlng = `${step.waypoints},${}`
						// step.waypoints[1]
					})
				})
				
				

				// directions..forEach(element => {
					
				// });

				
				// let editablePayload = payload;
				
				// editablePayload.state.reported.latlng = `${},${}`
				console.log(`DONE WITH ROUTE ${i}, ${j}`)
			}
		}


		
		
		
	})
	
	
	const getDirections = async (source :Position , destination: Position, profile: Profile): Promise<DirectionsResponseJSON> => {
		const query: DirectionsQuery = {
			coordinates: [source, destination]
		}
		return ors.getDirections(Profile.DRIVING_CAR, DirectionsFormat.JSON, query)
	}
	
	
	app.listen(port, "0.0.0.0", () => {
		console.log(`Server running at http://localhost:${port}`);
	});
	
	