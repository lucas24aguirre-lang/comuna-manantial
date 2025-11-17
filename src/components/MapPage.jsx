// src/components/MapPage.jsx
import React, { useRef, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { Container, Title, Paper, Button } from "@mantine/core";
import L from "leaflet";

const PLAZA = [-26.84808, -65.28191];

const customIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -38],
});

L.Marker.prototype.options.icon = customIcon;

function MapHelpers({ center }) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map]);

  useEffect(() => {
    const handler = (e) => {
      const { lat, lng, zoom } = e.detail || {};
      if (lat && lng) {
        map.setView([lat, lng], zoom ?? map.getZoom(), { animate: true });
      } else {
        map.setView(center, zoom ?? map.getZoom(), { animate: true });
      }
    };
    window.addEventListener("app-center-map", handler);
    return () => window.removeEventListener("app-center-map", handler);
  }, [map, center]);

  return null;
}

export default function MapPage() {
  const mapRef = useRef(null);
  const [userPos, setUserPos] = useState(null);

  const recenterPlaza = () => {
    window.dispatchEvent(new CustomEvent("app-center-map", {
      detail: { lat: PLAZA[0], lng: PLAZA[1], zoom: 17 }
    }));
  };

  const goToMyLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada en este dispositivo.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);

        window.dispatchEvent(
          new CustomEvent("app-center-map", {
            detail: { lat: latitude, lng: longitude, zoom: 17 },
          })
        );
      },
      () => alert("No se pudo obtener tu ubicación.")
    );
  };

  return (
    <Container size="lg" mt="xl" style={{ position: "relative" }}>
      <Title order={1} ta="center" mb="md">
        Mapa — El Manantial
      </Title>

      <Button
        size="xs"
        style={{
          position: "absolute",
          right: 18,
          top: 86,
          zIndex: 1200,
          borderRadius: 999,
        }}
        onClick={recenterPlaza}
      >
        Centrar plaza
      </Button>

      <Button
        size="xs"
        style={{
          position: "absolute",
          right: 18,
          top: 130,
          zIndex: 1200,
          borderRadius: 999,
        }}
        onClick={goToMyLocation}
      >
        Mi ubicación
      </Button>

      <Paper shadow="md" radius="md" withBorder p={0}>
        <div style={{ height: "72vh", width: "100%", borderRadius: 12, overflow: "hidden" }}>
          <MapContainer
            center={PLAZA}
            zoom={17}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
          >
            <TileLayer
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              maxZoom={20}
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
              attribution="© Google"
            />

            <MapHelpers center={PLAZA} />

            <Marker position={PLAZA}>
              <Popup>
                <strong>Plaza San Martín</strong>
                <div style={{ fontSize: 13, color: "#666" }}>
                  El Manantial — Tucumán
                </div>
              </Popup>
            </Marker>

            {userPos && (
              <>
                <Marker
                  position={userPos}
                  icon={L.divIcon({
                    className: "my-location-dot",
                    html: `<div style="
                      width: 12px; height: 12px; 
                      background: #4285F4;
                      border-radius: 50%;
                      border: 2px solid white;
                      box-shadow: 0 0 8px rgba(0,0,0,0.3);
                    "></div>`,
                  })}
                />
                <Circle
                  center={userPos}
                  radius={20}
                  pathOptions={{ color: "#4285F4", fillOpacity: 0.2 }}
                />
              </>
            )}
          </MapContainer>
        </div>
      </Paper>
    </Container>
  );
}