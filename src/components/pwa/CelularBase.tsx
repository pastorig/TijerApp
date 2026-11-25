"use client";

/**
 * Lo que el celular necesita medir antes que cualquier pantalla (feature 041).
 * No dibuja nada. Va en el layout raíz.
 *
 * - App instalada en el iPhone: deja `data-ios-gap` en <html> (el script del
 *   <head> ya lo prendió si correspondía) y `--tj-ios-gap` con cuánto le falta
 *   a lo fijo para llegar abajo. Portado de Dentidad (`IosStandaloneGap`).
 * - Modo liviano (045): `tj-lento` / `tj-muy-lento` en <html> según lo que
 *   informa el equipo y lo que se mide al scrollear (`@/lib/rendimiento`).
 */

import { useEffect } from "react";
import { computeIosStandaloneGap } from "@/lib/ios-standalone-gap";
import {
  CLAVE_NIVEL,
  combinar,
  guardar,
  leerGuardado,
  nivelPorCuadros,
  nivelPorEquipo,
  type Nivel,
} from "@/lib/rendimiento";

function sonda(alto: string) {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:fixed;top:0;left:0;width:0;height:${alto};visibility:hidden;pointer-events:none;`;
  document.body.appendChild(el);
  return el;
}

export function CelularBase() {
  // Modo liviano (feature 045): lo que dice el equipo + lo que se mide.
  useEffect(() => {
    const html = document.documentElement;
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    let guardado: Nivel | null = null;
    try {
      guardado = leerGuardado(localStorage.getItem(CLAVE_NIVEL), Date.now());
    } catch {
      // Sin almacenamiento (modo privado): se mide igual, no se guarda.
    }
    let nivel: Nivel = combinar(
      guardado ?? 0,
      nivelPorEquipo({
        memoriaGb: nav.deviceMemory,
        nucleos: nav.hardwareConcurrency,
        ahorroDeDatos: nav.connection?.saveData === true,
      }),
    );

    function aplicar() {
      html.classList.toggle("tj-lento", nivel === 1);
      html.classList.toggle("tj-muy-lento", nivel === 2);
      if (nivel === 2) {
        // Las animaciones de Framer Motion (reserva, landing) también se
        // apagan. Se carga solo si hace falta: no pesa en los equipos buenos.
        void import("framer-motion").then((m) => {
          m.MotionGlobalConfig.skipAnimations = true;
        });
      }
      try {
        localStorage.setItem(CLAVE_NIVEL, guardar(nivel, Date.now()));
      } catch {
        // idem
      }
    }
    aplicar();

    // Medir mientras se scrollea: hasta 4 tandas de 1,5 s por visita. Ya en
    // el nivel más liviano no hace falta medir más.
    let tandas = 0;
    let midiendo = false;
    let anterior: Nivel | null = null;
    function medir() {
      if (midiendo || tandas >= 4 || nivel === 2 || document.visibilityState !== "visible") return;
      midiendo = true;
      tandas++;
      const deltas: number[] = [];
      let ultimo = performance.now();
      const fin = ultimo + 1500;
      function cuadro(t: number) {
        deltas.push(t - ultimo);
        ultimo = t;
        if (t < fin) {
          requestAnimationFrame(cuadro);
          return;
        }
        midiendo = false;
        const medido = nivelPorCuadros(deltas);
        if (medido === null || medido <= nivel) {
          anterior = null;
          return;
        }
        // Hacen falta DOS tandas seguidas peores: un tirón suelto (una
        // pantalla que recién carga) no puede alivianar un equipo bueno.
        if (anterior !== null) {
          const antes = nivel;
          nivel = combinar(nivel, Math.min(anterior, medido) as Nivel);
          if (nivel !== antes) aplicar();
          anterior = null;
        } else {
          anterior = medido;
        }
      }
      requestAnimationFrame(cuadro);
    }
    document.addEventListener("scroll", medir, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", medir, { capture: true });
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
