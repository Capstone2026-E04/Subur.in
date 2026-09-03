"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { API_URL as API_BASE } from "@/services/api";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface SensorData {
  ph: number | null;
  moisture: number | null;
  lastUpdated: string | null;
  connectionStatus: ConnectionStatus;
}

const RECONNECT_DELAY_MS = 5000;

export function useSensorRealtime(deviceId: string): SensorData {
  const [ph, setPh] = useState<number | null>(null);
  const [moisture, setMoisture] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const openStreamRef = useRef<(() => void) | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/sensors/${deviceId}/latest`
      );
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success && json?.data && isMountedRef.current) {
        const { ph: p, moisture: m, timestamp } = json.data;
        if (p !== undefined) setPh(p);
        if (m !== undefined) setMoisture(m);
        if (timestamp) setLastUpdated(timestamp);
      }
    } catch {
    }
  }, [deviceId]);

  const openStream = useCallback(() => {
    if (!isMountedRef.current) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setConnectionStatus("connecting");

    const es = new EventSource(
      `${API_BASE}/api/sensors/${deviceId}/stream`
    );
    esRef.current = es;

    es.onopen = () => {
      if (isMountedRef.current) setConnectionStatus("connected");
      
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission();
        }
      }
    };

    es.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const payload = JSON.parse(event.data);

        if (payload?.connected === true) {
          setConnectionStatus("connected");
          return;
        }

        // Tangani event notifikasi real-time browser dari backend
        if (payload?.notification) {
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification(payload.notification.title, {
                body: payload.notification.message,
                icon: "/favicon.ico",
              });
            }
          }
        }

        if (payload?.ph !== undefined) setPh(payload.ph);
        if (payload?.moisture !== undefined) setMoisture(payload.moisture);
        if (payload?.timestamp) setLastUpdated(payload.timestamp);
        setConnectionStatus("connected");
      } catch {
        // malformed JSON — ignore
      }
    };

    es.onerror = () => {
      if (!isMountedRef.current) return;
      setConnectionStatus("disconnected");
      es.close();
      esRef.current = null;

      // Fetch via REST as fallback
      fetchLatest();

      // Schedule reconnect
      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) openStreamRef.current?.();
      }, RECONNECT_DELAY_MS);
    };
  }, [deviceId, fetchLatest]);

  useEffect(() => {
    openStreamRef.current = openStream;
  }, [openStream]);

  useEffect(() => {
    isMountedRef.current = true;

    // Run async to avoid synchronous setState inside effect
    const initTimer = setTimeout(() => {
      fetchLatest();
      openStream();
    }, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimer);

      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [fetchLatest, openStream]);

  return { ph, moisture, lastUpdated, connectionStatus };
}
