$ErrorActionPreference = 'Stop'
$previewUrl = 'http://127.0.0.1:4173'
function Test-BlancoPreview {
    try { return (Invoke-WebRequest -Uri "$previewUrl/__preview_health" -UseBasicParsing -TimeoutSec 2).Content -eq 'blanco-local-preview' } catch { return $false }
}
if (-not (Test-BlancoPreview)) {
    $previewNode = (Get-Command node -ErrorAction Stop).Source
    $previewScript = Join-Path $PSScriptRoot 'preview-server.mjs'
    Start-Process -FilePath $previewNode -ArgumentList ('"' + $previewScript + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if (Test-BlancoPreview) { break }
        Start-Sleep -Milliseconds 250
    }
}
if (-not (Test-BlancoPreview)) { throw 'Could not start the Blanco preview on port 4173.' }
Start-Process "$previewUrl/admin.html"
