# supabase-setup.ps1 — conecta Op-Art Fan al proyecto Supabase
#
# Uso (Windows, una sola vez):
#   powershell -ExecutionPolicy Bypass -File tools\supabase-setup.ps1
#
# 1) Sube el esquema (tablas + RLS) al proyecto via CLI si esta disponible
#    y el proyecto ya esta enlazado; si no, te dice los 2 clics del dashboard.
# 2) Te guia para pegar la llave "anon public" en js/config/supabase.js.
# 3) Te recuerda subir el cambio a GitHub.

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$env:SUPABASE_PROJECT = "yrrgyunksjnzinhcedqv"

Write-Host "==============================================="
Write-Host " Op-Art Fan -> Supabase ($env:SUPABASE_PROJECT)"
Write-Host "==============================================="
Write-Host ""

$cli = Get-Command supabase -ErrorAction SilentlyContinue
if ($cli) {
  Write-Host ("== CLI encontrada: {0} ==" -f (& supabase --version 2>$null))
  $linked = Test-Path (Join-Path $root "supabase\.temp\project-ref")
  if ($linked) {
    $ref = Get-Content (Join-Path $root "supabase\.temp\project-ref") -Raw
    if ($ref.Trim() -eq $env:SUPABASE_PROJECT) {
      Write-Host "Proyecto enlazado. Subiendo esquema..."
      Push-Location $root
      & supabase db push --db-url $null 2>$null
      if ($LASTEXITCODE -ne 0) {
        Write-Host "(el push por CLI necesito credenciales; seguimos con el manual)"
      }
      Pop-Location
    }
  }
} else {
  Write-Host "No tienes instalada la CLI de supabase (no hace falta para esto)."
}

Write-Host ""
Write-Host "== PENDIENTE (1 sola vez, 2 clics en el dashboard) =="
Write-Host "1. Abre: https://supabase.com/dashboard/project/$env:SUPABASE_PROJECT"
Write-Host "2. Ve a 'SQL Editor', pega el contenido de:"
Write-Host "      $root\supabase\arena.sql"
Write-Host "   y pulsa RUN."
Write-Host ""
Write-Host "== Llave publica =="
Write-Host "3. Ve a Settings -> API y copia la 'anon public'."
Write-Host "4. Pegala en js/config/supabase.js:"
Write-Host "      var SUPABASE_ANON_KEY = 'eyJ...';"
Write-Host ""

$supjs = Join-Path $root "js\config\supabase.js"
if (Test-Path $supjs) {
  $c = Get-Content $supjs -Raw
  if ($c -match 'var SUPABASE_ANON_KEY = "[^"]{20,}"') {
    Write-Host "=> Llave ya presente en js/config/supabase.js. OK."
  } else {
    Write-Host "=> La llave aun esta vacia. Pebala tal y como dice arriba."
  }
}

Write-Host ""
Write-Host "Cuando tengas la llave, sube el cambio a GitHub:"
Write-Host "  git add -A"
Write-Host "  git commit -m `"supabase online`""
Write-Host "  git push"
Write-Host "==============================================="