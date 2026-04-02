@echo off
pushd "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0dev.ps1"
popd
