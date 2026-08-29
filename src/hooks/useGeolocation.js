import { useCallback, useEffect, useRef, useState } from "react";

export default function useGeolocation({
  enabled = false,
  watch = true,
} = {}) {
  const [location, setLocation] = useState(null);

  const [error, setError] = useState("");

  const [permissionState, setPermissionState] =
    useState("unknown");

  const watchIdRef = useRef(null);

  const stop = useCallback(() => {
    if (
      watchIdRef.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    const handleSuccess = (position) => {
      setPermissionState("granted");

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      });
    };

    const handleError = (geoError) => {
      if (geoError.code === 1) {
        setPermissionState("denied");
        setError(
          "Location permission was denied. Please allow location access."
        );
      } else if (geoError.code === 2) {
        setError(
          "Your location could not be determined."
        );
      } else if (geoError.code === 3) {
        setError(
          "Location request timed out."
        );
      } else {
        setError("Unable to obtain your location.");
      }
    };

    if (watch) {
      watchIdRef.current =
        navigator.geolocation.watchPosition(
          handleSuccess,
          handleError,
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000,
          }
        );
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        }
      );
    }
  }, [watch]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => stop();
  }, [enabled, start, stop]);

  return {
    location,
    error,
    permissionState,
    start,
    stop,
  };
}
