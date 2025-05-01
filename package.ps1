# AlwaysCC Extension Packaging Script
Write-Host "==================================================="
Write-Host "    AlwaysCC Extension for Firefox"
Write-Host "==================================================="
Write-Host ""

# Check if running from the correct directory
if (-not (Test-Path "manifest.json")) {
    Write-Host "ERROR: This script must be run from the root directory of the extension."
    Write-Host "The manifest.json file was not found in the current directory."
    exit 1
}

# Check required files exist
$missingFiles = 0
foreach ($file in @("content.js", "popup.html", "popup.js")) {
    if (-not (Test-Path $file)) {
        Write-Host "ERROR: Required file $file not found."
        $missingFiles++
    }
}

if ($missingFiles -gt 0) {
    Write-Host "$missingFiles required files are missing. Cannot proceed with packaging."
    exit 1
}

# Create build directory
Write-Host "Creating build directory..."
if (Test-Path "build") { 
    Remove-Item -Recurse -Force "build" 
}
New-Item -ItemType Directory -Path "build" | Out-Null

# Create a temporary working directory
$tempDir = "build\temp"
New-Item -ItemType Directory -Path $tempDir | Out-Null
New-Item -ItemType Directory -Path "$tempDir\icons" | Out-Null

# Copy files
Write-Host ""
Write-Host "[1/2] Packaging Firefox extension..."
Copy-Item "manifest.json" -Destination $tempDir
Copy-Item "content.js" -Destination $tempDir
Copy-Item "popup.html" -Destination $tempDir
Copy-Item "popup.js" -Destination $tempDir

# Copy icons
Write-Host "Copying icons..."
$iconWarning = $false
if (Test-Path "icons\icon-48.png") {
    Copy-Item "icons\icon-48.png" -Destination "$tempDir\icons"
} else {
    Write-Host "WARNING: icons\icon-48.png not found. Extension will be missing this icon."
    $iconWarning = $true
}

if (Test-Path "icons\icon-96.png") {
    Copy-Item "icons\icon-96.png" -Destination "$tempDir\icons"
} else {
    Write-Host "WARNING: icons\icon-96.png not found. Extension will be missing this icon."
    $iconWarning = $true
}

# Create the XPI file (which is just a ZIP file)
Write-Host ""
Write-Host "[2/2] Creating Firefox XPI package..."
$xpiFile = "build\alwayscc-firefox.xpi"

if (Test-Path $xpiFile) {
    Remove-Item $xpiFile -Force
}

# Create the ZIP file using .NET classes to control path separators
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

try {
    # Create empty ZIP file
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $xpiFile)
    
    # Actually, let's extract and recreate with manual path conversions
    $extractDir = "build\extract"
    if (Test-Path $extractDir) {
        Remove-Item -Recurse -Force $extractDir
    }
    New-Item -ItemType Directory -Path $extractDir | Out-Null
    
    # Extract the ZIP we just created
    [System.IO.Compression.ZipFile]::ExtractToDirectory($xpiFile, $extractDir)
    
    # Delete the original ZIP
    Remove-Item $xpiFile -Force
    
    # Now create a new archive manually with forward slashes
    $zipOutputStream = New-Object System.IO.FileStream($xpiFile, [System.IO.FileMode]::Create)
    $zipArchive = New-Object System.IO.Compression.ZipArchive($zipOutputStream, [System.IO.Compression.ZipArchiveMode]::Create)
    
    # Get all files recursively
    $files = Get-ChildItem -Path $extractDir -Recurse -File
    
    foreach ($file in $files) {
        # Get relative path with forward slashes
        $relativePath = $file.FullName.Substring($extractDir.Length + 1).Replace('\', '/')
        
        # Add file to archive with forward slashes in the path
        $entry = $zipArchive.CreateEntry($relativePath)
        $entryStream = $entry.Open()
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        
        $fileStream.CopyTo($entryStream)
        
        $entryStream.Close()
        $fileStream.Close()
    }
    
    # Close the archive
    $zipArchive.Dispose()
    $zipOutputStream.Close()
    
    # Clean up extract directory
    Remove-Item -Recurse -Force $extractDir
    
    Write-Host "Successfully created XPI file with proper path separators."
} 
catch {
    Write-Host "ERROR: An error occurred while creating the XPI file."
    Write-Host $_.Exception.Message
    exit 1
}

# Clean up temp directory
Remove-Item -Recurse -Force $tempDir

# Success message
Write-Host ""
Write-Host "==================================================="
Write-Host "    Packaging Completed Successfully!"
Write-Host "==================================================="
Write-Host ""
Write-Host "Firefox package: $xpiFile"
Write-Host ""

if ($iconWarning) {
    Write-Host "WARNING: Some icon files were missing. See warnings above."
    Write-Host ""
}

Write-Host "Installation Instructions for Firefox:"
Write-Host ""
Write-Host "Method 1 (Temporary Installation - for testing):"
Write-Host "- Open Firefox and go to about:debugging"
Write-Host "- Click 'This Firefox'"
Write-Host "- Click 'Load Temporary Add-on...'"
Write-Host "- Select the .xpi file"
Write-Host ""
Write-Host "Method 2 (For development with signature bypass):"
Write-Host "- In Firefox, navigate to about:config"
Write-Host "- Search for xpinstall.signatures.required and set to false"
Write-Host "- Restart Firefox and install the extension"
Write-Host ""
Write-Host "Method 3 (Permanent Installation - requires signing):"
Write-Host "- Submit your extension to addons.mozilla.org for signing"
Write-Host "- Or use web-ext tool to sign your extension"
Write-Host ""
Write-Host "Packaging process complete. Press any key to exit..."
$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 