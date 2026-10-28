from pathlib import Path
root=Path(__file__).resolve().parent
main=root/'src/main.jsx'
if not main.is_file():raise SystemExit('이 스크립트를 Mind-flow 최상위 폴더에 넣어줘. src/main.jsx를 찾을 수 없어.')
s=main.read_text(encoding='utf-8')
if "import AuthGate from './AuthGate.jsx';" in s:
 print('로그인 화면이 이미 추가되어 있어요.')
else:
 old="createRoot(document.getElementById('root')).render(<App/>);"
 if old not in s:raise SystemExit('main.jsx의 렌더링 방식이 달라요. 기존 코드는 수정하지 않았어. 최신 main.jsx를 보내줘.')
 backup=main.with_name('main.before-auth.jsx')
 if not backup.exists():backup.write_text(s,encoding='utf-8')
 s="import AuthGate from './AuthGate.jsx';\n"+s.replace(old,"createRoot(document.getElementById('root')).render(<AuthGate><App/></AuthGate>);")
 main.write_text(s,encoding='utf-8')
 print('로그인·회원가입 초기화면 연결 완료. 원본 백업: src/main.before-auth.jsx')
