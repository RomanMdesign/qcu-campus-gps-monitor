import { useEffect, useState } from "react";

import {
  database,
  ref,
  set,
  remove,
  onDisconnect,
  update,
} from "../firebase";

import useGeolocation from "../hooks/useGeolocation";

export default function StudentTracker({
  user,
  onLogout,
}) {
  const [sharing, setSharing] = useState(false);

  const [saving, setSaving] = useState(false);

  const {
    location,
    error,
    permissionState,
  } = useGeolocation({
    enabled: sharing,
    watch: true,
  });

  useEffect(() => {
    if (!user) return;

    const userRef = ref(
      database,
      `users/${user.uid}`
    );

    update(userRef, {
      status: "online",
      lastSeen: Date.now(),
    });

    return () => {
      update(userRef, {
        status: "offline",
        lastSeen: Date.now(),
      });
    };
  }, [user]);

  useEffect(() => {
    if (!user || !location || !sharing) {
      return;
    }

    async function publishLocation() {
      setSaving(true);

      try {
        const locationRef = ref(
          database,
          `locations/${user.uid}`
        );

        const payload = {
          uid: user.uid,
          name:
            user.displayName ||
            user.email ||
            "User",
          role:
            user.role ||
            "student",

          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,

          altitude:
            location.altitude ?? null,

          heading:
            location.heading ?? null,

          speed:
            location.speed ?? null,

          timestamp: Date.now(),
          sharing: true,
        };

        await set(
          locationRef,
          payload
        );

        await onDisconnect(
          locationRef
        ).remove();

        await update(
          ref(
            database,
            `users/${user.uid}`
          ),
          {
            status: "online",
            lastSeen: Date.now(),
            sharing: true,
          }
        );
      } finally {
        setSaving(false);
      }
    }

    publishLocation();
  }, [location, sharing, user]);

  async function stopSharing() {
    setSharing(false);

    await remove(
      ref(
        database,
        `locations/${user.uid}`
      )
    );

    await update(
      ref(
        database,
        `users/${user.uid}`
      ),
      {
        status: "online",
        sharing: false,
        lastSeen: Date.now(),
      }
    );
  }

  async function logout() {
    await stopSharing();
    onLogout();
  }

  return (
    <div className="student-layout">
      <header className="top-header">
        <div className="brand">
          <strong>
            QUEZON CITY UNIVERSITY
          </strong>

          <span>
            SAN BARTOLOME CAMPUS
          </span>
        </div>

        <div className="system-title">
          <strong>
            QCU CAMPUS GPS MONITOR
          </strong>

          <span>
            LIVE LOCATION TRACKING SYSTEM
          </span>
        </div>

        <div className="system-status">
          <span className="status-dot" />
          SYSTEM ACTIVE
        </div>
      </header>

      <main className="student-main">
        <section className="panel hero-panel">
          <div className="section-title">
            STUDENT GPS LOCATION
          </div>

          <h2>
            Welcome,{" "}
            {user.displayName ||
              user.email}
          </h2>

          <p className="muted">
            Your location is not shared
            unless you explicitly start
            location sharing.
          </p>

          <div
            className={
              sharing
                ? "sharing-status live"
                : "sharing-status"
            }
          >
            <span className="status-dot" />

            {sharing
              ? "LOCATION SHARING ACTIVE"
              : "LOCATION SHARING OFF"}
          </div>

          {!sharing ? (
            <button
              className="primary-button large"
              onClick={() =>
                setSharing(true)
              }
            >
              START SHARING LOCATION
            </button>
          ) : (
            <button
              className="danger-button large"
              onClick={stopSharing}
            >
              STOP SHARING
            </button>
          )}

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {permissionState ===
            "denied" && (
            <div className="warning-box">
              Location permission is
              disabled. Enable location
              permission in your browser
              settings.
            </div>
          )}
        </section>

        <section className="location-grid">
          <div className="panel">
            <div className="section-title">
              LOCATION DETAILS
            </div>

            <div className="data-row">
              <span>STATUS</span>
              <strong>
                {sharing
                  ? "ONLINE / SHARING"
                  : "ONLINE"}
              </strong>
            </div>

            <div className="data-row">
              <span>LATITUDE</span>
              <strong>
                {location
                  ? location.latitude.toFixed(
                      7
                    )
                  : "—"}
              </strong>
            </div>

            <div className="data-row">
              <span>LONGITUDE</span>
              <strong>
                {location
                  ? location.longitude.toFixed(
                      7
                    )
                  : "—"}
              </strong>
            </div>

            <div className="data-row">
              <span>ACCURACY</span>
              <strong>
                {location
                  ? `${location.accuracy.toFixed(
                      1
                    )} m`
                  : "—"}
              </strong>
            </div>

            <div className="data-row">
              <span>LAST UPDATE</span>
              <strong>
                {location
                  ? new Date(
                      location.timestamp
                    ).toLocaleTimeString()
                  : "—"}
              </strong>
            </div>
          </div>

          <div className="panel">
            <div className="section-title">
              GPS INFORMATION
            </div>

            <p>
              High-accuracy browser GPS is
              used when location sharing is
              active.
            </p>

            <p>
              {saving
                ? "Updating Firebase..."
                : sharing
                ? "Location synchronized."
                : "Waiting for location sharing."}
            </p>

            <div className="privacy-card">
              <strong>
                PRIVACY
              </strong>

              <span>
                You control when your
                location is shared.
              </span>
            </div>
          </div>
        </section>

        <button
          className="secondary-button"
          onClick={logout}
        >
          SIGN OUT
        </button>
      </main>
    </div>
  );
}
