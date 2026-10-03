# Sistema de diseno

Estado: propuesta para revision, sin cambios en la interfaz.
Fecha: 2026-10-01.

## Objetivo
Leer y operar con la misma gramatica visual en toda la plataforma.

## Fuente actual
src/app/globals.css, src/components/ui/, src/components/ui/Logo.tsx

## Requisitos
1. Definir superficies neutras, dorado reservado para seleccion/CTA y colores semanticos; mantener isotipo PNG vigente y Geist.
2. Cuerpo 14-16px, inputs 16px en movil, metadata >=12px; titulares operativos 20-28px; letter-spacing 0.
3. Escala espacial 4/8/12/16/24/32; radios <=8px para controles y cards, sin tarjetas dentro de tarjetas.
4. Consolidar Button, Field, Input, Badge, ConfirmDialog, Skeleton y Toast; introducir PageHeader/Toolbar solo donde haya reutilizacion real.

## Validacion
Un control presenta el mismo estado, etiqueta y area tactil en reserva, admin, empleado y owner.

Ver el [contrato global](../README.md) para accesibilidad, compatibilidad y pruebas.

