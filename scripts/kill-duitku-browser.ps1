# Kill proses Playwright (duitku-browser) beserta chrome miliknya
$targets = Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*duitku-browser*') -or
    ($_.Name -eq 'chrome.exe' -and $_.CommandLine -like '*ms-playwright*')
}
foreach ($t in $targets) {
    Write-Output ("Killing " + $t.Name + " PID " + $t.ProcessId)
    Stop-Process -Id $t.ProcessId -Force -ErrorAction SilentlyContinue
}
Write-Output "Selesai."
