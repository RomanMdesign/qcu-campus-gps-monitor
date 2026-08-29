import { useEffect, useRef, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import {
  ref,
  set,
  serverTimestamp,
} from "firebase/database";

import { database } from "./firebase";

// --------------------------------------------------
// Fix Leaflet marker icons when using Vite
// --------------------------------------------------

const markerIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// --------------------------------------------------
// Map controller
// --------------------------------------------------

function MapController({ position, follow }) {
  const map = useMap();

  useEffect(() => {
    if (!position || !follow) return;

    map.setView(
      [position.latitude, position.longitude],
      Math.max(map.getZoom(), 17),
      {
        animate: true,
      }
    );
  }, [position, follow, map]);

  return null;
}

// --------------------------------------------------
// Format helpers
// --------------------------------------------------

function formatCoordinate(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return Number(value).toFixed(6);
}

function formatAccuracy(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${Math.round(value)} m`;
}

function formatSpeed(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "0.0 km/h";
  }

  return `${(Number(value) * 3.6).toFixed(1)} km/h`;
}

function formatTime(date) {
  if (!date) return "--";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// --------------------------------------------------
// Firebase location upload
// --------------------------------------------------

async function saveLocationToFirebase(position) {
  const locationRef = ref(database, "gps/current");

  await set(locationRef, {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy,
    altitude: position.altitude ?? null,
    heading: position.heading ?? null,
    speed: position.speed ?? null,
    updatedAt: serverTimestamp(),
  });
}

// --------------------------------------------------
// Main application
// --------------------------------------------------

export default function App() {
  const watchIdRef = useRef(null);

  const [permissionState, setPermissionState] =
    useState("unknown");

  const [gpsStatus, setGpsStatus] =
    useState("idle");

  const [position, setPosition] =
    useState(null);

  const [lastUpdate, setLastUpdate] =
    useState(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [firebaseStatus, setFirebaseStatus] =
    useState("waiting");

  const [followUser, setFollowUser] =
    useState(true);

  const [tracking, setTracking] =
    useState(false);

  // ------------------------------------------------
  // Stop GPS
  // ------------------------------------------------

  const stopTracking = () => {
    if (
      watchIdRef.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    setTracking(false);
    setGpsStatus("idle");
  };

  // ------------------------------------------------
  // Handle GPS success
  // ------------------------------------------------

  const handlePosition = async (geoPosition) => {
    const coords = geoPosition.coords;

    const newPosition = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      heading: coords.heading,
      speed: coords.speed,
    };

    setPosition(newPosition);
    setLastUpdate(new Date());
    setGpsStatus("active");
    setErrorMessage("");

    // ----------------------------------------------
    // Firebase sync
    // ----------------------------------------------

    try {
      setFirebaseStatus("syncing");

      await saveLocationToFirebase(newPosition);

      setFirebaseStatus("connected");
    } catch (error) {
      console.error(
        "Firebase location upload failed:",
        error
      );

      setFirebaseStatus("error");
    }
  };

  // ------------------------------------------------
  // Handle GPS error
  // ------------------------------------------------

  const handlePositionError = (error) => {
    console.error("GPS error:", error);

    setGpsStatus("error");

    if (error.code === 1) {
      setPermissionState("denied");

      setErrorMessage(
        "Location permission was denied. Please allow location access in your browser settings."
      );
    } else if (error.code === 2) {
      setErrorMessage(
        "Your location could not be determined."
      );
    } else if (error.code === 3) {
      setErrorMessage(
        "GPS request timed out. Please try again."
      );
    } else {
      setErrorMessage(
        "Unable to get your current location."
      );
    }
  };

  // ------------------------------------------------
  // Start GPS
  // ------------------------------------------------

  const startTracking = () => {
    setErrorMessage("");

    if (!navigator.geolocation) {
      setGpsStatus("error");

      setErrorMessage(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    setGpsStatus("requesting");
    setTracking(true);

    const watchId =
      navigator.geolocation.watchPosition(
        handlePosition,
        handlePositionError,
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 20000,
        }
      );

    watchIdRef.current = watchId;

    setPermissionState("requesting");
  };

  // ------------------------------------------------
  // Check permission when available
  // ------------------------------------------------

  useEffect(() => {
    let permissionStatus;

    const checkPermission = async () => {
      try {
        if (!navigator.permissions) {
          return;
        }

        permissionStatus =
          await navigator.permissions.query({
            name: "geolocation",
          });

        setPermissionState(
          permissionStatus.state
        );

        permissionStatus.onchange = () => {
          setPermissionState(
            permissionStatus.state
          );
        };
      } catch {
        // Some iOS browsers do not expose
        // the permissions API consistently.
      }
    };

    checkPermission();

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  // ------------------------------------------------
  // Cleanup GPS watcher
  // ------------------------------------------------

  useEffect(() => {
    return () => {
      if (
        watchIdRef.current !== null &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }
    };
  }, []);

  // ------------------------------------------------
  // Status label
  // ------------------------------------------------

  const getGpsLabel = () => {
    if (gpsStatus === "active") {
      return "GPS ACTIVE";
    }

    if (gpsStatus === "requesting") {
      return "REQUESTING GPS";
    }

    if (gpsStatus === "error") {
      return "GPS ERROR";
    }

    return "GPS READY";
  };

  return (
    <div className="app">

      {/* ============================================
          HEADER
      ============================================ */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-mark">
            Q
          </div>

          <div>
            <div className="brand-title">
              QCU CAMPUS
            </div>

            <div className="brand-subtitle">
              GPS MONITOR
            </div>
          </div>

        </div>

        <div
          className={`gps-pill ${
            gpsStatus === "active"
              ? "gps-online"
              : ""
          }`}
        >
          <span className="status-dot" />
          {getGpsLabel()}
        </div>

      </header>

      {/* ============================================
          MAIN
      ============================================ */}

      <main className="main">

        {/* ==========================================
            PERMISSION CARD
        ========================================== */}

        {!position && (
          <section className="welcome-card">

            <div className="location-icon">
              ◎
            </div>

            <h1>
              Campus Location
            </h1>

            <p>
              Allow location access to display
              your current position on the
              QCU campus map.
            </p>

            <button
              className="primary-button"
              onClick={startTracking}
              disabled={tracking}
            >
              {tracking
                ? "Waiting for GPS..."
                : "Allow GPS Location"}
            </button>

            {permissionState === "denied" && (
              <div className="warning">
                Location permission is currently
                blocked. Allow location access in
                your browser settings and try again.
              </div>
            )}

          </section>
        )}

        {/* ==========================================
            MAP
        ========================================== */}

        <section className="map-section">

          <MapContainer
            center={[
              14.7215,
              121.0621,
            ]}
            zoom={17}
            scrollWheelZoom={true}
            className="map"
          >

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {position && (
              <>
                <MapController
                  position={position}
                  follow={followUser}
                />

                <Marker
                  position={[
                    position.latitude,
                    position.longitude,
                  ]}
                  icon={markerIcon}
                />

                <Circle
                  center={[
                    position.latitude,
                    position.longitude,
                  ]}
                  radius={
                    position.accuracy || 20
                  }
                  pathOptions={{
                    fillOpacity: 0.12,
                  }}
                />
              </>
            )}

          </MapContainer>

          {/* Map overlay */}

          <div className="map-overlay">

            <div className="map-title">
              QCU CAMPUS
            </div>

            <div className="map-status">
              {position
                ? "Current location"
                : "Waiting for location"}
            </div>

          </div>

          {position && (
            <button
              className="recenter-button"
              onClick={() =>
                setFollowUser(true)
              }
            >
              ⦿
              <span>My Location</span>
            </button>
          )}

        </section>

        {/* ==========================================
            GPS DATA
        ========================================== */}

        <section className="dashboard">

          <div className="section-heading">
            <div>
              <h2>
                GPS DATA
              </h2>

              <p>
                Live positioning information
              </p>
            </div>

            <div
              className={`firebase-status ${
                firebaseStatus === "connected"
                  ? "connected"
                  : firebaseStatus === "error"
                  ? "firebase-error"
                  : ""
              }`}
            >
              <span />
              {firebaseStatus === "connected"
                ? "Firebase Connected"
                : firebaseStatus === "syncing"
                ? "Syncing..."
                : firebaseStatus === "error"
                ? "Firebase Error"
                : "Firebase Waiting"}
            </div>
          </div>

          <div className="data-grid">

            <div className="data-card">
              <span className="data-label">
                LATITUDE
              </span>

              <strong>
                {formatCoordinate(
                  position?.latitude
                )}
              </strong>
            </div>

            <div className="data-card">
              <span className="data-label">
                LONGITUDE
              </span>

              <strong>
                {formatCoordinate(
                  position?.longitude
                )}
              </strong>
            </div>

            <div className="data-card">
              <span className="data-label">
                ACCURACY
              </span>

              <strong>
                {formatAccuracy(
                  position?.accuracy
                )}
              </strong>
            </div>

            <div className="data-card">
              <span className="data-label">
                SPEED
              </span>

              <strong>
                {formatSpeed(
                  position?.speed
                )}
              </strong>
            </div>

          </div>

          <div className="secondary-data">

            <div>
              <span>
                ALTITUDE
              </span>

              <strong>
                {position?.altitude !== null &&
                position?.altitude !== undefined
                  ? `${Math.round(
                      position.altitude
                    )} m`
                  : "--"}
              </strong>
            </div>

            <div>
              <span>
                HEADING
              </span>

              <strong>
                {position?.heading !== null &&
                position?.heading !== undefined
                  ? `${Math.round(
                      position.heading
                    )}°`
                  : "--"}
              </strong>
            </div>

            <div>
              <span>
                LAST UPDATE
              </span>

              <strong>
                {formatTime(lastUpdate)}
              </strong>
            </div>

          </div>

        </section>

        {/* ==========================================
            CONTROLS
        ========================================== */}

        <section className="controls">

          <button
            className={
              tracking
                ? "secondary-button danger"
                : "secondary-button"
            }
            onClick={
              tracking
                ? stopTracking
                : startTracking
            }
          >
            {tracking
              ? "Stop GPS"
              : "Start GPS"}
          </button>

          <button
            className={
              followUser
                ? "secondary-button active"
                : "secondary-button"
            }
            onClick={() =>
              setFollowUser(
                (current) => !current
              )
            }
          >
            {followUser
              ? "Following Location"
              : "Follow Location"}
          </button>

        </section>

        {/* ==========================================
            ERROR
        ========================================== */}

        {errorMessage && (
          <section className="error-card">

            <strong>
              GPS Notice
            </strong>

            <p>
              {errorMessage}
            </p>

          </section>
        )}

      </main>

      {/* ============================================
          FOOTER
      ============================================ */}

      <footer className="footer">

        <span>
          QCU Campus GPS Monitor
        </span>

        <span>
          Firebase + GPS
        </span>

      </footer>

    </div>
  );
}
