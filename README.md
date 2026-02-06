# Victor Carros - Plataforma de Venta de Vehículos

Este proyecto es una plataforma web moderna para la compra y venta de vehículos seminuevos, construida con las últimas tecnologías del ecosistema React/Next.js.

## 🛠 Tech Stack Principal

Estas son las herramientas y librerías principales que utilizamos en el proyecto:

*   **[Next.js 16 (App Router)](https://nextjs.org/)**: Framework principal. Usamos la arquitectura basada en `app/` para el enrutamiento y renderizado (SSR/RSC).
*   **[TypeScript](https://www.typescriptlang.org/)**: Lenguaje base para asegurar tipado estático y reducir errores en tiempo de ejecución.
*   **[Prisma ORM](https://www.prisma.io/)**: Nuestra capa de acceso a datos. Facilita la interacción con la base de datos MySQL mediante tipos generados automáticamente.
*   **[Tailwind CSS v4](https://tailwindcss.com/)**: Framework de utilidades para el estilado. Permite un desarrollo rápido y consistente.
*   **[Zod](https://zod.dev/)**: Librería para validación de esquemas (usada principalmente en las API routes para validar datos de entrada).
*   **[Lucide React](https://lucide.dev/)**: Colección de iconos ligeros y consistentes.
*   **[Auth.js (NextAuth v5)](https://authjs.dev/)**: Solución completa de autenticación para Next.js. Maneja sesiones, providers (Credenciales) y protección de rutas.

## 🚀 Guía de Inicio Rápido (Setup)

Sigue estos pasos para levantar el proyecto en tu entorno local.

### 1. Requisitos Previos
*   **Node.js**: Versión 18 o superior.
*   **Base de Datos MySQL**: Debes tener un servidor MySQL corriendo (ej. WampServer, XAMPP, Docker).

### 2. Instalación
Clona el repositorio e instala las dependencias:

```bash
git clone <url-del-repo>
cd victor-carros
npm install
```

### 3. Configuración de Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (puedes basarte en `.env.example` si existe) y configura la conexión a tu base de datos:

```env
# Ejemplo de conexión local (usuario: root, sin contraseña, db: victor_carros)
DATABASE_URL="mysql://root:@localhost:3306/victor_carros"
```

### 4. Inicializar la Base de Datos
Usa Prisma para sincronizar el esquema con tu base de datos local:

```bash
# Sube el esquema a la DB y genera el cliente
npx prisma db push

# (Opcional) Si quieres poblar la base de datos con datos de prueba
# npx prisma db seed
```

### 5. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## 📂 Estructura del Proyecto

```
/prisma
  ├── schema.prisma    # Definición de modelos de BD
  └── migrations/      # Historial de cambios en la BD
/src
  ├── app/             # Rutas de la aplicación (Next.js App Router)
  │   ├── api/         # Endpoints de API (Backend)
  │   ├── (auth)/      # Grupos de rutas (ej. login, register)
  │   └── page.tsx     # Página de inicio
  ├── components/
  │   ├── ui/          # Componentes base reusables (Button, Input, etc.)
  │   └── layout/      # Componentes estructurales (Navbar, Footer)
  ├── lib/
      ├── prisma.ts    # Instancia singleton de Prisma Client
      └── auth.ts      # Lógica de autenticación y manejo de sesiones
```

## 💾 Trabajando con Prisma (ORM)

Prisma es central en nuestro flujo de trabajo. Aquí los comandos más comunes:

*   **`npx prisma studio`**: Abre una interfaz visual en el navegador para ver y editar los datos de la base de datos. ¡Muy útil!
*   **`npx prisma generate`**: Regenera los tipos de TypeScript del cliente (`@prisma/client`). **Ejecuta esto siempre que cambies `schema.prisma`**.
*   **`npx prisma migrate dev`**: Crea una migración SQL y la aplica. Úsalo para evolucionar el esquema de la base de datos.

### Variables de Entorno (.env)
Asegúrate de tener configurada la variable `AUTH_SECRET` para Auth.js:

```env
DATABASE_URL="mysql://root:@localhost:3306/victor_carros"
AUTH_SECRET="tu_secreto_super_seguro_generado_con_openssl_rand_base64_32"
```

### Ejemplo de uso en código:

```typescript
import prisma from '@/lib/prisma'

// Consulta tipada
const users = await prisma.user.findMany({
  where: { role: 'SELLER' },
  include: { vehicles: true }
})
```

## 🤝 Flujo de Trabajo Recomendado

1.  **Componentes**: Prefiere crear componentes pequeños y reusables en `src/components/ui`.
2.  **Server Components**: Por defecto, todo en `app/` son Server Components. Usa `'use client'` al inicio del archivo solo si necesitas interactividad (hooks, eventos).
3.  **Linting**: Antes de hacer commit, corre `npm run lint` para asegurar que no hay errores.

---
Generado por el Equipo de Desarrollo.
