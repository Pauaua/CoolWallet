# Compila e instala la app en Android (build de desarrollo) usando el JDK 17
# SOLO para este proceso: no modifica JAVA_HOME ni PATH globales.
# Uso: npm run android:build   (los argumentos extra se pasan a `expo run:android`)

$ErrorActionPreference = 'Stop'

$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium', 'C:\Program Files\Microsoft' -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $jdk) {
  Write-Error 'No se encontró un JDK 17. Instálalo con: winget install EclipseAdoptium.Temurin.17.JDK'
}

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path $sdk)) {
  Write-Error "No se encontró el SDK de Android en $sdk. Instálalo desde Android Studio (SDK Manager)."
}

$env:JAVA_HOME = $jdk
$env:ANDROID_HOME = $sdk
$env:Path = "$jdk\bin;$sdk\platform-tools;$env:Path"

Write-Host "JDK:         $jdk"
Write-Host "Android SDK: $sdk"
& java -version

npx expo run:android @args
exit $LASTEXITCODE
