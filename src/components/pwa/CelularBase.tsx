"use client";

/**
 * Lo que el celular necesita medir antes que cualquier pantalla (feature 041).
 * No dibuja nada. Va en el layout raíz.
 *
 * - App instalada en el iPhone: deja `data-ios-gap` en <html> (el script del
 *   <head> ya lo prendió si correspondía) y `--tj-ios-gap` con cuánto le falta
 *   a lo fijo para llegar abajo. Portado de Dentidad (`IosStandaloneGap`).
 * - Equipos flojos: `tj-lento` / `tj-muy-lento` en <html> bajan el desenfoque
 *   del vidrio para que el scroll no se trabe.
 */

import { useEffect } from "react";
import { computeIosStandaloneGap, nivelDeEquipo } from "@/lib/ios-standalone-gap";

function sonda(alto: string) {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:fixed;top:0;left:0;width:0;height:${alto};visibility:hidden;pointer-events:none;`;
  document.body.appendChild(el);
  return el;
}

export function CelularBase() {
  // Nivel de desenfoque según el equipo.
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const nivel = nivelDeEquipo({ memoriaGb: nav.deviceMemory, nucleos: nav.hardwareConcurrency });
    const html = document.documentElement;
    html.classList.toggle("tj-lento", nivel === 1);
    html.classList.toggle("tj-muy-lento", nivel === 2);
  }, []);

  // La app instalada en el iPhone.
  useEffect(() => {
    const html = document.documentElement;
    const pantalla = sonda("100vh");
    const dinamica = sonda("100dvh");
    const standalone = window.matchMedia("(display-mode: standalone)");
    const ios =
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      // El iPad se presenta como Mac; lo delata la pantalla táctil.
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // Una vez detectado queda fijo: al estirar la app iOS vuelve a medir la
    // ventana entera y la detección "titilaba" (Dentidad, 13/11/2026).
    let detectado = html.hasAttribute("data-ios-gap");
    let mayorGap = 0;

    function medir() {
      const { panelCorto, bajarFijos } = computeIosStandaloneGap({
        ios,
        standalone:
          standalone.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true,
        fullHeight: pantalla.getBoundingClientRect().height,
        dynamicHeight: dinamica.getBoundingClientRect().height,
        innerHeight: window.innerHeight,
      });
      if (panelCorto || detectado) {
        detectado = true;
        mayorGap = Math.max(mayorGap, bajarFijos);
        html.style.setProperty("--tj-ios-gap", `${mayorGap}px`);
        html.setAttribute("data-ios-gap", "");
      }
    }

    medir();
    // Al abrir desde el ícono, iOS achica la ventana un rato después y sin
    // avisar: se vuelve a medir unas veces.
    const tardes = [400, 1200, 3000, 6000].map((ms) => window.setTimeout(medir, ms));
    window.addEventListener("resize", medir);
    window.addEventListener("orientationchange", medir);
    window.addEventListener("pageshow", medir);
    window.visualViewport?.addEventListener("resize", medir);
    document.addEventListener("visibilitychange", medir);
    return () => {
      tardes.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("resize", medir);
      window.removeEventListener("orientationchange", medir);
      window.removeEventListener("pageshow", medir);
      window.visualViewport?.removeEventListener("resize", medir);
      document.removeEventListener("visibilitychange", medir);
      pantalla.remove();
      dinamica.remove();
    };
  }, []);

  return null;
}
