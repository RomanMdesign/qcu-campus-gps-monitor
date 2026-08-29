import { useEffect, useMemo, useRef, useState } from "react";

import {
  onValue,
  ref,
  remove,
  set,
  serverTimestamp
} from "firebase/database";

import { onAuthStateChanged } from "firebase/auth";

import {
  auth,
  database,
  signInGPSUser
} from "./firebase";


/* =========================================================
   QCU SAN BARTOLOME CAMPUS
   ========================================================= */

const CAMPUS = {
  name: "QCU San Bartolome Campus",

  address:
    "673 Quirino Highway, San Bartolome, Novaliches, Quezon City",

  lat: 14.7000917,

  lng: 121.0343250,

  radiusMeters: 180
};


/* =========================================================
   DESTINATIONS
   Based on the campus directory image supplied.
   ========================================================= */

const DESTINATIONS = [
  {
    id: "A",
    name: "TechVoc Gym",
    short: "A",
    description:
      "Holding Area for Room 24–30 & Latecomers",
    x: 72,
    y: 67
  },

  {
    id: "J",
    name: "Admin Building",
    short: "J",
    description:
      "Administration / registration area",
    x: 51,
    y: 46
  },

  {
    id: "C",
    name: "Belmonte Building",
    short: "C",
    description:
      "Holding Area for Rooms 1–23",
    x: 61,
    y: 34
  },

  {
    id: "L",
    name: "New Academic Building",
    short: "L",
    description:
      "Testing Area",
    x: 34,
    y: 23
  },

  {
    id: "E",
    name: "Open Field / Activity Area",
    short: "E",
    description:
      "Open field",
    x: 17,
    y: 64
  },

  {
    id: "F",
    name: "Campus Support Area",
    short: "F",
    description:
      "Support / holding area",
    x: 82,
    y: 45
  },

  {
    id: "I",
    name: "East Activity Area",
    short: "I",
    description:
      "Activity area",
    x: 89,
    y: 66
  }
];


const DESTINATION_MAP = Object.fromEntries(
  DESTINATIONS.map((destination) => [
    destination.id,
    destination
  ])
);


/* =========================================================
   GPS DISTANCE
   ========================================================= */

function distanceMeters(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const R = 6371000;

  const toRad = (value) =>
    (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);

  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    R *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}


/* =========================================================
   FORMATTERS
   ========================================================= */

function formatDistance(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value < 1000) {
    return `${Math.round(value)} m`;
  }

  return `${(value / 1000).toFixed(2)} km`;
}


function formatTime(timestamp) {
  if (!timestamp) {
    return "waiting...";
  }

  return new Date(timestamp).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );
}


function makeParticipantId(uid) {
  return `PARTICIPANT-${String(
    uid || "000000"
  )
    .slice(-6)
    .toUpperCase()}`;
}


