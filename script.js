// --------------------
// 1) MAP INIT
// --------------------
const map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM(),
    }),
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([0, 0]),
    zoom: 2,
  }),
});

// --------------------
// 2) LAYER FOR SEARCH MARKER
// --------------------
const searchSource = new ol.source.Vector();

const searchLayer = new ol.layer.Vector({
  source: searchSource,
});

map.addLayer(searchLayer);

function setSearchMarker(lon, lat) {
  searchSource.clear();

  const feature = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
  });

  // ✅ Force style on the marker itself (guaranteed)
  feature.setStyle(
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({ color: "#d33" }),
        stroke: new ol.style.Stroke({ color: "#fff", width: 2 }),
      }),
    })
  );

  searchSource.addFeature(feature);
}


// --------------------
// 3) WEATHER POPUP OVERLAY
// --------------------
const weatherEl = document.createElement("div");
weatherEl.className = "weather-popup";
weatherEl.style.display = "none";
document.body.appendChild(weatherEl);

const weatherOverlay = new ol.Overlay({
  element: weatherEl,
  positioning: "bottom-center",
  offset: [0, -12],
});
map.addOverlay(weatherOverlay);

function showWeatherAt(mapCoordinate, html) {
  weatherEl.innerHTML = html;
  weatherEl.style.display = "block";
  weatherOverlay.setPosition(mapCoordinate);
}
function hideWeather() {
  weatherEl.style.display = "none";
  weatherOverlay.setPosition(undefined);
}


// --------------------
// 4) GEOCODING (Geoapify)
// --------------------
// IMPORTANT: Do NOT commit your real key to GitHub
const GEO_API_KEY = window.APP_CONFIG?.GEO_API_KEY;

async function geocode(placeText) {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
    placeText
  )}&apiKey=${GEO_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);

  const data = await res.json();
  if (!data.features || data.features.length === 0) {
    throw new Error("Location not found");
  }

  const [lon, lat] = data.features[0].geometry.coordinates;
  return { lon, lat };
}

async function onSearch() {
  const input = document.getElementById("searchInput");
  const q = input.value.trim();

  if (!q) {
    alert("Please type a location.");
    return;
  }

  if (GEO_API_KEY === "YOUR_API_KEY_HERE") {
    alert("Please put your Geoapify API key in script.js (GEO_API_KEY).");
    return;
  }

  try {
    const { lon, lat } = await geocode(q);
    setSearchMarker(lon, lat);

    map.getView().animate(
      { center: ol.proj.fromLonLat([lon, lat]), duration: 800 },
      { zoom: 12, duration: 800 }
    );
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

document.getElementById("searchBtn").addEventListener("click", onSearch);
document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSearch();
});

// --------------------
// 5) WEATHER API (OpenWeather)
// --------------------
// IMPORTANT: Do NOT commit your real key to GitHub
const WEATHER_API_KEY = window.APP_CONFIG?.WEATHER_API_KEY;

async function fetchWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) {
  const txt = await res.text();
  throw new Error(`Weather HTTP error: ${res.status} | ${txt}`);
}


  return await res.json();
}

// --------------------
// 6) MAP CLICK -> WEATHER
// --------------------
map.on("click", async (evt) => {
  const [lon, lat] = ol.proj.toLonLat(evt.coordinate);

  if (WEATHER_API_KEY === "YOUR_WEATHER_API_KEY_HERE") {
    alert("Please put your OpenWeather API key in script.js (WEATHER_API_KEY).");
    return;
  }

  showWeatherAt(
    evt.coordinate,
    `<div class="title">Weather</div><div class="muted">Loading...</div>`
  );

  try {
    const data = await fetchWeather(lat, lon);

    const name = data.name || "Selected location";
    const temp = data.main?.temp;
    const humidity = data.main?.humidity;
    const condition = data.weather?.[0]?.description;

    const html = `
      <div class="title">${name}</div>
      <div>Temperature: ${temp} °C</div>
      <div>Condition: ${condition}</div>
      <div>Humidity: ${humidity}%</div>
      <div class="muted">Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</div>
    `;

    showWeatherAt(evt.coordinate, html);
  } catch (err) {
    console.error(err);
    showWeatherAt(
      evt.coordinate,
      `<div class="title">Weather</div><div>Failed to load weather.</div><div class="muted">${err.message}</div>`
    );
  }
});



map.addControl(new ol.control.FullScreen());


map.addControl(new ol.control.ScaleLine());


map.addControl(
  new ol.control.MousePosition({
    coordinateFormat: (coord) =>
      `${coord[1].toFixed(5)}, ${coord[0].toFixed(5)}`, // lat, lon
    projection: "EPSG:4326",
    className: "mouse-position",
  })
);

map.on("dblclick", (evt) => {
  evt.preventDefault(); // جلوگیری از زوم پیش‌فرض دوبارکلیک
  hideWeather();
});
