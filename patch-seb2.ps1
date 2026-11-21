$ErrorActionPreference = 'Stop'
$dir = 'C:\Users\XENOTIC\Desktop\PROJELER\maximaletonya\public\latvian-banks\seb-lv'
$a = [char]0x101  # ā
$mobila = 'SEB mobil' + $a + ' lietotne'

foreach ($i in '1','2','3','4') {
  $f = Join-Path $dir "$i.html"
  $s = [IO.File]::ReadAllText($f)
  # Bozuk 'mobil' + herhangi 1-2 char + ' lietotne' -> dogrusu
  $s = $s -replace 'SEB mobil.{0,3}lietotne', ($mobila -replace '\$','$$$$')
  [IO.File]::WriteAllText($f, $s, (New-Object Text.UTF8Encoding $false))
  Write-Output "$i.html OK"
}
