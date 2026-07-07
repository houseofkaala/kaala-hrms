# Run in PowerShell as Administrator:
#   Set-ExecutionPolicy -Scope Process Bypass; .\scripts\fix-windows-dns.ps1

$VpsIp = "200.97.162.24"
$Domain = "bymarketingonly.com"
$HostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$Marker = "# kaala-hrms-vps"

$content = Get-Content $HostsPath -Raw
if ($content -match [regex]::Escape($Marker)) {
  Write-Host "HRMS hosts entries already present."
} else {
  @"

$Marker
$VpsIp admin.$Domain
$VpsIp employee.$Domain
$VpsIp $Domain
$VpsIp www.$Domain
"@ | Add-Content -Path $HostsPath -Encoding ASCII
  Write-Host "Added HRMS entries to hosts file."
}

Clear-DnsClientCache
Write-Host ""
Write-Host "Open:"
Write-Host "  https://admin.$Domain/login"
Write-Host "  https://employee.$Domain/login"