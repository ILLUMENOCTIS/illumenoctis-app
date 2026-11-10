/* ==================== Korean for everything added since the first program ====================
   The page translates by looking each English phrase up in KO, as it appears. This file
   adds every phrase the newer parts of the program show, and teaches the lookup three
   things it could not do before:
     - phrases with a number or a name in them ("12 removed", "Open Celia", "Checked 10:42:05"),
       by pattern;
     - lines joined with " · " ("Russia · 20 세"), part by part;
     - country names, from the program's own country list.
   Names, notes, figures and anything typed are never touched: only a whole phrase that is
   in the list, or fits a pattern, is changed. Emails to agencies are never translated. */
(function(){
  if(typeof KO === 'undefined') return;
  Object.assign(KO, {
    "Vote": "투표", "Voting": "투표 중", "Approved": "승인", "Cancelled": "취소", "Opus": "오푸스", "Atlas": "아틀라스", "Map": "지도", "Tie-breaker": "타이브레이커", "Lumen": "루멘", "Communicatus": "코뮤니카투스",
    /* tabs and their help */
    "Suggestiones": "수게스티오네스", "Atlas": "아틀라스", "Mother Agencies": "마더 에이전시",
    /* Suggestiones, New design (1.2.90) */
    "For you": "추천", "Korean market": "한국 시장", "New faces & Development": "뉴페이스 & 디벨롭먼트", "New picks": "새로 뽑기",
    "Both": "모두", "New faces": "뉴페이스", "Development": "디벨롭먼트", "New face": "뉴페이스", "See all": "모두 보기",
    "From New face & Development boards": "뉴페이스 & 디벨롭먼트 보드에서", "height not given": "키 정보 없음",
    "Measured models from the whole Directory that best fit the Korean-market bands": "전체 디렉토리에서 한국 시장 기준에 가장 잘 맞는 측정된 모델",
    "Models on the agencies' New face and Development boards": "에이전시 뉴페이스·디벨롭먼트 보드의 모델",
    "Models that fit the height bands, 50 at a time": "키 기준에 맞는 모델, 한 번에 50명",
    "Every agency, with its boards and models": "모든 에이전시와 보드, 모델",
    "All agencies on a world map": "세계 지도 위의 모든 에이전시",
    "Boards the scan can’t read, to check by hand": "스캔이 읽지 못한 보드 — 직접 확인",
    "Model and agency accounts you follow": "팔로우하는 모델·에이전시 계정",
    "Models you’ve lit, sorted by lamp": "내가 램프를 켠 모델, 램프별로",
    "Models in talks with their agency": "에이전시와 협의 중인 모델",
    "Everyone’s lamps together": "모두의 램프를 한곳에",
    "Build a composite card from photos": "사진으로 컴포지트 카드 만들기",
    "Every lamp anyone has set, in order": "누가 언제 켠 램프인지, 순서대로",
    "Profiles agencies have taken down": "에이전시가 내린 프로필",
    /* top bar */
    "Refresh everything (F5)": "전체 새로고침 (F5)", "Refreshing…": "새로고침 중…", "Up to date": "최신 상태입니다",
    "Hide the clocks and map": "시계와 지도 숨기기", "Show the clocks and map": "시계와 지도 보이기",
    "Hide the filters": "필터 숨기기", "Show the filters under the clocks": "시계 아래에 필터 보이기",
    "Exit full screen": "전체 화면 종료", "Exit full screen (Esc)": "전체 화면 종료 (Esc)",
    "Show this page on the whole screen": "이 페이지를 전체 화면으로", "files": "파일",
    "Display mode": "화면 모드", "Sepia mode": "세피아 모드", "Page zoom": "페이지 확대",
    /* filters across the top */
    "Search and filters": "검색과 필터", "MEASUREMENTS": "사이즈", "About the measurements": "사이즈 안내",
    "Units": "단위", "Sort": "정렬", "Name A–Z": "이름 A–Z", "Most models": "모델 많은 순",
    "Most that fit the measurements": "사이즈에 맞는 모델 많은 순", "Region › Country (A–Z)": "지역 › 국가 (A–Z)",
    "Clear all": "모두 지우기", "Clear": "지우기", "♡ Favorites": "♡ 즐겨찾기", "Favorites": "즐겨찾기",
    "♡ Favorite": "♡ 즐겨찾기", "Favorite": "즐겨찾기", "Favorite agencies": "즐겨찾는 에이전시",
    "♥ Favorite agencies": "♥ 즐겨찾는 에이전시", "Search the Directory": "디렉터리 검색",
    "Give the Directory the whole window (Esc to go back)": "디렉터리를 창 전체로 (Esc로 돌아가기)",
    "Hide the agency list to see more photos (Ctrl [)": "에이전시 목록을 숨기고 사진 더 보기 (Ctrl [)",
    "Show the agency list (Ctrl [)": "에이전시 목록 보이기 (Ctrl [)",
    /* Directory */
    "Where would you like to look?": "어디를 볼까요?", "Pick a region, or jump straight to a country.": "지역을 고르거나 국가로 바로 가세요.",
    "Faces from each region’s boards.": "지역별 보드의 모델들.", "Or start by region": "또는 지역부터 시작",
    "Region not stated": "지역 미기재", "Location not stated": "위치 미기재", "Choose a region": "지역 선택",
    "Choose an agency on the left to see its models.": "왼쪽에서 에이전시를 고르면 모델이 보입니다.",
    "Agencies you open will show here.": "연 에이전시가 여기에 표시됩니다.",
    "No agencies opened yet. Open any agency in All agencies and it is kept here.": "아직 연 에이전시가 없습니다. 전체 에이전시에서 열면 여기에 남습니다.",
    "No models opened yet. Click a model’s name on any card or list and they are kept here.": "아직 연 모델이 없습니다. 카드나 목록에서 모델 이름을 누르면 여기에 남습니다.",
    "The agencies you opened and the models you clicked, newest first": "최근에 연 에이전시와 누른 모델, 최신순",
    "Pick up where you left off": "하던 곳에서 계속", "Your desk": "내 책상", "Share bar": "공유 막대",
    "Start screen layout": "시작 화면 배치", "Layout": "배치", "← Start screen": "← 시작 화면", "Start screen": "시작 화면",
    "Find an agency, a city or a model": "에이전시, 도시, 모델 찾기",
    "Type a few letters; press Enter to search everything.": "몇 글자 입력 후 Enter를 누르면 전체를 검색합니다.",
    "Nothing starts with that — press Enter to search everything.": "그렇게 시작하는 항목이 없습니다 — Enter를 누르면 전체를 검색합니다.",
    "Nothing to choose here.": "고를 항목이 없습니다.", "No agency matches these filters.": "필터에 맞는 에이전시가 없습니다.",
    "No removed agency matches these filters.": "필터에 맞는 삭제된 에이전시가 없습니다.",
    "No favorite agencies": "즐겨찾는 에이전시 없음", "Press ♡ Favorite on an agency to keep it here.": "에이전시에서 ♡ 즐겨찾기를 누르면 여기에 남습니다.",
    "Open an agency and press": "에이전시를 열고 다음을 누르세요:", "Models you light green will show here.": "초록 램프를 켠 모델이 여기에 표시됩니다.",
    "Your green lamps": "내 초록 램프", "All boards": "모든 보드", "Boards": "보드", "Names": "이름", "Profile": "프로필",
    "Open board ↗": "보드 열기 ↗", "Open on the agency’s site ↗": "에이전시 사이트에서 열기 ↗",
    "Take this board away": "이 보드 닫기", "Show this board on the whole screen": "이 보드를 전체 화면으로",
    "Click an agency to open its models; click again to close": "에이전시를 누르면 모델이 열리고, 다시 누르면 닫힙니다",
    "No model on this board fits the measurements.": "이 보드에는 사이즈에 맞는 모델이 없습니다.",
    "No models on this board.": "이 보드에 모델이 없습니다.", "Its boards have not been read yet.": "아직 보드를 읽지 않았습니다.",
    "No model in these heights has measurements yet.": "이 키 범위의 모델 중 사이즈가 있는 모델이 아직 없습니다.",
    "No measured model in these heights yet": "이 키 범위에 측정된 모델이 아직 없습니다",
    "Show more agencies": "에이전시 더 보기", "Show more models": "모델 더 보기", "Show all": "모두 보기", "Show fewer": "줄여 보기",
    "Show removed": "삭제된 항목 보기", "Put back": "되돌리기", "Remove": "삭제", "remove": "삭제", "Undo": "실행 취소",
    "removed from the Directory.": "디렉터리에서 삭제되었습니다.", "is back on the list.": "목록으로 돌아왔습니다.",
    "Photos": "사진", "Polaroids": "폴라로이드", "All photos": "모든 사진", "Only the card photo": "카드 사진만",
    "Our talents": "소속 탤런트", "From the website": "웹사이트에서",
    /* card, slideshow */
    "Full view": "전체 보기", "Full view · F": "전체 보기 · F", "Exit full view": "전체 보기 종료", "Exit full view · F or Esc": "전체 보기 종료 · F 또는 Esc",
    "Close the panel": "패널 닫기", "Open the panel": "패널 열기", "No slideshow": "슬라이드쇼 없음",
    "Looking for more photos…": "사진을 더 찾는 중…", "Finding a photo…": "사진 찾는 중…", "Finding the photo…": "사진 찾는 중…",
    "This model’s page is no longer on the agency’s site": "이 모델의 페이지가 에이전시 사이트에서 내려갔습니다",
    "Check the agency’s site directly": "에이전시 사이트에서 직접 확인하세요",
    "This agency shows its portfolios as a PDF": "이 에이전시는 포트폴리오를 PDF로 보여줍니다",
    "Open the agency page to see the photos": "에이전시 페이지를 열어 사진을 보세요",
    "The agency’s site does not let the program read its photos": "에이전시 사이트가 사진 읽기를 허용하지 않습니다",
    "No other photos could be read from the agency’s page": "에이전시 페이지에서 다른 사진을 읽지 못했습니다",
    "Open the agency page to see the book, polaroids and videos": "에이전시 페이지를 열어 북, 폴라로이드, 영상을 보세요",
    "The agency’s page has no other photos the program can show": "에이전시 페이지에 보여줄 수 있는 다른 사진이 없습니다",
    "Open the agency page to see more": "에이전시 페이지에서 더 보기",
    "There is no profile link for this model": "이 모델의 프로필 링크가 없습니다",
    "The slideshow works in the ILLUMENOCTIS program": "슬라이드쇼는 ILLUMENOCTIS 프로그램에서 작동합니다",
    "Double-click for full view · drop or paste a photo to replace the card photo, or click to choose one": "두 번 클릭하면 전체 보기 · 사진을 끌어 놓거나 붙여 넣으면 카드 사진이 바뀌고, 클릭하면 사진을 고릅니다",
    "Double-click to go back to the card · drop or paste a photo to replace the card photo": "두 번 클릭하면 카드로 돌아갑니다 · 사진을 끌어 놓거나 붙여 넣으면 카드 사진이 바뀝니다",
    "Drop or paste a photograph here, or click to choose one": "여기에 사진을 끌어 놓거나 붙여 넣거나, 클릭해서 고르세요",
    "Drop or paste another photograph to replace it": "다른 사진을 끌어 놓거나 붙여 넣으면 바뀝니다",
    "drop or paste a photograph": "사진을 끌어 놓거나 붙여 넣기", "or click to choose": "또는 클릭해서 고르기",
    "drop or paste a photograph<br>or click to choose": "사진을 끌어 놓거나 붙여 넣기<br>또는 클릭해서 고르기",
    "open the agency photo, then drop or paste it here": "에이전시 사진을 연 뒤 여기에 끌어 놓거나 붙여 넣으세요",
    "Photo saved": "사진 저장됨", "No photo on the agency site": "에이전시 사이트에 사진 없음", "Find photo": "사진 찾기",
    "Show 50 models you have not been shown yet": "아직 보지 않은 모델 50명 보기",
    "Show Suggestiones on the whole screen": "수게스티오네스를 전체 화면으로",
    /* lamps and booking cards */
    "Completed — move this card here": "완료 — 이 카드를 여기로 옮기기", "Cancelled — move this card here": "취소 — 이 카드를 여기로 옮기기",
    "Processing": "진행 중", "Show the details": "세부 정보 보기", "Hide the details": "세부 정보 숨기기",
    "Open everything for this booking": "이 부킹의 모든 자료 열기", "Open the Booking tab": "부킹 탭 열기",
    "You lit this first - your lamp decides where the card goes": "내가 먼저 켰습니다 — 내 램프가 카드 위치를 정합니다",
    "Add a photo": "사진 추가", "Add a photo — choose a file": "사진 추가 — 파일 선택",
    "Choose a photo file…": "사진 파일 선택…", "Find it on the agency site": "에이전시 사이트에서 찾기",
    "Countries worked in": "활동 국가", "add a country": "국가 추가", "Choose a country": "국가 선택", "Coming from": "출발 국가",
    "Passport #": "여권 번호", "Passport issued": "여권 발급일", "Passport expires": "여권 만료일", "Date of birth": "생년월일",
    "No country matches": "맞는 국가 없음", "none noted": "기재 없음", "Where": "위치", "Where on the ear": "귀의 어느 부분",
    "e.g. left wrist, upper back": "예: 왼쪽 손목, 등 위쪽", "How many tattoos": "타투 개수", "Where the tattoos are": "타투 위치",
    "Left ear: how many piercings": "왼쪽 귀: 피어싱 개수", "Right ear: how many piercings": "오른쪽 귀: 피어싱 개수",
    "Left ear: where": "왼쪽 귀: 위치", "Right ear: where": "오른쪽 귀: 위치",
    "Lobe": "귓불", "Upper lobe": "위쪽 귓불", "Helix": "헬릭스", "Tragus": "트라거스", "Conch": "콘크", "Daith": "데이스", "Rook": "룩", "Industrial": "인더스트리얼",
    "2 years": "2년", "90 days": "90일", "Print": "인쇄", "Save as PDF": "PDF로 저장",
    "Open the contract notes and files": "계약 메모와 파일 열기", "Open the email notes and files": "이메일 메모와 파일 열기",
    "Open the flight ticket notes and files": "항공권 메모와 파일 열기", "Open the guarantee negotiation notes and files": "개런티 협상 메모와 파일 열기",
    "Open the visa notes and files": "비자 메모와 파일 열기",
    /* booking viewer: where the files are */
    "In Dropbox": "Dropbox에서", "Choose a folder…": "폴더 선택…", "Look in the folders again for files added since": "그 사이 추가된 파일이 있는지 폴더를 다시 확인",
    "Opening the Dropbox folder…": "Dropbox 폴더를 여는 중…", "Opening the folder on this computer…": "이 컴퓨터의 폴더를 여는 중…",
    "Not found on this computer": "이 컴퓨터에서 찾지 못함", "No folder for this model yet": "아직 이 모델의 폴더가 없음",
    "This model’s Dropbox folder": "이 모델의 Dropbox 폴더", "Showing": "표시 중:", "from Dropbox": "Dropbox에서",
    "has no files yet. As soon as photos, videos or documents are added and synced, they open right here.": "에 아직 파일이 없습니다. 사진, 영상, 문서가 추가되어 동기화되면 바로 여기에서 열립니다.",
    "Try again": "다시 시도",
    /* Atlas */
    "Agencies by region": "지역별 에이전시", "World": "세계", "My favorites": "내 즐겨찾기", "Regions": "지역", "Map": "지도",
    "Regions, countries and agencies": "지역, 국가, 에이전시", "Where you are": "현재 위치", "Zoom in": "확대", "Zoom out": "축소",
    "Back out one level": "한 단계 위로", "Back out one level (Esc)": "한 단계 위로 (Esc)",
    "Re-centre the map on this place": "이 장소로 지도 다시 맞추기", "Re-centre the map on this place (after dragging or zooming)": "이 장소로 지도 다시 맞추기 (끌거나 확대한 뒤)",
    "Hide the agencies panel to see more of the map": "에이전시 패널을 숨기고 지도 더 보기", "Show the agencies panel": "에이전시 패널 보이기",
    "Show the Atlas on the whole screen": "아틀라스를 전체 화면으로", "Back to the atlas": "아틀라스로 돌아가기", "← Back to the atlas": "← 아틀라스로 돌아가기",
    "← Back to the list": "← 목록으로 돌아가기", "agencies in a country": "국가별 에이전시", "street address": "도로명 주소", "city only": "도시만",
    "drag left or right to turn the globe": "좌우로 끌어 지구본 돌리기", "Drag left or right to turn the globe": "좌우로 끌어 지구본 돌리기",
    "scroll to zoom": "스크롤로 확대", "Esc backs out": "Esc로 뒤로", "Each bubble is as big as the number of agencies there.": "원의 크기는 그곳의 에이전시 수입니다.",
    "Each block is a region, as wide as its share. Point at one to see its countries; click to open.": "블록은 지역이며 너비는 비중입니다. 가리키면 국가가 보이고, 누르면 열립니다.",
    "agencies at their street address · names show as you zoom in": "도로명 주소에 있는 에이전시 · 확대하면 이름이 보입니다",
    "no address on file": "등록된 주소 없음", "Frame this view again": "이 화면 다시 맞추기", "map library did not load": "지도 라이브러리를 불러오지 못했습니다",
    /* Backlog, work log, notes */
    "actions": "작업", "Pick a date": "날짜 선택", "Go to date (DD/MM/YYYY)": "날짜로 이동 (DD/MM/YYYY)", "DD/MM/YYYY": "DD/MM/YYYY",
    "Only you see your notes. Pick another day on the calendar for its page.": "메모는 나만 볼 수 있습니다. 달력에서 다른 날을 고르면 그날의 페이지가 열립니다.",
    "Write anything to remember for this day…": "이날 기억할 내용을 적으세요…", "Sign in to write notes.": "메모를 쓰려면 로그인하세요.",
    "Could not save - it will try again as you type": "저장하지 못했습니다 — 입력하는 동안 다시 시도합니다",
    "Saved": "저장됨", "Saving…": "저장 중…", "— no note yet": "— 아직 메모 없음", "— note": "— 메모",
    "No blind spot matches that. Clear the search or widen the region.": "맞는 크롤 불가 항목이 없습니다. 검색을 지우거나 지역을 넓히세요.",
    /* crawl note, updates, program */
    "Measurement crawl": "사이즈 수집", "Reading the measurements…": "사이즈를 읽는 중…", "Pause": "일시정지", "Resume": "다시 시작",
    "Run it again": "다시 실행", "Run it again — what came in already is kept.": "다시 실행 — 이미 들어온 내용은 유지됩니다.",
    "Another computer is crawling this list - waiting": "다른 컴퓨터가 이 목록을 수집 중 — 대기",
    "Done.": "완료.", "Stopped:": "중지됨:", "Check for updates": "업데이트 확인", "Checking…": "확인 중…",
    "This is the newest version.": "최신 버전입니다.", "Restart now": "지금 다시 시작", "Restart the program to use it.": "사용하려면 프로그램을 다시 시작하세요.",
    "Later": "나중에", "Update": "업데이트", "Program": "프로그램", "Publish an update to everyone…": "모두에게 업데이트 배포…",
    "Choose the import file…": "가져올 파일 선택…", "Bring over from the dashboard": "대시보드에서 가져오기", "Bring it over": "가져오기",
    "The directory in the program is replaced by this one.": "프로그램의 디렉터리가 이것으로 바뀝니다.",
    "Choosing…": "선택 중…", "Sending…": "보내는 중…", "Setting…": "설정 중…", "Looking…": "찾는 중…", "Reloading…": "다시 불러오는 중…",
    "Opened in Hiworks": "하이웍스에서 열림", "Not sent:": "보내지 않음:",
    "Click ✉ beside a contact to write to them.": "연락처 옆의 ✉를 누르면 메일을 씁니다.",
    "The team voted this model out (Cancelled) — ✉ opens an email without the model. Reopen the vote to include them.": "팀이 이 모델을 반대(취소)했습니다 — ✉는 모델 없이 이메일을 엽니다. 포함하려면 투표를 다시 여세요.",
    "This model is ruled out (red) by someone — ✉ opens an email without the model. Take the red lamp off to include them.": "누군가 이 모델을 제외(빨강)했습니다 — ✉는 이 모델 없이 메일을 엽니다. 포함하려면 빨간 램프를 끄세요.",
    "At least 4 characters.": "4자 이상 입력하세요.", "Could not remove": "삭제하지 못했습니다", "Restore": "복원", "Viewed": "본 항목",
    "When you last opened this model": "이 모델을 마지막으로 연 때", "Show": "보기", "Set": "설정",
    /* right-click (also translated in the menu itself) */
    "Copy image": "이미지 복사", "Save image as…": "다른 이름으로 이미지 저장…",
    "Click for full view · drop or paste a photo to replace the card photo · right-click to copy, save or choose a photo": "클릭하면 전체 보기 · 사진을 끌어 놓거나 붙여 넣으면 카드 사진이 바뀝니다 · 오른쪽 클릭으로 복사, 저장, 파일 선택",
    "Double-click or Esc to go back to the card · drop or paste a photo to replace the card photo": "두 번 클릭하거나 Esc를 누르면 카드로 돌아갑니다 · 사진을 끌어 놓거나 붙여 넣으면 카드 사진이 바뀝니다",
    "Previous": "이전", "Next": "다음", "‹ Previous": "‹ 이전", "Next page ›": "다음 페이지 ›", "Close (Esc)": "닫기 (Esc)",
    "Country / city": "국가 / 도시", "Show as": "보기 방식", "As published": "게시된 그대로"
  });
  /* country names: the program's own list, in Korean */
  Object.assign(KO, {"Afghanistan":"아프가니스탄","Algeria":"알제리","Andorra":"안도라","Angola":"앙골라","Antigua and Barbuda":"앤티가 바부다","Bahamas":"바하마","The Bahamas":"바하마","Bahrain":"바레인","Bangladesh":"방글라데시","Barbados":"바베이도스","Belize":"벨리즈","Benin":"베냉","Bhutan":"부탄","Bolivia (Plurinational State of)":"볼리비아","Bolivia":"볼리비아","Bosnia and Herzegovina":"보스니아 헤르체고비나","Botswana":"보츠와나","Brunei Darussalam":"브루나이","Brunei":"브루나이","Burkina Faso":"부르키나파소","Burundi":"부룬디","Cabo Verde":"카보베르데","Cape Verde":"카보베르데","Cambodia":"캄보디아","Cameroon":"카메룬","Central African Republic":"중앙 아프리카 공화국","Chad":"차드","Comoros":"코모로","Congo":"콩고","Republic of the Congo":"콩고","Congo-Brazzaville":"콩고","Costa Rica":"코스타리카","Côte d'Ivoire":"코트디부아르","Ivory Coast":"코트디부아르","Cote d'Ivoire":"코트디부아르","Cuba":"쿠바","Czechia":"체코","Democratic People's Republic of Korea":"북한","North Korea":"북한","Korea, North":"북한","Democratic Republic of the Congo":"콩고민주공화국","DR Congo":"콩고민주공화국","Congo-Kinshasa":"콩고민주공화국","Djibouti":"지부티","Dominica":"도미니카","Dominican Republic":"도미니카 공화국","Ecuador":"에콰도르","El Salvador":"엘살바도르","Equatorial Guinea":"적도 기니","Eritrea":"에리트리아","Eswatini":"에스와티니","Swaziland":"에스와티니","Ethiopia":"에티오피아","Fiji":"피지","Gabon":"가봉","Gambia":"감비아","The Gambia":"감비아","Ghana":"가나","Grenada":"그레나다","Guatemala":"과테말라","Guinea":"기니","Guinea-Bissau":"기니비사우","Guinea Bissau":"기니비사우","Guyana":"가이아나","Haiti":"아이티","Holy See":"바티칸 시국","Vatican":"바티칸 시국","Vatican City":"바티칸 시국","Honduras":"온두라스","Iran (Islamic Republic of)":"이란","Iran":"이란","Iraq":"이라크","Jamaica":"자메이카","Jordan":"요르단","Kiribati":"키리바시","Kuwait":"쿠웨이트","Kyrgyz Republic":"키르기스스탄","Lao People's Democratic Republic":"라오스","Laos":"라오스","Lao PDR":"라오스","Lebanon":"레바논","Lesotho":"레소토","Liberia":"라이베리아","Libya":"리비아","Liechtenstein":"리히텐슈타인","Madagascar":"마다가스카르","Malawi":"말라위","Malaysia":"말레이시아","Maldives":"몰디브","Mali":"말리","Marshall Islands":"마셜 제도","Mauritania":"모리타니","Mauritius":"모리셔스","Micronesia (Federated States of)":"미크로네시아","Micronesia":"미크로네시아","Monaco":"모나코","Montenegro":"몬테네그로","Mozambique":"모잠비크","Myanmar":"미얀마","Burma":"미얀마","Namibia":"나미비아","Nauru":"나우루","Nepal":"네팔","Netherlands (Kingdom of the)":"네덜란드","The Netherlands":"네덜란드","Holland":"네덜란드","Nicaragua":"니카라과","Niger":"니제르","North Macedonia":"북마케도니아","Macedonia":"북마케도니아","Oman":"오만","Pakistan":"파키스탄","Palau":"팔라우","Panama":"파나마","Papua New Guinea":"파푸아뉴기니","Paraguay":"파라과이","Qatar":"카타르","Republic of Korea":"대한민국","Korea, South":"대한민국","Republic of Moldova":"몰도바","Russian Federation":"러시아","Rwanda":"르완다","Saint Kitts and Nevis":"세인트키츠 네비스","Saint Lucia":"세인트루시아","Saint Vincent and the Grenadines":"세인트빈센트그레나딘","Samoa":"사모아","San Marino":"산마리노","Sao Tome and Principe":"상투메 프린시페","São Tomé and Príncipe":"상투메 프린시페","Saudi Arabia":"사우디아라비아","Senegal":"세네갈","Seychelles":"세이셸","Sierra Leone":"시에라리온","Solomon Islands":"솔로몬 제도","Somalia":"소말리아","South Sudan":"남수단","Sri Lanka":"스리랑카","State of Palestine":"팔레스타인","Palestine":"팔레스타인","Sudan":"수단","Suriname":"수리남","Syrian Arab Republic":"시리아","Syria":"시리아","Tajikistan":"타지키스탄","Timor-Leste":"동티모르","East Timor":"동티모르","Togo":"토고","Tonga":"통가","Trinidad and Tobago":"트리니다드 토바고","Tunisia":"튀니지","Turkiye":"튀르키예","Türkiye":"튀르키예","Türkiye Cumhuriyeti":"튀르키예","Republic of Turkey":"튀르키예","Turkmenistan":"투르크메니스탄","Tuvalu":"투발루","Uganda":"우간다","United Arab Emirates":"아랍에미리트","Emirates":"아랍에미리트","United Kingdom of Great Britain and Northern Ireland":"영국","Great Britain":"영국","Britain":"영국","England":"잉글랜드","Scotland":"스코틀랜드","Wales":"웨일스","Northern Ireland":"북아일랜드","United Republic of Tanzania":"탄자니아","Tanzania":"탄자니아","United States of America":"미국","Vanuatu":"바누아투","Venezuela (Bolivarian Republic of)":"베네수엘라","Venezuela":"베네수엘라","Viet Nam":"베트남","Yemen":"예멘","Zambia":"잠비아","Zimbabwe":"짐바브웨","Kosovo":"코소보","Hong Kong SAR, China":"홍콩","Macao SAR, China":"마카오","Macao":"마카오","Macau":"마카오","Chinese Taipei":"대만","Republic of China":"대만","People's Republic of China":"중국","P.R. China":"중국","Slovak Republic":"슬로바키아"});

  /* phrases with a number or a name in them */
  const T = s => (KO[s] != null ? KO[s] : null);
  const tr = s => { const t = T(s); return t != null ? t : (more(s) || s); };
  const RX = [
    [/^([\d,]+) removed$/, (m, n) => n + '개 삭제됨'],
    [/^([\d,]+) countries$/, (m, n) => n + '개국'],
    [/^([\d,]+) offices?$/, (m, n) => '지점 ' + n + '곳'],
    [/^([\d,]+) files?$/, (m, n) => '파일 ' + n + '개'],
    [/^files ([\d.]+%)$/, (m, n) => '파일 ' + n],
    [/^([\d,]+) models?$/, (m, n) => '모델 ' + n + '명'],
    [/^([\d,]+) agencies$/, (m, n) => '에이전시 ' + n + '곳'],
    [/^On the boards of ([\d,]+) offices$/, (m, n) => '지점 ' + n + '곳의 보드에 있음'],
    [/^On ([\d,]+) boards$/, (m, n) => '보드 ' + n + '개에 있음'],
    [/^Open (.+)$/, (m, n) => /[→↗]$/.test(n) ? null : n + ' 열기'],
    [/^Checked (\d\d:\d\d:\d\d)$/, (m, t) => t + ' 확인'],
    [/^updated (.+)$/, (m, d) => d + ' 업데이트'],
    [/^seen (\d{4}-\d\d-\d\d)$/, (m, d) => d + ' 확인'],
    [/^([\d,]+) no location$/, (m, n) => '위치 없음 ' + n],
    [/^([\d,]+) at an address$/, (m, n) => '주소 있음 ' + n],
    [/^([\d,]+) city only$/, (m, n) => '도시만 ' + n],
    [/^([\d,]+) here by city only$/, (m, n) => '도시만 있는 곳 ' + n],
    [/^([\d,]+) of ([\d,]+) bookings$/, (m, a, b) => '부킹 ' + b + '건 중 ' + a + '건'],
    [/^([\d,]+) cards? (?:is|are) open, but none of them answer the filters\. Clear the search, or press Reset\.$/, (m, n) => '열린 카드 ' + n + '장 중 필터에 맞는 카드가 없습니다. 검색을 지우거나 초기화를 누르세요.'],
    [/^([\d,]+) models fit \(([\d,]+) women, ([\d,]+) men\)$/, (m, a, w, x) => '맞는 모델 ' + a + '명 (여성 ' + w + ', 남성 ' + x + ')'],
    [/^([\d,]+) shown to you this round$/, (m, n) => '이번에 ' + n + '명 표시'],
    [/^Women (.+)$/, (m, r) => '여성 ' + r], [/^men (.+)$/, (m, r) => '남성 ' + r],
    [/^picked at random from the whole Directory$/, () => '전체 디렉터리에서 무작위로 선택'],
    [/^you have seen everyone, so it started over$/, () => '모두 보았으므로 처음부터 다시 시작했습니다'],
    [/^Or show all ([\d,]+) agencies$/, (m, n) => '또는 에이전시 ' + n + '곳 모두 보기'],
    [/^Show ([\d,]+) more$/, (m, n) => n + '개 더 보기'],
    [/^Photos (\d+%) ✕$/, (m, n) => '사진 ' + n + ' ✕'],
    [/^(Interested|Pending|Ruled out): (.+)$/, (m, a, b) => T(a) + ': ' + b],
    [/^Set (.+)$/, (m, a) => a + ' 선택'],
    [/^Find photo — (.+)$/, (m, a) => '사진 찾기 — ' + tr(a)],
    [/^Add a photo — choose a file, or find it on the agency site \((.+)\)$/, (m, a) => '사진 추가 — 파일 선택 또는 에이전시 사이트에서 찾기 (' + tr(a) + ')'],
    [/^Folder made: BOOKING › (.+) \(this computer \+ Dropbox\)$/, (m, a) => '폴더 생성: BOOKING › ' + a + ' (이 컴퓨터 + Dropbox)'],
    [/^Folder made: BOOKING › (.+) \(this computer\)$/, (m, a) => '폴더 생성: BOOKING › ' + a + ' (이 컴퓨터)'],
    [/^Folder made on this computer only: BOOKING › (.+?) - Dropbox: (.+)$/, (m, a, w) => '이 컴퓨터에만 폴더 생성: BOOKING › ' + a + ' — Dropbox: ' + w],
    [/^Folder made in Dropbox: BOOKING › (.+)$/, (m, a) => 'Dropbox에 폴더 생성: BOOKING › ' + a],
    [/^Folder made on this computer: BOOKING › (.+)$/, (m, a) => '이 컴퓨터에 폴더 생성: BOOKING › ' + a],
    [/^Dropbox folder could not be made \((.+)\)$/, (m, w) => 'Dropbox 폴더를 만들지 못했습니다 (' + w + ')'],
    [/^There is no folder called (.+) in (.+) yet\.$/, (m, a, b) => b + '에 ' + a + ' 폴더가 아직 없습니다.'],
    [/^(HT|B|W|H|SH) from$/, (m, k) => k + ' 최소'], [/^(HT|B|W|H|SH) to$/, (m, k) => k + ' 최대'],
    [/^· (.+)$/, (m, a) => T(a) != null ? '· ' + T(a) : null],
    [/^Region not stated · (.+)$/, (m, a) => '지역 미기재 · ' + a],
    [/^Only (.+) \(lit this first\) or Paul can remove this card$/, (m, a) => a + ' 님(처음 램프를 켠 사람) 또는 Paul만 이 카드를 삭제할 수 있습니다'],
    [/^(.+) lit this first - their lamp decides where the card goes$/, (m, a) => a + ' 님이 먼저 켰습니다 — 그 램프가 카드 위치를 정합니다'],
    [/^ILLUMÉNOCTIS (\S+) is ready\.?$/, (m, v) => 'ILLUMÉNOCTIS ' + v + ' 준비 완료']
  ];
  let depth = 0;
  function more(key){
    if(depth > 3 || !key) return null;
    depth++;
    try{
      for(const [re, f] of RX){ const m = re.exec(key); if(m){ const r = f(...m); if(r != null) return r; } }
      /* a line made of parts: " · " between them */
      if(key.indexOf(' · ') > 0){
        const parts = key.split(' · ');
        let changed = false;
        const out = parts.map(p => { const t = T(p) != null ? T(p) : more(p); if(t != null && t !== p){ changed = true; return t; } return p; });
        if(changed) return out.join(' · ');
      }
      return null;
    } finally { depth--; }
  }
  window.illuKoMore = key => (typeof LANG !== 'undefined' && LANG === 'ko') ? more(key) : null;
  /* the page looks phrases up through curDict(): Korean now also tries the patterns above,
     after the exact list and the page's own patterns */
  try{
    const base = curDict;
    const KOX = new Proxy(KO, {get(t, k){
      if(typeof k !== 'string') return t[k];
      if(t[k] != null) return t[k];
      let v = null;
      try{ v = (typeof koRx === 'function') ? koRx(k) : null; }catch(e){}
      return v != null ? v : more(String(k).replace(/\s+/g, ' ').trim());
    }});
    curDict = function(){ return (typeof LANG !== 'undefined' && LANG === 'ko') ? KOX : base(); };
    window.curDict = curDict;
  }catch(e){}
  /* a title or placeholder the page changes later is translated too (the page's own watcher
     only sees new elements); a changed English original replaces the one remembered */
  const ATTR = ['title', 'placeholder', 'aria-label'];
  let pend = new Set(), tmr = 0;
  try{
    new MutationObserver(ms => {
      if(typeof LANG === 'undefined' || LANG === 'en') return;
      for(const m of ms){
        const el = m.target, a = m.attributeName, slot = '__en_' + a, v = el.getAttribute(a);
        if(v == null) continue;                                  // taken off for a moment (the hover description does this): keep the English original
        if(el[slot] != null){
          const D = (typeof curDict === 'function') ? curDict() : null;
          const key = String(el[slot]).replace(/\s+/g, ' ').trim();
          const was = (D && D[key] != null) ? D[key] : (window.illuKoMore && window.illuKoMore(key)) || el[slot];
          if(v === was || v === el[slot]) continue;            // our own change, or nothing new
          el[slot] = null;                                       // the page wrote a new English line
        }
        pend.add(el);
      }
      if(pend.size && !tmr) tmr = setTimeout(() => { tmr = 0; const els = pend; pend = new Set(); for(const el of els) if(el.isConnected) try{ langEl(el); }catch(e){} }, 30);
    }).observe(document.body, {attributes: true, subtree: true, attributeFilter: ATTR});
  }catch(e){}
  /* phrases already on screen when this arrives */
  try{ if(typeof LANG !== 'undefined' && LANG === 'ko' && typeof paintLang === 'function') setTimeout(paintLang, 0); }catch(e){}
})();
/* Europe's four subregions (Directory tabs and bars, Atlas) */
try{ Object.assign(KO, {"Northern Europe": "북유럽", "Western Europe": "서유럽", "Southern Europe": "남유럽", "Eastern Europe": "동유럽", "Northern": "북유럽", "Western": "서유럽", "Southern": "남유럽", "Eastern": "동유럽", "All": "전체", "Days": "일수", "From DD/MM/YYYY": "시작일 DD/MM/YYYY"}); }catch(e){}
