# Casa de Avivamiento Nueva Vida — App

Esta carpeta contiene el proyecto completo, listo para publicar. Sigue estos pasos exactos.

## 1. Requisitos previos

Instala Node.js (versión 18 o más reciente) desde **nodejs.org** si no lo tienes. Verifica con:

```
node -v
```

## 2. Instalar dependencias

Abre una terminal dentro de esta carpeta (`iglesia-app`) y ejecuta:

```
npm install
```

## 3. Probar localmente (opcional)

```
npm run dev
```

Abre la URL que aparece (normalmente `http://localhost:5173`) para ver la app funcionando en tu navegador antes de publicarla.

## 4. Publicar en Vercel (gratis, recomendado)

### Opción A — Sin instalar nada (más fácil)
1. Sube esta carpeta completa a GitHub (crea un repositorio nuevo y arrastra los archivos, o usa GitHub Desktop).
2. Ve a **vercel.com** → "Add New Project" → conecta tu cuenta de GitHub → selecciona el repositorio.
3. Vercel detecta automáticamente que es un proyecto Vite. Click en "Deploy".
4. En 1-2 minutos te da una URL pública como `tu-app.vercel.app`.

### Opción B — Desde la terminal
```
npm install -g vercel
vercel login
vercel --prod
```
Sigue las instrucciones en pantalla. Al final te entrega la URL pública.

## 5. Publicar en Netlify (alternativa, también gratis)

```
npm run build
```
Esto genera una carpeta `dist/`. Ve a **netlify.com** → arrastra la carpeta `dist` directamente al panel → tu sitio queda publicado al instante.

## ⚠️ Importante: estado actual de los datos

Esta versión guarda usuarios, citas y notificaciones únicamente en la memoria del navegador (mientras la pestaña está abierta). Esto significa:

- Sirve perfectamente para **demostrar y probar** todo el flujo completo.
- Al cerrar o recargar la pestaña, los datos se reinician.
- Para que los datos se guarden de forma permanente (que un pastor cierre sesión y al volver siga viendo sus citas, por ejemplo) necesitas conectar una base de datos real.

## 6. Conectar una base de datos real (para producción de verdad)

La opción más sencilla es **Supabase** (gratis hasta cierto uso):

1. Crea cuenta en **supabase.com** → nuevo proyecto.
2. Crea las tablas: `users`, `appointments`, `availability`, `notifications`.
3. Instala el cliente: `npm install @supabase/supabase-js`
4. Sustituye los `useState` de usuarios/citas/notificaciones en `App.jsx` por llamadas a Supabase (`.from('appointments').select()`, `.insert()`, etc.)

Si quieres, puedo ayudarte a escribir ese código de integración con Supabase paso a paso cuando estés listo para ese nivel.

## 7. Verificación de correos reales

Actualmente los códigos de verificación se muestran en la consola del navegador (F12) como simulación. Para enviar correos reales necesitas un servicio como **Resend**, **SendGrid** o **Firebase Auth**, que requiere backend (no puede hacerse solo desde React en el navegador por seguridad).

## Estructura del proyecto

```
iglesia-app/
├── index.html        ← página HTML base
├── package.json       ← dependencias del proyecto
├── vite.config.js     ← configuración de Vite
└── src/
    ├── main.jsx        ← punto de entrada de React
    └── App.jsx         ← toda la aplicación (la que ya conoces)
```
