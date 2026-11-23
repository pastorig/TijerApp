# Data Model: 040 Ingresar con Google

**Sin migraciones.** No hay tablas ni columnas nuevas.

| Concepto | Dónde vive | Cambio |
|---|---|---|
| Cuenta de usuario | `auth.users` (Supabase) | Puede sumar una identidad `google` en `auth.identities`. El `id` no cambia. |
| Dueño de barbería | `barbershop_admins` (`user_id`, `barbershop_slug`, `role`) | Ninguno. |
| Empleado | `barber_staff_access` (por `user_id`) | Ninguno. |
| Alta pendiente | derivado | Usuario con sesión válida, sin filas en `barbershop_admins` ni en `barber_staff_access`. No se guarda. |

## Transiciones

```
(sin cuenta) --entra con Google--> Alta pendiente --completa datos--> Dueño (barbería + prueba 14 días)
Cuenta mail+clave --entra con Google, mismo mail--> misma cuenta con 2 formas de entrar
Alta pendiente --cierra y vuelve a entrar--> Alta pendiente (vuelve a /registro/completar)
```

## Validaciones del alta con Google

- Mail: el del token verificado (`email_verified = true`); nunca el que mande el formulario.
- Nombre de la barbería, nombre del dueño y WhatsApp: las mismas reglas que `/api/registro`.
- Si el usuario ya administra una barbería, el alta responde con el slug existente y no crea otra.
