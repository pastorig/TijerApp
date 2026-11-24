# Quickstart: configurar Google (lo hace Bautista, ~15 minutos)

Esto se hace una sola vez. Las claves no se pegan en el chat: van directo a Google, Supabase y Vercel.

## 1. Google Cloud: crear el proyecto

1. Entrá a https://console.cloud.google.com con tu cuenta de Google.
2. Arriba a la izquierda, selector de proyectos → **Proyecto nuevo** → nombre `TijerApp` → **Crear**.
   Fijate que quede seleccionado.

## 2. Pantalla de consentimiento (lo que ve el barbero)

1. Menú → **APIs y servicios** → **Pantalla de consentimiento de OAuth** (en la consola nueva se llama
   **Google Auth Platform**) → **Comenzar**.
2. **Información de la app**: nombre `TijerApp`, correo de asistencia: el tuyo.
3. **Público**: **Externo**.
4. **Información de contacto**: tu mail → aceptar la política → **Crear**.
5. En **Desarrollo de la marca** (Branding):
   - **Dominios autorizados**: agregá `tijerapp.com`.
   - Página principal: `https://tijerapp.com`. Política de privacidad y términos: las páginas que
     tengamos (si no hay, avisame y las armamos antes de publicar).
   - **No subas logo todavía**: subir logo obliga a que Google verifique la app (tarda días). Sin logo
     funciona igual.
6. En **Acceso a los datos** no agregues nada: alcanzan los permisos básicos (mail, nombre y foto),
   que no necesitan verificación.
7. En **Público** tocá **Publicar app** → confirmar. Si queda "En prueba", solo pueden entrar las
   cuentas que cargues a mano.

## 3. Credencial (el "Client ID")

1. **Clientes** (o **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**).
2. Tipo: **Aplicación web**. Nombre: `TijerApp web`.
3. **Orígenes autorizados de JavaScript** (uno por línea):
   - `https://tijerapp.com`
   - `https://www.tijerapp.com`
   - `http://localhost:3000`
4. **URIs de redireccionamiento autorizados** (para el plan B por redirección):
   - `https://rxqxjozftxivzmgiflgm.supabase.co/auth/v1/callback`
5. **Crear**. Te muestra el **ID de cliente** y el **Secreto del cliente**. Dejá la ventana abierta.

## 4. Supabase

1. https://supabase.com/dashboard → proyecto de TijerApp → **Authentication** → **Sign In / Providers**
   → **Google** → activarlo.
2. Pegá el **Client ID** y el **Client Secret** de Google.
3. Dejá **Skip nonce checks** apagado (nosotros mandamos el nonce).
4. **Save**.
5. **Authentication** → **URL Configuration** → **Redirect URLs**, agregá si no están:
   - `https://tijerapp.com/**`
   - `https://www.tijerapp.com/**`
   - `http://localhost:3000/**`

## 5. Vercel

1. Proyecto TijerApp (equipo `pastorig`) → **Settings** → **Environment Variables**.
2. Nueva variable `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = el **ID de cliente** (no el secreto), para
   Production, Preview y Development.
3. No hace falta redeployar ahora: entra en el próximo deploy, que es el de esta feature.

Avisame cuando esté y sigo con la implementación. Si en algún paso la pantalla no coincide, mandame
captura.

## Prueba final (la hacemos juntos)

1. En `tijerapp.com/login`, "Continuar con Google" con tu Gmail → entrás a tu panel de siempre.
2. Con un Gmail que no tenga cuenta → te pide los datos de la barbería → entra con la prueba de 14 días.
   (Después borramos esa barbería de prueba.)
3. Desde el iPhone, con TijerApp instalada en la pantalla de inicio → entrar con Google → queda adentro.
4. Abrir `tijerapp.com/login` desde un link en Instagram → aparece el aviso de abrir en Safari/Chrome.
