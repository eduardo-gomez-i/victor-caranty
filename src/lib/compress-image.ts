// Reduce la foto en el navegador antes de subirla (datos móviles y espacio en el servidor).
// Lo que más pesa en una foto de celular es la resolución (12–50 MP), así que se limita el lado mayor
// a 2048 px —lo que usan Marketplace y la edición con IA— y se recomprime en JPEG de buena calidad.
// Las fotos que ya son ligeras se suben tal cual, para no perder calidad recomprimiendo.
const MAX_SIDE = 2048
const QUALITY = 0.85
const SMALL_ENOUGH_BYTES = 800 * 1024

export function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      const longest = Math.max(width, height)
      if (longest <= MAX_SIDE && file.size <= SMALL_ENOUGH_BYTES && file.type === 'image/jpeg') {
        return resolve(file)
      }
      if (longest > MAX_SIDE) {
        const scale = MAX_SIDE / longest
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          // Si recomprimir no ahorra nada, se queda la original
          if (!blob || blob.size >= file.size) return resolve(file)
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        QUALITY
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
