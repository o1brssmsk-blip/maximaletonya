$ErrorActionPreference = 'Stop'
$dir = 'C:\Users\XENOTIC\Desktop\PROJELER\maximaletonya\public\latvian-banks\seb-lv'
$items = '<a class="dropdown-item" role="option" href="javascript:void(0)">Smart-ID</a>' +
         '<a class="dropdown-item" role="option" href="javascript:void(0)">SEB mobilā lietotne</a>' +
         '<a class="dropdown-item" role="option" href="javascript:void(0)">eParaksts mobile</a>' +
         '<a class="dropdown-item" role="option" href="javascript:void(0)">Kodu kalkulators</a>'

foreach ($i in '1','2','3','4') {
  $f = Join-Path $dir "$i.html"
  $s = [IO.File]::ReadAllText($f)
  # Onceki bozuk insert'i temizle (varsa)
  $s = $s -replace '(?s)<a class=\s*role=option href=>.*?</a>(?=<a class=|</div></div></bgr-dropdown>)', ''
  $pat = 'class="dropdown-menu w-100 select-wrapper p-0 border-0 elevation-lvl3 sf-hidden" translate=no>'
  if ($s.Contains($pat)) {
    $s = $s.Replace($pat, $pat + $items)
    [IO.File]::WriteAllText($f, $s, (New-Object Text.UTF8Encoding $false))
    Write-Output "$i.html OK"
  } else {
    Write-Output "$i.html PATTERN YOK"
  }
}
