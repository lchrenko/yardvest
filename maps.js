(function () {
  let loaded;
  function loadGoogleMaps() {
    const key = window.YARDVEST_CONFIG?.googleMapsApiKey;
    if (!key) return Promise.resolve(false);
    if (window.google?.maps?.places) return Promise.resolve(true);
    if (loaded) return loaded;
    loaded = new Promise((resolve, reject) => {
      window.__yardvestMapsReady = () => resolve(true);
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=__yardvestMapsReady`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error("Google Maps could not load"));
      document.head.appendChild(script);
    });
    return loaded;
  }

  function component(place, type) {
    return (
      place.address_components?.find((item) => item.types.includes(type))
        ?.long_name || ""
    );
  }

  function showMap(address, location) {
    const root = document.querySelector("#property-map");
    if (!root || !address) return;
    const key = window.YARDVEST_CONFIG?.googleMapsApiKey;
    if (key) {
      root.innerHTML = `<iframe title="Map of selected property" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(address)}"></iframe>`;
    } else {
      root.innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}" target="_blank" rel="noopener">View this address in Google Maps ↗</a>`;
    }
    if (location) {
      document.querySelector("#property-latitude").value = location.lat();
      document.querySelector("#property-longitude").value = location.lng();
    }
  }

  async function initAddressMap() {
    const input = document.querySelector("#property-address");
    if (!input || input.dataset.mapsReady) return;
    input.dataset.mapsReady = "true";
    input.addEventListener("change", () => showMap(input.value));
    try {
      if (!(await loadGoogleMaps())) return;
      const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "ca" },
        fields: ["formatted_address", "address_components", "geometry"],
        types: ["address"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.formatted_address) return;
        input.value = place.formatted_address;
        document.querySelector("#property-locality").value = component(
          place,
          "locality",
        );
        document.querySelector("#property-province").value = component(
          place,
          "administrative_area_level_1",
        );
        document.querySelector("#property-postal-code").value = component(
          place,
          "postal_code",
        );
        document.querySelector("#property-country").value = component(
          place,
          "country",
        );
        showMap(place.formatted_address, place.geometry?.location);
      });
    } catch (error) {
      console.error(error);
    }
  }

  window.initYardVestMaps = initAddressMap;
})();
