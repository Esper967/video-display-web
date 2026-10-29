#requires -Version 5.1
<#
  可拓展前端框架 · 素材扫描器
  ------------------------------------------------------------
  扫描 assets 目录中的视频与音频，并生成
  assets/manifest.js 供 index.html 读取。
  框架自带的示例素材会自动让位给新导入的素材。

  浏览器出于安全限制无法自行列出一个本地文件夹里的文件，
  因此由这个脚本在启动前完成扫描。无需修改 HTML / CSS / JS。
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $root "assets"
$manifestPath = Join-Path $assetsDir "manifest.js"

$videoExtensions = @(".mp4", ".webm", ".ogv", ".mov", ".m4v")
$audioExtensions = @(".mp3", ".wav", ".ogg", ".oga", ".m4a", ".aac", ".flac", ".opus")

# 框架自带的示例素材。导入新素材后，它们会自动让位，不会造成“视频/音频不唯一”。
$demoVideoNames = @("bg-video.mp4")
$demoAudioNames = @("bgm.mp3")

function Stop-WithError {
  param([string]$Message)

  Write-Host ""
  Write-Host "  [X] $Message" -ForegroundColor Red
  Write-Host ""
  Write-Host "  修复后重新双击「启动网页.bat」即可。" -ForegroundColor DarkGray
  Write-Host ""
  exit 1
}

function Show-FileList {
  param([System.IO.FileInfo[]]$Files)

  foreach ($file in $Files) {
    Write-Host ("      - " + $file.Name) -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "  ==============================================" -ForegroundColor DarkCyan
Write-Host "   可拓展前端框架 · 素材扫描" -ForegroundColor Cyan
Write-Host "  ==============================================" -ForegroundColor DarkCyan
Write-Host ""
Write-Host ("  素材目录：" + $assetsDir) -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path -LiteralPath $assetsDir -PathType Container)) {
  Stop-WithError "找不到 assets 文件夹：$assetsDir"
}

try {
  $allFiles = @(Get-ChildItem -LiteralPath $assetsDir -File -ErrorAction Stop)
} catch {
  Stop-WithError ("读取 assets 文件夹失败：" + $_.Exception.Message)
}

$videos = @($allFiles | Where-Object {
  $videoExtensions -contains $_.Extension.ToLowerInvariant()
})
$audios = @($allFiles | Where-Object {
  $audioExtensions -contains $_.Extension.ToLowerInvariant()
})

# 优先选择“非示例”素材；只有没有新素材时才回退到框架自带示例。
$videoCandidates = @($videos | Where-Object {
  $demoVideoNames -notcontains $_.Name.ToLowerInvariant()
})
if ($videoCandidates.Count -eq 0) { $videoCandidates = $videos }

$audioCandidates = @($audios | Where-Object {
  $demoAudioNames -notcontains $_.Name.ToLowerInvariant()
})
if ($audioCandidates.Count -eq 0) { $audioCandidates = $audios }

if ($videoCandidates.Count -ne 1) {
  Write-Host ("  需要 1 个视频（不含内置示例），当前检测到 " + $videoCandidates.Count + " 个。") -ForegroundColor Red
  if ($videoCandidates.Count -gt 0) { Show-FileList -Files $videoCandidates }
  Stop-WithError ("视频格式支持：" + ($videoExtensions -join " / "))
}

if ($audioCandidates.Count -ne 1) {
  Write-Host ("  需要 1 个音频（不含内置示例），当前检测到 " + $audioCandidates.Count + " 个。") -ForegroundColor Red
  if ($audioCandidates.Count -gt 0) { Show-FileList -Files $audioCandidates }
  Stop-WithError ("音频格式支持：" + ($audioExtensions -join " / "))
}

$video = $videoCandidates[0]
$audio = $audioCandidates[0]
$videoIsDemo = $demoVideoNames -contains $video.Name.ToLowerInvariant()
$audioIsDemo = $demoAudioNames -contains $audio.Name.ToLowerInvariant()

$manifest = [ordered]@{
  generatedBy = "tools/scan-assets.ps1"
  scannedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
  video = "assets/" + $video.Name
  audio = "assets/" + $audio.Name
  videoName = $video.Name
  audioName = $audio.Name
}

$json = $manifest | ConvertTo-Json -Depth 4
$content = @"
/*
 * 此文件由 tools/scan-assets.ps1 自动生成，请勿手动修改。
 * 素材有变化时，双击“启动网页.bat”重新扫描即可。
 */
window.FRAME_ASSETS = $json;
"@

try {
  [System.IO.File]::WriteAllText($manifestPath, $content, (New-Object System.Text.UTF8Encoding($false)))
} catch {
  Stop-WithError ("写入素材清单失败：" + $_.Exception.Message)
}

Write-Host ("  视频  ✓  " + $video.Name + $(if ($videoIsDemo) { "  （内置示例）" } else { "" })) -ForegroundColor Green
Write-Host ("  音频  ✓  " + $audio.Name + $(if ($audioIsDemo) { "  （内置示例）" } else { "" })) -ForegroundColor Green
Write-Host ""
Write-Host "  素材清单已更新：assets/manifest.js" -ForegroundColor DarkGray
Write-Host "  正在打开网页……" -ForegroundColor Cyan
Write-Host ""
