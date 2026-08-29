import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  auth,
  database,
  ref,
  onValue,
} from "../firebase";

import {
  signOut,
} from "firebase/auth";

import MapView from "./MapView";

import {
  BUILDINGS,
} from "../campusData";

export default function AdminDashboard({
  user,
}) {
  const [users, setUsers] = useState([]);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [threeD, setThreeD] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [lastUpdate, setLastUpdate] =
    useState(null);

  useEffect(() => {
    const locationsRef = ref(
      database,
      "locations"
    );

    return onValue(
      locationsRef,
      (snapshot) => {
        const data =
          snapshot.val() || {};

        const list = Object.values(
          data
        );

        setUsers(list);
        setLastUpdate(new Date());
      }
    );
  }, []);

  const filteredUsers =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      if (!term) {
        return users;
      }

      return users.filter(
        (item) =>
          String(item.name)
            .toLowerCase()
            .includes(term) ||
          String(item.role)
            .toLowerCase()
            .includes(term)
      );
    }, [users, search]);

  async function logout() {
    await signOut(auth);
  }

  return (
    <div className="admin-app">
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

        <div className="admin-actions">
          <div className="system-status">
            <span className="status-dot" />
            SYSTEM ACTIVE
          </div>

          <button
            className="secondary-button"
            onClick={logout}
          >
            SIGN OUT
          </button>
        </div>
      </header>

      <main className="admin-layout">
        <aside className="sidebar">
          <section className="panel users-panel">
            <div className="panel-heading">
              <span>
                USERS (LIVE)
              </span>

              <strong>
                {users.length}
              </strong>
            </div>

            <input
              className="search-input"
              placeholder="Search user..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <div className="user-list">
              {filteredUsers.length ===
              0 ? (
                <div className="empty-state">
                  No active locations.
                </div>
              ) : (
                filteredUsers.map(
                  (item) => (
                    <button
                      key={item.uid}
                      className={
                        selectedUser?.uid ===
                        item.uid
                          ? "user-item selected"
                          : "user-item"
                      }
                      onClick={() =>
                        setSelectedUser(
                          item
                        )
                      }
                    >
                      <span
                        className={`role-dot ${
                          item.role ||
                          "student"
                        }`}
                      />

                      <span className="user-info">
                        <strong>
                          {item.name}
                        </strong>

                        <small>
                          {String(
                            item.role ||
                              "student"
                          ).toUpperCase()}
                        </small>
                      </span>

                      <span className="live-label">
                        LIVE
                      </span>
                    </button>
                  )
                )
              )}
            </div>
          </section>

          {selectedUser && (
            <section className="panel">
              <div className="section-title">
                LOCATION DETAILS
              </div>

              <h3>
                {selectedUser.name}
              </h3>

              <div className="data-row">
                <span>ROLE</span>
                <strong>
                  {String(
                    selectedUser.role
                  ).toUpperCase()}
                </strong>
              </div>

              <div className="data-row">
                <span>LATITUDE</span>
                <strong>
                  {selectedUser.latitude?.toFixed(
                    7
                  )}
                </strong>
              </div>

              <div className="data-row">
                <span>LONGITUDE</span>
                <strong>
                  {selectedUser.longitude?.toFixed(
                    7
                  )}
                </strong>
              </div>

              <div className="data-row">
                <span>ACCURACY</span>
                <strong>
                  {typeof selectedUser.accuracy ===
                  "number"
                    ? `${selectedUser.accuracy.toFixed(
                        1
                      )} m`
                    : "—"}
                </strong>
              </div>

              <div className="data-row">
                <span>LAST UPDATE</span>
                <strong>
                  {selectedUser.timestamp
                    ? new Date(
                        selectedUser.timestamp
                      ).toLocaleTimeString()
                    : "—"}
                </strong>
              </div>
            </section>
          )}

          <section className="panel">
            <div className="section-title">
              MAP CONTROLS
            </div>

            <button
              className="control-button"
              onClick={() =>
                setSelectedUser(null)
              }
            >
              CENTER CAMPUS
            </button>

            <button
              className="control-button"
              onClick={() =>
                setThreeD(
                  (value) => !value
                )
              }
            >
              {threeD
                ? "2D MAP"
                : "3D MAP"}
            </button>
          </section>
        </aside>

        <section className="map-section">
          <div className="map-header">
            <div>
              <strong>
                CAMPUS MAP
              </strong>

              <span>
                {lastUpdate
                  ? `Updated ${lastUpdate.toLocaleTimeString()}`
                  : "Waiting for live data"}
              </span>
            </div>

            <div className="map-toggle">
              <button
                className={
                  !threeD
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setThreeD(false)
                }
              >
                2D MAP
              </button>

              <button
                className={
                  threeD
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setThreeD(true)
                }
              >
                3D MAP
              </button>
            </div>
          </div>

          <MapView
            users={users}
            selectedUser={
              selectedUser
            }
            threeD={threeD}
          />

          <div className="map-you-here">
            <strong>
              LIVE USERS
            </strong>

            <span>
              {users.length} location
              {users.length !== 1
                ? "s"
                : ""}{" "}
              currently sharing
            </span>
          </div>
        </section>
      </main>

      <section className="bottom-grid">
        <div className="panel">
          <div className="section-title">
            BUILDING DIRECTORY
          </div>

          <div className="building-grid">
            {BUILDINGS.map(
              (building) => (
                <div
                  className="building-card"
                  key={building.id}
                >
                  <span className="building-id">
                    {building.id}
                  </span>

                  <div>
                    <strong>
                      {building.name}
                    </strong>

                    <small>
                      {building.category}
                    </small>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="panel">
          <div className="section-title">
            SYSTEM NOTIFICATIONS
          </div>

          <div className="notification">
            <strong>
              {users.length}
            </strong>

            active location
            {users.length !== 1
              ? "s"
              : ""}{" "}
            currently monitored.
          </div>

          <div className="notification">
            Live Firebase synchronization
            is active.
          </div>
        </div>
      </section>
    </div>
  );
}
