@echo off
echo ====================================
echo REPOINT Kakao Map 배포 스크립트
echo ====================================
echo.

cd C:\repoint\REPOINT_LIFE

echo [1/4] Git 상태 확인...
git status
echo.

echo [2/4] 변경사항 추가...
git add .
echo.

echo [3/4] 커밋...
git commit -m "feat: Kakao Map 실시간 위치 기반 서비스 완성"
echo.

echo [4/4] GitHub에 푸시...
git push origin main
echo.

echo ====================================
echo 배포 완료!
echo ====================================
echo.
echo Cloudflare Pages가 자동으로 배포를 시작합니다.
echo 약 2-3분 후 다음 주소에서 확인하세요:
echo https://repoint-life-2.pages.dev/local.html
echo.
pause