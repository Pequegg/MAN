# firebase-online.ps1 — activa la capa online (Firebase Realtime Database)
# del Op-Art Fan y conecta el ranking mundial.
#
# Uso (Windows, una sola vez):
#   powershell -ExecutionPolicy Bypass -File tools\firebase-online.ps1
#
# Abre el navegador para entrar con tu cuenta de Google (solo la primera vez);
# a partir de ahí crea el proyecto gratis, la base de datos, sube las reglas y
# deja la URL puesta en js/config/settings.js. Después haz push a GitHub.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$fx = Join-Path $env:APPDATA "npm\firebase.cmd"

if (-not (Test-Path $fx)) {
  Write-Host "== Instalando firebase-tools (npm) =="
  npm.cmd install -g firebase-tools --no-audit --no-fund
}
Write-Host ("== firebase {0} ==" -f (& $fx --version))

Write-Host "== Entra con tu cuenta de Google (se abre el navegador) =="
& $fx login
if ($LASTEXITCODE -ne 0) { Write-Host "Login cancelado."; exit 1 }

$pidx = "op-art-fan-" + (Get-Date -Format "yyyyMMddHHmm") + "-" + (Get-Random -Minimum 10 -Maximum 99)
Write-Host "== Creando proyecto Firebase: $pidx (plan gratuito Spark) =="
& $fx projects:create $pidx --displayname "Op-Art Fan"
if ($LASTEXITCODE -ne 0) { Write-Host "No se pudo crear el proyecto."; exit 1 }

Write-Host "== Creando Realtime Database (europe-west1) =="
& $fx database:instances:create $pidx --region europe-west1
if ($LASTEXITCODE -ne 0) { Write-Host "No se pudo crear la base de datos."; exit 1 }

Write-Host "== Subiendo reglas (modo prueba) =="
Push-Location $root
& $fx use $pidx --add 2>$null
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host "No se pudo enlazar el proyecto."; exit 1 }
& $fx deploy --only database
Pop-Location

$url = "https://$pidx-default-rtdb.europe-west1.firebasedatabase.app/"
$settings = Join-Path $root "js\config\settings.js"
$content = Get-Content -Path $settings -Raw
$content = $content -replace 'var FIREBASE_URL = "[^"]*";', "var FIREBASE_URL = `"$url`";"
Set-Content -Path $settings -Value $content -Encoding UTF8

Write-Host ""
Write-Host "=================== LISTO ==================="
Write-Host "URL de la base: $url"
Write-Host "El ranking mundial de la Arena ya está conectado."
Write-Host "Sube el cambio a GitHub con:"
Write-Host "  git add js/config/settings.js"
Write-Host "  git commit -m 'firebase online'"
Write-Host "  git push"
Write-Host "==============================================="