function normalizePercent(value) {
  return Math.max(
    3,
    Math.min(97, value)
  );
}


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function GPSMonitor() {
  const watchIdRef = useRef(null);

  const lastWriteRef = useRef(0);


  /* -------------------------------------------------------
     STATE
     ------------------------------------------------------- */

  const [user, setUser] = useState(null);

  const [position, setPosition] =
    useState(null);

  const [accuracy, setAccuracy] =
    useState(null);

  const [tracking, setTracking] =
    useState(false);

  const [permission, setPermission] =
    useState("unknown");

  const [
    selectedDestination,
    setSelectedDestination
  ] = useState("L");

  const [
    participants,
    setParticipants
  ] = useState({});

  const [message, setMessage] =
    useState("Ready");

  const [error, setError] =
    useState("");

  const [lastUpdate, setLastUpdate] =
    useState(null);


  /* -------------------------------------------------------
     PARTICIPANT ID
     ------------------------------------------------------- */

  const participantId = useMemo(
    () =>
      makeParticipantId(
        user?.uid
      ),
    [user?.uid]
  );


  /* -------------------------------------------------------
     DISTANCE FROM QCU
     ------------------------------------------------------- */

  const campusDistance = useMemo(() => {
    if (!position) {
      return null;
    }

    return distanceMeters(
      position.latitude,
      position.longitude,
      CAMPUS.lat,
      CAMPUS.lng
    );
  }, [position]);


  /* -------------------------------------------------------
     CAMPUS GEOFENCE
     ------------------------------------------------------- */

  const insideCampus =
    campusDistance !== null &&
    campusDistance <=
      CAMPUS.radiusMeters;


  /* -------------------------------------------------------
     SELECTED DESTINATION
     ------------------------------------------------------- */

  const selected =
    DESTINATION_MAP[
      selectedDestination
    ];


  /* -------------------------------------------------------
     CONVERT GPS TO CAMPUS VISUAL POSITION
     ------------------------------------------------------- */

  const userMapPosition = useMemo(() => {
    if (!position) {
      return {
        left: 50,
        top: 52
      };
    }

    const lngScale = 0.00135;

    const latScale = 0.00105;

    const left =
      50 +
      ((position.longitude -
        CAMPUS.lng) /
        lngScale) *
        35;

    const top =
      50 -
      ((position.latitude -
        CAMPUS.lat) /
        latScale) *
        35;

    return {
      left: normalizePercent(left),
      top: normalizePercent(top)
    };
  }, [position]);


  /* =========================================================
     START GPS
     ========================================================= */

  async function startTracking() {
    setError("");

    setMessage(
      "Requesting GPS permission..."
    );


    if (!navigator.geolocation) {
      setError(
        "Hindi supported ng browser na ito ang GPS."
      );

      return;
    }


    try {
      /* ---------------------------------------------------
         FIREBASE ANONYMOUS USER
         --------------------------------------------------- */

      const currentUser =
        await signInGPSUser();

      setUser(currentUser);


      /* ---------------------------------------------------
         GEOLOCATION PERMISSION
         --------------------------------------------------- */

      if (navigator.permissions?.query) {
        try {
          const permissionStatus =
            await navigator.permissions.query(
              {
                name: "geolocation"
              }
            );

          setPermission(
            permissionStatus.state
          );

          permissionStatus.onchange =
            () => {
              setPermission(
                permissionStatus.state
              );
            };
        } catch {
          // Some iOS browsers do not expose
          // geolocation permission state.
        }
      }


      /* ---------------------------------------------------
         REMOVE OLD WATCH
         --------------------------------------------------- */

      if (
        watchIdRef.current !== null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }


      /* ---------------------------------------------------
         START CONTINUOUS GPS
         --------------------------------------------------- */

      watchIdRef.current =
        navigator.geolocation.watchPosition(
          async (geo) => {
            const nextPosition = {
              latitude:
                geo.coords.latitude,

              longitude:
                geo.coords.longitude,

              accuracy:
                geo.coords.accuracy,

              heading:
                geo.coords.heading,

              speed:
                geo.coords.speed,

              timestamp:
                Date.now()
            };


            setPosition(
              nextPosition
            );

            setAccuracy(
              geo.coords.accuracy
            );

            setTracking(true);

            setPermission(
              "granted"
            );

            setMessage(
              "GPS is active."
            );

            setLastUpdate(
              Date.now()
            );


            /* ---------------------------------------------
               FIREBASE UPDATE THROTTLE
               --------------------------------------------- */

            const now = Date.now();

            if (
              currentUser &&
              now -
                lastWriteRef.current >=
                2500
            ) {
              lastWriteRef.current =
                now;


              const participantRef =
                ref(
                  database,
                  `gpsParticipants/${currentUser.uid}`
                );


              await set(
                participantRef,
                {
                  participantId,

                  latitude:
                    nextPosition.latitude,

                  longitude:
                    nextPosition.longitude,

                  accuracy:
                    nextPosition.accuracy,

                  heading:
                    nextPosition.heading ??
                    null,

                  speed:
                    nextPosition.speed ??
                    null,

                  destination:
                    selectedDestination,

                  destinationName:
                    DESTINATION_MAP[
                      selectedDestination
                    ]?.name || "",

                  insideCampus:
                    distanceMeters(
                      nextPosition.latitude,
                      nextPosition.longitude,
                      CAMPUS.lat,
                      CAMPUS.lng
                    ) <=
                    CAMPUS.radiusMeters,

                  timestamp:
                    serverTimestamp(),

                  active: true
                }
              );
            }
          },


          /* ---------------------------------------------
             GPS ERROR
             --------------------------------------------- */

          (geoError) => {
            setTracking(false);

            setPermission(
              "denied"
            );


            const messages = {
              1:
                "Location permission ay hindi pinayagan. Pindutin ang location permission ng browser at piliin ang Allow.",

              2:
                "Hindi makuha ang GPS signal. Lumipat sa lugar na may mas magandang GPS signal.",

              3:
                "Nag-timeout ang GPS. Subukan muli."
            };


            setError(
              messages[
                geoError.code
              ] ||
                geoError.message
            );

            setMessage(
              "GPS unavailable."
            );
          },


          /* ---------------------------------------------
             GPS OPTIONS
             --------------------------------------------- */

          {
            enableHighAccuracy:
              true,

            maximumAge:
              3000,

            timeout:
              20000
          }
        );
      }
    } catch (authError) {
      setError(
        "Hindi makapag-connect sa Firebase. Siguraduhing naka-enable ang Anonymous sign-in sa Firebase Authentication."
      );

      console.error(
        authError
      );
    }
  }


  /* =========================================================
     STOP GPS
     ========================================================= */

  async function stopTracking() {
    if (
      watchIdRef.current !== null
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }


    setTracking(false);

    setMessage(
      "GPS stopped."
    );


    if (user) {
      try {
        await remove(
          ref(
            database,
            `gpsParticipants/${user.uid}`
          )
        );
      } catch (
        removeError
      ) {
        console.error(
          removeError
        );
      }
    }
  }


  /* =========================================================
     FIREBASE AUTH LISTENER
     ========================================================= */

  useEffect(() => {
    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(
            currentUser
          );
        }
      );

    return () =>
      unsubscribeAuth();
  }, []);


  /* =========================================================
     FIREBASE REALTIME MONITOR
     ========================================================= */

  useEffect(() => {
    const participantsRef =
      ref(
        database,
        "gpsParticipants"
      );


    const unsubscribe =
      onValue(
        participantsRef,

        (snapshot) => {
          setParticipants(
            snapshot.val() || {}
          );
        },

        (readError) => {
          console.error(
            readError
          );

          setError(
            "Hindi mabasa ang Firebase GPS monitor. Check Firebase Database Rules."
          );
        }
      );


    return () =>
      unsubscribe();
  }, []);


  /* =========================================================
     CLEANUP GPS
     ========================================================= */

  useEffect(() => {
    return () => {
      if (
        watchIdRef.current !== null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }
    };
  }, []);


  /* =========================================================
     UPDATE DESTINATION IN FIREBASE
     ========================================================= */

  useEffect(() => {
    if (
      !user ||
      !tracking
    ) {
      return;
    }


    const participantRef =
      ref(
        database,
        `gpsParticipants/${user.uid}`
      );


    set(
      participantRef,
      {
        participantId,

        latitude:
          position?.latitude ??
          null,

        longitude:
          position?.longitude ??
          null,

        accuracy:
          position?.accuracy ??
          null,

        destination:
          selectedDestination,

        destinationName:
          selected?.name ??
          "",

        insideCampus,

        timestamp:
          serverTimestamp(),

        active: true
      }
    ).catch(
      console.error
    );
  }, [
    selectedDestination
  ]);


  /* =========================================================
     PARTICIPANT LIST
     ========================================================= */

  const participantList =
    Object.entries(
      participants
    ).map(
      ([uid, data]) => ({
        uid,
        ...data
      })
    );


  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <main className="gps-app">

      {/* ===================================================
          HEADER
          =================================================== */}

      <header className="topbar">

        <div>
          <div className="eyebrow">
            QCU CAMPUS GPS
          </div>

          <h1>
            GPS Monitor
          </h1>
        </div>


        <div
          className={`live-pill ${
            tracking
              ? "active"
              : ""
          }`}
        >
          <span className="live-dot" />

          {tracking
            ? "LIVE GPS"
            : "OFFLINE"}
        </div>

      </header>


      {/* ===================================================
          CONSENT
          =================================================== */}

      <section className="consent-card">

        <div>
          <strong>
            Location sharing
          </strong>

          <p>
            Kailangan mong pumayag
            sa browser location
            permission bago ma-share
            ang current GPS position
            sa authorized campus
            monitor.
          </p>
        </div>


        {!tracking ? (
          <button
            className="primary-button"
            onClick={
              startTracking
            }
          >
            📍 ALLOW & START GPS
          </button>
        ) : (
          <button
            className="danger-button"
            onClick={
              stopTracking
            }
          >
            ■ STOP GPS
          </button>
        )}

      </section>


      {/* ===================================================
          ERROR
          =================================================== */}

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}


      {/* ===================================================
          MAIN DASHBOARD
          =================================================== */}

      <section className="dashboard-grid">


        {/* =================================================
            MAP
            ================================================= */}

        <div className="map-panel">

          <div className="panel-heading">

            <div>

              <span className="eyebrow">
                LIVE CAMPUS VIEW
              </span>

              <h2>
                San Bartolome Campus
              </h2>

            </div>

            <span className="status-text">
              {message}
            </span>

          </div>


          <div className="campus-map">

            <div className="road road-main" />

            <div className="road road-diagonal" />


            <div className="field">
              <span>
                OPEN FIELD
              </span>
            </div>


            {/* =============================================
                BUILDINGS
                ============================================= */}

            {DESTINATIONS.map(
              (destination) => (
                <button
                  key={
                    destination.id
                  }

                  className={`building ${
                    selectedDestination ===
                    destination.id
                      ? "selected"
                      : ""
                  }`}

                  style={{
                    left:
                      `${destination.x}%`,

                    top:
                      `${destination.y}%`
                  }}

                  onClick={() =>
                    setSelectedDestination(
                      destination.id
                    )
                  }

                  title={
                    destination.description
                  }
                >

                  <span className="building-letter">
                    {
                      destination.short
                    }
                  </span>

                  <span className="building-name">
                    {
                      destination.name
                    }
                  </span>

                </button>
              )
            )}


            {/* =============================================
                USER GPS MARKER
                ============================================= */}

            <div
              className="user-marker"

              style={{
                left:
                  `${userMapPosition.left}%`,

                top:
                  `${userMapPosition.top}%`
              }}
            >

              <div className="accuracy-ring" />

              <div className="user-dot">
                ●
              </div>

              <div className="user-label">
                YOU
              </div>

            </div>


            {/* =============================================
                ROUTE
                ============================================= */}

            {selected && (
              <svg
                className="route-line"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >

                <line
                  x1={
                    userMapPosition.left
                  }

                  y1={
                    userMapPosition.top
                  }

                  x2={
                    selected.x
                  }

                  y2={
                    selected.y
                  }
                />

              </svg>
            )}


            {/* =============================================
                COMPASS
                ============================================= */}

            <div className="map-compass">
              N
            </div>


            {/* =============================================
                LEGEND
                ============================================= */}

            <div className="map-legend">

              <span>
                <i className="legend-user" />
                You
              </span>

              <span>
                <i className="legend-destination" />
                Destination
              </span>

              <span>
                <i className="legend-route" />
                Route
              </span>

            </div>

          </div>

        </div>


        {/* =================================================
            SIDE PANEL
            ================================================= */}

        <aside className="side-panel">


          {/* ===============================================
              YOUR LOCATION
              =============================================== */}

          <section className="info-card">

            <span className="eyebrow">
              YOUR LOCATION
            </span>


            {position ? (

              <>

                <div className="coordinate">

                  {position.latitude.toFixed(
                    6
                  )}

                  ,

                  {" "}

                  {position.longitude.toFixed(
                    6
                  )}

                </div>


                <div className="info-row">

                  <span>
                    Accuracy
                  </span>

                  <strong>
                    ±
                    {Math.round(
                      accuracy || 0
                    )}
                    {" "}m
                  </strong>

                </div>


                <div className="info-row">

                  <span>
                    Campus distance
                  </span>

                  <strong>
                    {
                      formatDistance(
                        campusDistance
                      )
                    }
                  </strong>

                </div>


                <div
                  className={`geofence ${
                    insideCampus
                      ? "inside"
                      : "outside"
                  }`}
                >

                  {insideCampus
                    ? "✓ WITHIN QCU CAMPUS AREA"
                    : "○ OUTSIDE CAMPUS AREA"}

                </div>

              </>

            ) : (

              <div className="waiting">

                Pindutin ang{" "}

                <b>
                  ALLOW & START GPS
                </b>

                {" "}para makuha ang
                iyong location.

              </div>

            )}

          </section>


          {/* ===============================================
              DESTINATION
              =============================================== */}

          <section className="info-card destination-card">

            <span className="eyebrow">
              DESTINATION
            </span>


            <h3>

              {selected?.short}

              {" — "}

              {selected?.name}

            </h3>


            <p>
              {
                selected?.description
              }
            </p>


            <select
              value={
                selectedDestination
              }

              onChange={(event) =>
                setSelectedDestination(
                  event.target.value
                )
              }
            >

              {DESTINATIONS.map(
                (destination) => (

                  <option
                    key={
                      destination.id
                    }

                    value={
                      destination.id
                    }
                  >

                    {destination.short}

                    {" — "}

                    {destination.name}

                  </option>

                )
              )}

            </select>


            <div className="destination-note">

              Ang route line ay visual
              campus guidance. Ang
              actual GPS position ay
              galing sa device.

            </div>

          </section>


          {/* ===============================================
              MONITOR
              =============================================== */}

          <section className="info-card">

            <span className="eyebrow">
              MONITOR
            </span>


            <div className="monitor-count">

              <strong>
                {
                  participantList.length
                }
              </strong>

              <span>
                active GPS
                participant(s)
              </span>

            </div>


            <div className="participant-list">

              {participantList.length ===
              0 ? (

                <div className="empty">
                  No active participant
                  yet.
                </div>

              ) : (

                participantList.map(
                  (participant) => (

                    <div
                      className="participant"
                      key={
                        participant.uid
                      }
                    >

                      <div className="participant-dot" />


                      <div>

                        <strong>
                          {
                            participant.participantId
                          }
                        </strong>

                        <span>
                          →
                          {" "}
                          {
                            participant.destinationName ||
                            "No destination"
                          }
                        </span>

                      </div>


                      <small>

                        {
                          formatTime(
                            typeof participant.timestamp ===
                              "number"
                              ? participant.timestamp
                              : null
                          )
                        }

                      </small>

                    </div>

                  )
                )

              )}

            </div>

          </section>

        </aside>

      </section>


      {/* ===================================================
          FOOTER
          =================================================== */}

      <footer className="footer">

        <div>

          <strong>
            {CAMPUS.name}
          </strong>

          <span>
            {CAMPUS.address}
          </span>

        </div>


        <div className="footer-right">

          <span>
            Permission:
            {" "}
            {permission}
          </span>

          <span>
            Last GPS update:
            {" "}
            {formatTime(
              lastUpdate
            )}
          </span>

        </div>

      </footer>

    </main>
  );
}
