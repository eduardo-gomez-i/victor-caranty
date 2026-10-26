import crypto from "crypto"

// Llave de un trabajo de foto: sha256 de la URL original (la URL puede pasar el límite de índice de MySQL)
export function urlKey(url: string) {
  return crypto.createHash("sha256").update(url).digest("hex")
}
