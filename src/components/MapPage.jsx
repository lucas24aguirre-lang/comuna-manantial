import React, { useRef, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { Container, Title, Paper, Button, Text, Box, useMantineColorScheme, Group, Badge, SimpleGrid } from "@mantine/core";
import { IconMapPin, IconCurrentLocation, IconMap2 } from "@tabler/icons-react";
import L from "leaflet";

const PLAZA = [-26.84808, -65.28191];

// Custom Leaflet marker definitions
const plazaIcon = L.divIcon({
  className: 'custom-plaza-marker',
  html: `
    <div style="position: relative; width: 40px; height: 40px;">
      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #75AADB 0%, #5385AD 100%); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(117, 170, 219, 0.5); display: flex; align-items: center; justify-content: center;">
        <span style="transform: rotate(45deg); color: white; font-size: 20px; margin-top: -4px; margin-left: -2px;">🌲</span>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div style="width: 20px; height: 20px; background: #3b82f6; border: 4px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3); animation: pulse 2s infinite;"></div>
    <style>@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3); } 50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3); } }</style>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

/**
 * Helper component to handle map resizing and listen for external 'center-map' events.
 * Necessary because Leaflet needs to invalidate size when containers resize/load.
 */
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
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  // Dispatch event to reset view to default coordinates
  const recenterPlaza = () => {
    window.dispatchEvent(new CustomEvent("app-center-map", {
      detail: { lat: PLAZA[0], lng: PLAZA[1], zoom: 17 }
    }));
  };

  // Handle browser Geolocation API
  const goToMyLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada en este dispositivo.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);
        window.dispatchEvent(
          new CustomEvent("app-center-map", {
            detail: { lat: latitude, lng: longitude, zoom: 17 },
          })
        );
        setLoading(false);
      },
      () => {
        alert("No se pudo obtener tu ubicación.");
        setLoading(false);
      }
    );
  };

  return (
    <Container size="xl" mt="xl">
      <Box
        mb="md"
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, #334155 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)',
          borderRadius: 20,
          padding: '30px 20px',
          color: 'white',
          textAlign: 'center',
          boxShadow: isDark 
            ? '0 8px 32px rgba(51, 65, 85, 0.5)'
            : '0 8px 32px rgba(117, 170, 219, 0.3)'
        }}
      >
        <Title 
          order={1} 
          style={{ 
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 900,
            marginBottom: 8,
            letterSpacing: '-1px',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}
        >
          🗺️ Mapa Interactivo
        </Title>
        <Text size="lg" opacity={0.95} fw={500}>
          Explora El Manantial y ubica puntos de interés
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" mb="md">
        <Button
          size="md"
          variant="gradient"
          gradient={{ from: '#75AADB', to: '#5385AD', deg: 90 }}
          leftSection={<IconMap2 size={18} />}
          onClick={recenterPlaza}
          fullWidth
          style={{ boxShadow: '0 4px 16px rgba(117, 170, 219, 0.4)', borderRadius: 12 }}
        >
          Plaza Central
        </Button>

        <Button
          size="md"
          variant="filled"
          color="blue"
          leftSection={<IconCurrentLocation size={18} />}
          onClick={goToMyLocation}
          loading={loading}
          fullWidth
          style={{
            borderRadius: 12,
            backgroundColor: isDark ? '#5385AD' : '#75AADB',
            boxShadow: '0 4px 12px rgba(117, 170, 219, 0.4)',
          }}
          styles={{ root: { '&:hover': { backgroundColor: isDark ? '#437498' : '#5385AD' } } }}
        >
          Mi Ubicación
        </Button>
      </SimpleGrid>

      <Paper 
        shadow="xl" radius="xl" withBorder p={0}
        style={{
          overflow: 'hidden',
          zIndex: 0, // Ensures the map stays behind overlay components
          position: 'relative',
          border: isDark ? '3px solid rgba(117, 170, 219, 0.3)' : '3px solid rgba(117, 170, 219, 0.4)'
        }}
      >
        <div style={{ height: "clamp(50vh, 65vh, 600px)", width: "100%" }}>
          <MapContainer
            center={PLAZA}
            zoom={17}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
          >
            <TileLayer
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              maxZoom={20}
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
              attribution="© Google"
            />

            <MapHelpers center={PLAZA} />

            <Marker position={PLAZA} icon={plazaIcon}>
              <Popup>
                <Box style={{ padding: 8, minWidth: 200 }}>
                  <Group mb="xs">
                    <Badge variant="gradient" gradient={{ from: '#75AADB', to: '#5385AD' }} size="lg">
                      Punto de Interés
                    </Badge>
                  </Group>
                  <Title order={4} mb={4} style={{ color: '#5385AD' }}>Plaza San Martín</Title>
                  <Text size="sm" c="dimmed">Centro de El Manantial, Tucumán</Text>
                  <Text size="xs" c="dimmed" mt="xs" fs="italic">🌲 Punto de encuentro comunitario</Text>
                </Box>
              </Popup>
            </Marker>

            {userPos && (
              <>
                <Marker position={userPos} icon={userLocationIcon}>
                  <Popup>
                    <Box style={{ padding: 8 }}>
                      <Group mb="xs">
                        <Badge color="blue" size="sm">Tu ubicación</Badge>
                      </Group>
                      <Text size="sm" fw={600}>📍 Estás aquí</Text>
                    </Box>
                  </Popup>
                </Marker>
                <Circle
                  center={userPos}
                  radius={30}
                  pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.15, weight: 2 }}
                />
              </>
            )}
          </MapContainer>
        </div>
      </Paper>

      <Group justify="center" mt="xl" gap="md">
        <Paper 
          shadow="md" radius="lg" p="md" withBorder
          style={{
            background: 'var(--mantine-color-body)',
            borderColor: isDark ? 'rgba(117, 170, 219, 0.2)' : 'rgba(117, 170, 219, 0.3)',
            borderWidth: 2
          }}
        >
          <Group gap="xs">
            <Box style={{ background: 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconMapPin size={20} color="white" stroke={2.5} />
            </Box>
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">Ubicación</Text>
              <Text size="sm" fw={600}>El Manantial, Tucumán</Text>
            </Box>
          </Group>
        </Paper>

        <Paper 
          shadow="md" radius="lg" p="md" withBorder
          style={{
            background: 'var(--mantine-color-body)',
            borderColor: isDark ? 'rgba(117, 170, 219, 0.2)' : 'rgba(117, 170, 219, 0.3)',
            borderWidth: 2
          }}
        >
          <Group gap="xs">
            <Box style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text size="xl">🌳</Text>
            </Box>
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">Zona</Text>
              <Text size="sm" fw={600}>Comuna Rural</Text>
            </Box>
          </Group>
        </Paper>
      </Group>
    </Container>
  );
}