@echo off
chcp 65001 >nul
title SIGESDOC - Clonar de nuevo
set BASE=C:\Users\Matos\Desktop\SIGESDOC-NUEVO
set FECHA=%date:~-4%%date:~3,2%%date:~0,2%
set VIEJO=%BASE%-VIEJO-%FECHA%

echo Esto mueve la carpeta actual a:
echo   %VIEJO%
echo y clona backend y frontend limpios desde GitHub (nada se borra).
echo Cierra antes las ventanas de arranque y apaga Docker con: docker compose down
pause

if exist "%BASE%" move "%BASE%" "%VIEJO%"
mkdir "%BASE%"
cd /d "%BASE%"

git clone https://github.com/ProyectosInstitucionalesUAPA/SIGESDOC_BACKEND.git SIGESDOC_BACKEND
git clone -b develop https://github.com/alejandroalbaine/Sigedocs.git SIGESDOC_FRONTEND

rem Recupera los scripts de arranque y actualizacion de la carpeta anterior
for %%f in (arrancar-nuevo.bat arrancar-frontend.bat actualizar-repos.bat activar-actualizacion-automatica.bat) do (
  if exist "%VIEJO%\%%f" copy "%VIEJO%\%%f" "%BASE%\%%f" >nul
)

echo.
echo ===== Listo. Ahora ejecuta arrancar-nuevo.bat =====
echo Si tenias un archivo .env en el backend, copialo desde %VIEJO%\SIGESDOC_BACKEND
pause
