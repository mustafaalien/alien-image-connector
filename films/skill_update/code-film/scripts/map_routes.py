#!/usr/bin/env python3
"""Real road routes and drive times from the project to each landmark (OSRM public server, OpenStreetMap data).
Times are WITHOUT traffic: show them as approximate and tell the user to check them on Google Maps.
Usage: python3 map_routes.py <lat> <lon> <routes.json> "Atlantis The Palm=25.1304,55.1172" "Burj Al Arab=25.1412,55.1853" """
import sys, json, urllib.request
lat, lon, out = float(sys.argv[1]), float(sys.argv[2]), sys.argv[3]; res = {}
for arg in sys.argv[4:]:
    name, ll = arg.split('='); la, lo = map(float, ll.split(','))
    u = f"https://router.project-osrm.org/route/v1/driving/{lon},{lat};{lo},{la}?overview=full&geometries=geojson"
    r = json.load(urllib.request.urlopen(u, timeout=30))['routes'][0]
    res[name] = {'min': r['duration']/60, 'km': r['distance']/1000, 'coords': r['geometry']['coordinates']}
    print(f"{name}: {r['duration']/60:.1f} min, {r['distance']/1000:.1f} km")
json.dump(res, open(out, 'w'))
