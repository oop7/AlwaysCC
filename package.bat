@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo    YouTube Auto Subtitles Extension for Firefox
echo ===================================================
echo.

:: Check if running from the correct directory
if not exist manifest.json (
    echo ERROR: This script must be run from the root directory of the extension.
    echo The manifest.json file was not found in the current directory.
    echo.
    goto :error
)

:: Verify that required Firefox files exist
set MISSING_FILES=0
for %%F in (content.js popup.html popup.js) do (
    if not exist %%F (
        echo ERROR: Required file %%F not found.
        set /a MISSING_FILES+=1
    )
)

if !MISSING_FILES! neq 0 (
    echo.
    echo !MISSING_FILES! required files are missing. Cannot proceed with packaging.
    goto :error
)

:: Create build directory structure
echo Creating build directory...
if exist build rmdir /s /q build
mkdir build\firefox\icons

:: Copy Firefox files
echo.
echo [1/2] Packaging Firefox extension...
copy manifest.json build\firefox\ >nul
copy content.js build\firefox\ >nul
copy popup.html build\firefox\ >nul
copy popup.js build\firefox\ >nul

:: Check if icon files exist and copy them
echo Copying Firefox icons...
set ICON_WARNING=0
if exist icons\icon-48.png (
    copy icons\icon-48.png build\firefox\icons\ >nul
) else (
    echo WARNING: icons\icon-48.png not found. Firefox version will be missing this icon.
    set ICON_WARNING=1
)

if exist icons\icon-96.png (
    copy icons\icon-96.png build\firefox\icons\ >nul
) else (
    echo WARNING: icons\icon-96.png not found. Firefox version will be missing this icon.
    set ICON_WARNING=1
)

:: Create Firefox XPI using PowerShell (ZIP file with .xpi extension)
echo.
echo [2/2] Creating Firefox XPI package...
if exist build\youtube-auto-subtitles-firefox.xpi del /f /q build\youtube-auto-subtitles-firefox.xpi

powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('build\firefox', 'build\youtube-auto-subtitles-firefox.zip');}"
if errorlevel 1 (
    echo ERROR: Failed to create Firefox XPI package.
    goto :error
)
if exist build\youtube-auto-subtitles-firefox.zip (
    ren build\youtube-auto-subtitles-firefox.zip youtube-auto-subtitles-firefox.xpi
)

:: Display success message
echo.
echo ===================================================
echo    Packaging Completed Successfully!
echo ===================================================
echo.
echo Firefox package: build\youtube-auto-subtitles-firefox.xpi
echo.

if %ICON_WARNING% equ 1 (
    echo WARNING: Some icon files were missing. See warnings above.
    echo.
)

echo Installation Instructions for Firefox:
echo.
echo Method 1 (Temporary Installation - for testing):
echo - Open Firefox and go to about:debugging
echo - Click "This Firefox"
echo - Click "Load Temporary Add-on..."
echo - Select the .xpi file
echo.
echo Method 2 (For development with signature bypass):
echo - In Firefox, navigate to about:config
echo - Search for xpinstall.signatures.required and set to false
echo - Restart Firefox and install the extension
echo.
echo Method 3 (Permanent Installation - requires signing):
echo - Submit your extension to addons.mozilla.org for signing
echo - Or use web-ext tool to sign your extension
echo.
goto :end

:error
echo.
echo ===================================================
echo    Packaging Failed!
echo ===================================================
echo.
echo Please fix the errors above and try again.
exit /b 1

:end
echo Packaging process complete. Press any key to exit...
pause >nul 