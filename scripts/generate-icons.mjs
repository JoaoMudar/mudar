// Script para gerar ícones PNG do PWA a partir do SVG
// Rode: node scripts/generate-icons.mjs (requer sharp instalado)
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')
const svgPath = join(iconsDir, 'icon.svg')

const sizes = [192, 512]

for (const size of sizes) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, `icon-${size}.png`))
  console.log(`Gerado icon-${size}.png`)
}

console.log('Ícones gerados com sucesso!')
