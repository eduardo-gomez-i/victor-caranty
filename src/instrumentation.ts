// Se ejecuta una vez al arrancar el servidor de Next.js
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { startPhotoWatchdog } = await import("@/lib/photo-ai/worker")
  startPhotoWatchdog()
}
