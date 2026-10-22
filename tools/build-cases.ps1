# ============================================================
# build-cases.ps1 — generates work/<slug>.html from data/projects.json
# Run from anywhere:  powershell -File tools/build-cases.ps1
# ============================================================
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dataPath = Join-Path $root "data\projects.json"
$outDir = Join-Path $root "work"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$json = Get-Content $dataPath -Raw -Encoding UTF8
$projects = $json | ConvertFrom-Json
$total = $projects.Count

function Esc([string]$s) {
  if ($null -eq $s) { return "" }
  return $s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;")
}

for ($i = 0; $i -lt $total; $i++) {
  $p = $projects[$i]
  $next = $projects[($i + 1) % $total]
  $num = ($i + 1).ToString("00")
  $totalStr = $total.ToString("00")

  $name = Esc $p.name
  $oneline = Esc $p.oneline
  $client = Esc $p.client
  $role = Esc $p.role
  $disciplines = Esc $p.disciplines
  $collab = if ([string]::IsNullOrWhiteSpace($p.collab)) { "—" } else { Esc $p.collab }

  # story sections (skip empties)
  $story = ""
  if ($p.challenge) { $story += "      <div class=""c-sec""><div class=""st"">The challenge</div><div class=""sb"">$(Esc $p.challenge)</div></div>`n" }
  if ($p.idea)      { $story += "      <div class=""c-sec""><div class=""st"">The idea</div><div class=""sb"">$(Esc $p.idea)</div></div>`n" }
  if ($p.system)    { $story += "      <div class=""c-sec""><div class=""st"">The system</div><div class=""sb"">$(Esc $p.system)</div></div>`n" }
  if ($p.result)    { $story += "      <div class=""c-sec""><div class=""st"">The outcome</div><div class=""sb small"">$(Esc $p.result)</div></div>`n" }
  if ($p.contribution) { $story += "      <div class=""c-sec""><div class=""st"">Role &amp; contribution</div><div class=""sb small"">$(Esc $p.contribution)</div></div>`n" }

  # hero
  $heroHtml = ""
  if ($p.hero) { $heroHtml = "    <div class=""c-hero""><img src=""$($p.hero)"" alt=""$name — key visual"" loading=""eager"" fetchpriority=""high""></div>`n" }

  # gallery
  $galHtml = ""
  if ($p.gallery -and $p.gallery.Count -gt 0) {
    $galHtml = "    <div class=""c-gallery"">`n"
    foreach ($g in $p.gallery) {
      $cls = if ($g.half) { " class=""half""" } else { "" }
      $galHtml += "      <figure$cls><img src=""$($g.src)"" loading=""lazy"" alt=""$name — project image""></figure>`n"
    }
    $galHtml += "    </div>`n"
  }

  # film
  $filmHtml = ""
  if ($p.vimeo) {
    $filmHtml = @"
    <div class="c-film"><div class="l">Film</div><div class="frame"><iframe src="https://player.vimeo.com/video/$($p.vimeo)?title=0&byline=0&portrait=0&dnt=1" title="$name — film" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div></div>

"@
  }

  # credits
  $credHtml = ""
  if ($p.credits -and $p.credits.Count -gt 0) {
    $lines = ($p.credits | ForEach-Object { Esc $_ }) -join "<br>"
    $credHtml = @"
    <div class="c-credits"><h3>Credits</h3><p>$lines</p></div>

"@
  }

  $ogRaw = if ($p.hero) { $p.hero } else { $p.thumb }
  $ogImage = if ($ogRaw -like "/*") { "https://itaiagami.com$ogRaw" } else { $ogRaw }

  $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>$name — Itai Agami</title>
<meta name="description" content="$oneline" />
<link rel="canonical" href="https://itaiagami.com/work/$($p.slug).html" />
<link rel="icon" href="../favicon.svg" type="image/svg+xml" />
<meta property="og:type" content="article" />
<meta property="og:title" content="$name — Itai Agami" />
<meta property="og:description" content="$oneline" />
<meta property="og:url" content="https://itaiagami.com/work/$($p.slug).html" />
<meta property="og:image" content="$ogImage" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="stylesheet" href="../css/site.css" />
</head>
<body data-chrome="sub">
<main>
  <div class="cwrap">
    <div class="c-open">
      <p class="crumb"><a href="../work.html">← Index</a> <span aria-hidden="true">·</span> <span>$num / $totalStr</span></p>
      <h1>$name</h1>
      <p class="oneline">$oneline</p>
    </div>
    <div class="c-meta">
      <div class="m"><div class="l">Client</div><div class="v">$client</div></div>
      <div class="m"><div class="l">Role</div><div class="v">$role</div></div>
      <div class="m"><div class="l">Disciplines</div><div class="v">$disciplines</div></div>
      <div class="m"><div class="l">Collaborators</div><div class="v">$collab</div></div>
    </div>
$heroHtml    <div class="c-story">
$story    </div>
$galHtml$filmHtml$credHtml    <div class="c-next"><div class="l">Next project</div><a href="$($next.slug).html"><span class="thumb"><img src="$($next.thumb)" width="800" height="450" loading="lazy" alt=""></span><span class="t">$(Esc $next.name) →</span></a></div>
  </div>
</main>

<script src="../js/site.js"></script>
</body>
</html>
"@

  $outPath = Join-Path $outDir "$($p.slug).html"
  [System.IO.File]::WriteAllText($outPath, $html, (New-Object System.Text.UTF8Encoding($false)))
  Write-Output "built work/$($p.slug).html"
}
Write-Output "done — $total case pages."
