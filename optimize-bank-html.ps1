# optimize-bank-html.ps1
# SingleFile banka HTML'lerini hafifletir:
#  1) data:image/*;base64 -> assets/img/{hash}.{ext} (magick varsa .webp)
#  2) data:font/*;base64  -> assets/fonts/{hash}.woff2 (ayni font tum sayfalarda TEK dosya)
#  3) HTML comment + fazla bosluk temizligi
# Kullanim: powershell -File optimize-bank-html.ps1 [public/lithuanian-banks]

param(
    [string]$Root = "public/lithuanian-banks"
)

$ErrorActionPreference = "Continue"
$magickCmd = Get-Command magick -ErrorAction SilentlyContinue
$hasMagick = $null -ne $magickCmd
if ($hasMagick) { Write-Host "magick bulundu -> gorseller WebP olacak" } else { Write-Host "magick yok -> gorseller orijinal formatla cikarilacak" }

$sha1 = [System.Security.Cryptography.SHA1]::Create()
$totalBefore = 0L; $totalAfter = 0L
$extracted = @{}
$uriRe = [regex]'data:((?:image|font|application)/[\w.+-]+);base64,([A-Za-z0-9+/=\r\n]+)'

$files = Get-ChildItem -Path $Root -Recurse -Filter *.html
foreach ($file in $files) {
    $dir = $file.DirectoryName
    $html = [IO.File]::ReadAllText($file.FullName)
    $before = $html.Length
    $totalBefore += $before

    $html = $uriRe.Replace($html, {
        param($m)
        $mime = $m.Groups[1].Value
        $b64 = $m.Groups[2].Value -replace '\s',''
        try { $raw = [Convert]::FromBase64String($b64) } catch { return $m.Value }
        if ($raw.Length -lt 512) { return $m.Value }

        $hashBytes = $sha1.ComputeHash($raw)
        $hash = ([BitConverter]::ToString($hashBytes) -replace '-','').Substring(0,16).ToLower()

        if ($mime -match 'font') {
            $rel = "assets/fonts/$hash.woff2"
            $out = Join-Path $dir $rel
            if (-not (Test-Path $out)) {
                New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
                [IO.File]::WriteAllBytes($out, $raw)
            }
            $extracted[$out] = $true
            return $rel
        }

        if ($mime -eq 'image/svg+xml') {
            $rel = "assets/img/$hash.svg"
            $out = Join-Path $dir $rel
            if (-not (Test-Path $out)) {
                New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
                [IO.File]::WriteAllBytes($out, $raw)
            }
            $extracted[$out] = $true
            return $rel
        }

        if ($mime -match '^image/') {
            if ($hasMagick) {
                $rel = "assets/img/$hash.webp"
                $out = Join-Path $dir $rel
                if (-not (Test-Path $out)) {
                    New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
                    $tmp = "$out.tmp"
                    try {
                        [IO.File]::WriteAllBytes($tmp, $raw)
                        & magick $tmp -quality 82 $out 2>$null | Out-Null
                        Remove-Item $tmp -ErrorAction SilentlyContinue
                    } catch {
                        Remove-Item $tmp -ErrorAction SilentlyContinue
                    }
                }
                if (Test-Path $out) { $extracted[$out] = $true; return $rel }
            }
            $ext = ($mime -replace '^image/','') -replace 'jpeg','jpg'
            $rel = "assets/img/$hash.$ext"
            $out = Join-Path $dir $rel
            if (-not (Test-Path $out)) {
                New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
                [IO.File]::WriteAllBytes($out, $raw)
            }
            $extracted[$out] = $true
            return $rel
        }

        return $m.Value
    }.GetNewClosure())

    # Buyuk <style> bloklari -> assets/css/{hash}.css (dedupe + cache)
    $html = [regex]::Replace($html, '(?s)<style([^>]*)>([\s\S]*?)</style>', {
        param($m)
        $content = $m.Groups[2].Value
        if ($content.Length -lt 2048) { return $m.Value }
        # CSS dosyaya tasinca icindeki assets/... yollari css/ altindan cozulur -> ../ yap
        $content = $content -replace 'assets/img/', '../img/' -replace 'assets/fonts/', '../fonts/'
        $enc = [Text.Encoding]::UTF8.GetBytes($content)
        $hb = $sha1.ComputeHash($enc)
        $h = ([BitConverter]::ToString($hb) -replace '-','').Substring(0,16).ToLower()
        $rel = "assets/css/$h.css"
        $out = Join-Path $dir $rel
        if (-not (Test-Path $out)) {
            New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
            [IO.File]::WriteAllText($out, $content)
        }
        $extracted[$out] = $true
        return "<link rel=`"stylesheet`" href=`"$rel`">"
    }.GetNewClosure())

    # HTML comment temizligi (conditional haric)
    $html = [regex]::Replace($html, '<!--(?!\[if|<!|>)[\s\S]*?-->', '')
    # Satir sonu bosluklari
    $html = [regex]::Replace($html, '[ \t]+\n', "`n")
    $html = [regex]::Replace($html, "\n{3,}", "`n`n")

    [IO.File]::WriteAllText($file.FullName, $html)
    $after = $html.Length
    $totalAfter += $after
    $name = $file.FullName.Substring((Resolve-Path $Root).Path.Length + 1)
    $pct = [math]::Round((($before - $after) / $before) * 100)
    "{0}: {1}KB -> {2}KB  (-{3}%)" -f $name, [int]($before/1KB), [int]($after/1KB), $pct
}

$assetsKb = 0L
foreach ($k in $extracted.Keys) { $assetsKb += (Get-Item $k).Length }

Write-Host ""
Write-Host "=== OZET ==="
"HTML toplam: {0:N1}MB -> {1:N1}MB" -f ($totalBefore/1MB), ($totalAfter/1MB)
"Cikarilan asset'ler (tek sefer indirilir, cache'lenir): {0} dosya, {1:N1}MB" -f $extracted.Count, ($assetsKb/1MB)
