import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import { useEffect } from "react";

import {
  CAMPUS_CENTER,
  BUILDINGS,
} from "../campusData";

function createBuildingIcon(id) {
  return L.divIcon({
    className: "building-marker-wrapper",
    html: `
      <div class="building-marker">
        ${id}
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function createUserIcon(role) {
  const roleClass =
    role || "student";

  return L.divIcon({
    className: "user-marker-wrapper",
    html: `
      <div class="user-marker ${roleClass}">
        <span></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function MapController({
  selectedUser,
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedUser) return;

    if (
      typeof selectedUser.latitude !==
        "number" ||
      typeof selectedUser.longitude !==
        "number"
    ) {
      return;
    }

    map.flyTo(
      [
        selectedUser.latitude,
        selectedUser.longitude,
      ],
      18,
      {
        duration: 1,
      }
    );
  }, [selectedUser, map]);

  return null;
}

export default function MapView({
  users = [],
  selectedUser = null,
  threeD = false,
}) {
  return (
    <div
      className={
        threeD
          ? "map-shell map-3d"
          : "map-shell"
      }
    >
      <MapContainer
        center={[
          CAMPUS_CENTER.lat,
          CAMPUS_CENTER.lng,
        ]}
        zoom={17}
        scrollWheelZoom
        className="campus-map"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          selectedUser={selectedUser}
        />

        {BUILDINGS.map(
          (building) => (
            <Marker
              key={building.id}
              position={[
                building.lat,
                building.lng,
              ]}
              icon={createBuildingIcon(
                building.id
              )}
            >
              <Popup>
                <strong>
                  {building.name}
                </strong>

                <br />

                {building.category}

                <br />

                <small>
                  {building.description}
                </small>
              </Popup>
            </Marker>
          )
        )}

        {users.map((user) => {
          if (
            typeof user.latitude !==
              "number" ||
            typeof user.longitude !==
              "number"
          ) {
            return null;
          }

          return (
            <div key={user.uid}>
              <Marker
                position={[
                  user.latitude,
                  user.longitude,
                ]}
                icon={createUserIcon(
                  user.role
                )}
              >
                <Popup>
                  <strong>
                    {user.name}
                  </strong>

                  <br />

                  {String(
                    user.role
                  ).toUpperCase()}

                  <br />

                  Accuracy:{" "}
                  {typeof user.accuracy ===
                  "number"
                    ? `${user.accuracy.toFixed(
                        1
                      )} m`
                    : "—"}

                  <br />

                  Last update:{" "}
                  {user.timestamp
                    ? new Date(
                        user.timestamp
                      ).toLocaleTimeString()
                    : "—"}
                </Popup>
              </Marker>

              <Circle
                center={[
                  user.latitude,
                  user.longitude,
                ]}
                radius={
                  typeof user.accuracy ===
                  "number"
                    ? user.accuracy
                    : 5
                }
                pathOptions={{
                  className:
                    "accuracy-circle",
                }}
              />
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
