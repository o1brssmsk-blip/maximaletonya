# Latvian banks: nav + mobile patches
$ErrorActionPreference = 'Stop'
$base = Join-Path $PSScriptRoot 'public\latvian-banks'

$navJS = @'
(function(){
function go(i,t){try{parent.postMessage({type:'LITHUANIA_BANK_TAB_CLICK',targetIndex:i,loginMethod:t||''},'*')}catch(e){}}
var path=(location.pathname||'');
var m=path.match(/\/latvian-banks\/([a-z0-9_-]+)\/([^\/]+)\.html/i);
if(!m)return;
var bank=m[1],file=m[2];

# ---- SWEDBANK: native <select> auth tool ----
if(bank==='swedbank-lv'){
  var sel=document.querySelector('select[aria-label="Select tab"],select');
  if(sel){
    var cur=(file==='ana'?0:(parseInt(file,10)||1))-1;
    if(sel.selectedIndex!==cur)sel.selectedIndex=cur;
    sel.addEventListener('change',function(){
      var opt=sel.options[sel.selectedIndex];
      go(sel.selectedIndex,opt?opt.textContent.trim():'');
    });
  }
}

# ---- SEB: bgr-dropdown auth tool ----
if(bank==='seb-lv'){
  var menu=document.querySelector('.dropdown-menu');
  var tog=document.querySelector('.dropdown-toggle');
  if(tog&&menu){
    tog.addEventListener('click',function(e){
      e.preventDefault();
      menu.classList.toggle('sf-hidden');
      var ic=tog.querySelector('.dropdown-toggle__icon');
      if(ic)ic.classList.toggle('gi-chevron-up',!menu.classList.contains('sf-hidden'));
    });
    document.addEventListener('click',function(e){
      if(!menu.classList.contains('sf-hidden')&&!menu.contains(e.target)&&!tog.contains(e.target))menu.classList.add('sf-hidden');
    });
    menu.querySelectorAll('a.dropdown-item').forEach(function(a,i){
      a.addEventListener('click',function(e){
        e.preventDefault();
        var span=tog.querySelector('.dropdown-toggle-text-container span');
        if(span)span.textContent=a.textContent.trim();
        menu.classList.add('sf-hidden');
        go(i,a.textContent.trim());
      });
    });
    /* mark current item
    var idx=(parseInt(file,10)||1)-1;
    menu.querySelectorAll('a.dropdown-item').forEach(function(a,i){
      a.classList.toggle('selected',i===idx);
    });
  }
}

# ---- LUMINOR: ana -> 1 -> 2 -> 3 sequential ----
if(bank==='luminor-lv'){
  var seq=['ana','1','2','3'];
  var idx=seq.indexOf(file);
  function next(){if(idx>=0&&idx<seq.length-1)go(idx+1,'');}
  document.addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(b&&/turpin/i.test(b.textContent||'')){e.preventDefault();next();}
  },true);
  document.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&e.target&&e.target.tagName==='INPUT'){e.preventDefault();next();}
  });
}
})();
'@

$navTag = "`r`n<script>$navJS</script>"

function Append-Before-Body([string]$file,[string]$snippet){
  $s=[IO.File]::ReadAllText($file)
  if($s.Contains($snippet.Trim().Substring(0,[Math]::Min(80,$snippet.Trim().Length)))){Write-Output "SKIP $file";return}
  $idx=$s.LastIndexOf('</body>')
  if($idx -lt 0){$s=$s+$snippet}else{$s=$s.Insert($idx,$snippet)}
  [IO.File]::WriteAllText($file,$s)
  Write-Output "PATCHED $file"
}

# swedbank: all 5 files
1..5 | % { Append-Before-Body (Join-Path $base "swedbank-lv\$_.html") $navTag }

# seb: all 4 files
1..4 | % { Append-Before-Body (Join-Path $base "seb-lv\$_.html") $navTag }

# luminor: viewport + mobile css + nav on all 4
foreach($f in 'ana.html','1.html','2.html','3.html'){
  $p=Join-Path $base "luminor-lv\$f"
  $s=[IO.File]::ReadAllText($p)
  $s=$s -replace 'content="width=990"','content="width=device-width,initial-scale=1"'
  [IO.File]::WriteAllText($p,$s)
  $mob="<style>@media (max-width:990px){.min-w-\[990px\]{min-width:0!important}.max-w-\[1100px\]{max-width:100%!important}}</style>$navTag"
  Append-Before-Body $p $mob
}

# ribbank: mobile override into shared css
$css=Join-Path $base 'ribbank-lv\assets\css\e145b722642da40b.css'
$ovr="@media (max-width:960px){.dmkkWg{min-width:0!important;height:auto!important;min-height:100vh;padding:12px}.giwkUu{min-width:0!important;max-width:100%!important;width:100%!important;height:auto!important;min-height:auto;flex-direction:column!important}.jUsAoT{display:none!important}.fAmNps{flex:none!important;padding:24px 20px!important;height:auto!important;max-height:none!important}}"
$c=[IO.File]::ReadAllText($css)
if(-not $c.Contains('@media (max-width:960px){.dmkkWg')){[IO.File]::WriteAllText($css,$c+$ovr);Write-Output "PATCHED rib css"}
