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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=places&callback=__yardvestMapsReady`;
      script.async = true;
      script.defer = true;
      script.onerror = () => { loaded = undefined; script.remove(); reject(new Error("Google Maps could not load")); };
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
    input.dataset.mapsReady = "loading";
    input.setAttribute("autocomplete", "off");
    const status = input.parentElement.querySelector('.address-search-status') || document.createElement('p');
    status.className = 'fine-print address-search-status';
    status.setAttribute('role', 'status');
    input.insertAdjacentElement('afterend', status);
    status.textContent = 'Start typing, then select a Google address suggestion.';
    if (!input.dataset.mapsInputBound) input.addEventListener("input", () => {
      status.textContent = 'Start typing, then select a Google address suggestion.';
      document.querySelector('#property-map')?.replaceChildren();
      for (const id of ["property-latitude", "property-longitude", "property-locality", "property-province", "property-postal-code"]) {
        const field = document.getElementById(id); if (field) field.value = "";
      }
    });
    input.dataset.mapsInputBound = "true";

    try {
      if (!(await loadGoogleMaps())) throw new Error('Address search unavailable');
      // Native modal dialogs sit above the document. Keep Google's prediction
      // list inside that dialog so it remains visible and interactive.
      const modal = input.closest('dialog');
      const field = input.parentElement;
      field.style.position = 'relative';
      const positionPredictions = () => {
        field.querySelectorAll('.pac-container').forEach(list => {
          list.style.setProperty('top', (input.offsetTop + input.offsetHeight) + 'px', 'important');
        });
      };
      const attachPredictions = () => {
        if (!modal) return;
        document.querySelectorAll('body > .pac-container').forEach(list => {
          field.appendChild(list);
          list.style.setProperty('position', 'absolute', 'important');
          list.style.setProperty('left', '0', 'important');
          list.style.setProperty('width', '100%', 'important');
          positionPredictions();
          observer.disconnect();
          new ResizeObserver(positionPredictions).observe(input);
        });
      };
      const observer = new MutationObserver(attachPredictions);
      observer.observe(document.body, {childList:true});
      const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "ca" },
        fields: ["formatted_address", "address_components", "geometry"],
        types: ["address"],
      });
      attachPredictions();
      input.dataset.mapsReady = "true";
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
        status.textContent = 'Address selected from Google. We route your enquiry using this property’s municipality and province.';
      });
    } catch (error) {
      delete input.dataset.mapsReady;
      status.textContent = 'Google address search is unavailable. Enter the full address, municipality and province so our team can review it.';
      console.error(error);
    }
  }

  window.initYardVestMaps = initAddressMap;
})();
