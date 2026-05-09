"use client";

import { useEffect, useRef, useState } from "react";
import { buildRoute } from "@/lib/routes";

const API = process.env.NEXT_PUBLIC_API_URL || "";

type MunicipioPoint = {
  id: number;
  nombre: string;
  lat: number | null;
  lng: number | null;
  tiene_ac: boolean;
  actas_procesadas: number;
};

export function MapaCatalunyaLeaflet() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [count, setCount] = useState<{ total: number; ac: number } | null>(null);

  useEffect(() => {
    let observer: MutationObserver | null = null;
    const syncTheme = () =>
      setTheme(
        document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
      );
    syncTheme();
    observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      // Leaflet CSS via CDN (no bundler CSS import needed)
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);
      }
      if (cancelled || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [41.82, 1.75],
        zoom: 8,
        minZoom: 7,
        maxZoom: 16,
        zoomControl: true,
        attributionControl: true,
        worldCopyJump: false,
      });
      mapRef.current = map;

      // Catalunya bounds
      map.setMaxBounds([
        [40.4, 0.0],
        [42.9, 3.4],
      ]);

      markersLayerRef.current = L.layerGroup().addTo(map);

      setReady(true);

      // Fetch municipios
      try {
        const res = await fetch(`${API}/api/municipios/geo/points`);
        if (!res.ok) return;
        const list: MunicipioPoint[] = await res.json();
        let ac = 0;
        list.forEach((m) => {
          if (m.lat == null || m.lng == null) return;
          const isAC = !!m.tiene_ac;
          if (isAC) ac++;
          const marker = L.circleMarker([m.lat, m.lng], {
            radius: isAC ? 6 : 3,
            color: isAC ? "#3A7DB5" : "#6B8BA8",
            fillColor: isAC ? "#0F4C81" : "#6B8BA8",
            fillOpacity: isAC ? 0.85 : 0.35,
            weight: isAC ? 1.5 : 0.5,
          });
          marker.bindTooltip(
            `<div style="font-family: 'DM Sans', system-ui, sans-serif;">
              <div style="font-weight: 500; font-size: 12px;">${m.nombre}</div>
              <div style="font-size: 10px; opacity: .8;">${isAC ? "AC present · " : ""}${m.actas_procesadas || 0} actes</div>
            </div>`,
            { direction: "top", offset: [0, -4] }
          );
          marker.on("click", () => {
            window.location.href = buildRoute("municipis", m.id);
          });
          marker.addTo(markersLayerRef.current);
        });
        if (!cancelled) setCount({ total: list.length, ac });
      } catch {
        /* noop */
      }
    };
    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Swap tiles when theme changes
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }
      const url =
        theme === "light"
          ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      tileLayerRef.current = L.tileLayer(url, {
        maxZoom: 19,
        subdomains: "abcd",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(mapRef.current);
    })();
  }, [ready, theme]);

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: ".5px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: ".5px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span style={{ color: "var(--text-meta)" }}>Mapa territorial · Catalunya</span>
        {count && (
          <span style={{ color: "var(--text-secondary)", textTransform: "none", letterSpacing: 0 }}>
            <span style={{ color: "var(--brand-l)" }}>●</span> {count.ac} AC · {count.total} municipis
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        style={{ width: "100%", minHeight: 420, flex: 1, background: "var(--bg-elevated)" }}
      />
      <div
        style={{
          padding: "8px 14px",
          borderTop: ".5px solid var(--border)",
          display: "flex",
          gap: 14,
          alignItems: "center",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-meta)",
          letterSpacing: ".06em",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#0F4C81",
              border: "1px solid #3A7DB5",
            }}
          />
          AC present
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#6B8BA8",
              opacity: 0.5,
            }}
          />
          Altres municipis
        </span>
        <span style={{ marginLeft: "auto", opacity: 0.7 }}>Clic al marcador per obrir la fitxa</span>
      </div>
    </div>
  );
}
