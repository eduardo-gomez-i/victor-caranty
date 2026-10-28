import { signOut } from 'next-auth/react'

// Cierra sesión sin depender de la URL que arma el servidor: detrás de nginx puede salir
// como localhost:3000. Se vuelve al inicio del mismo dominio desde el navegador.
export async function logout() {
  await signOut({ redirect: false })
  window.location.assign('/')
}
