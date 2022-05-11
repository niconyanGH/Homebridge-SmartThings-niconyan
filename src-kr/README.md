<span align="center">

# Homebridge-SmartThings-niconyan
</span>

이 폴더내에 있는 소스코드는 주석이 한국어로 되어 있습니다.

[Homebridge](https://github.com/homebridge/homebridge)용 SmartThings 플러그인입니다. 

SmartThings기기를 아이폰에서 사용할 때 유용합니다.
SmartThings기기를 Homekit 기기와 연동해서 자동화 설정할때, Siri로 제어할 때, Control Center에 아이콘을 추가해놓고 쓸 수 있습니다.

실험적인 기능을 [베타 브런치](https://github.com/niconyanGH/Homebridge-SmartThings-niconyan/tree/beta)에서 개발중입니다.

이 플러그인을 사용하며 문제를 겪는다면 [이슈탭](https://github.com/niconyanGH/Homebridge-SmartThings-niconyan/issues)에 제보해주세요.

홈 앱에 표시되는 '일련 번호', '모델', '펌웨어' 정보는 부정확한 정보입니다.

## 지원 범위
### 지원 로그 언어 목록
* 한국어
* 영어

### 지원 SmartThings 디바이스 목록
* 공기청정기
  - 지원 모델
    + AX47T9360WSD
    + AX60R5080WD
  - 지원 기능
    + 전원 On/Off
    + 작동 운전모드 제어: 수면/무풍/스마트/강풍 (베타 테스트중)
    + 자동 운전모드 제어: 자동/수동
    + 공기질 확인: 1 ~ 4 [(CAQI)](https://www.airqualitynow.eu/download/CITEAIR-Comparing_Urban_Air_Quality_across_Borders.pdf)
    + 미세먼지 PM10, PM2.5 수치 확인 (단위가 잘못 됨. mg/m³가 아닌 µg/m³가 옳음.)
    + 헤파 필터 교체지시등 확인 (지원예정)
    + 헤파 필터 남은 수명 확인 (지원예정)
    + 헤파 필터 남은 수명 초기화 (지원예정)

## 플러그인 사용법

1. 서버에 [Homebridge](https://github.com/homebridge/homebridge#installation)를 설치합니다.
2. 서버의 웹브라우저에서 주소창에 localhost:8581을 입력합니다. 또는 서버와 같은 네트워크에 연결된 단말기의 웹 브라우저에서 서버IP:8581을 입력합니다. (경우에 따라 서버에서 8581포트를 수동으로 열어줘야 할 수 있습니다.)
3. 플러그인 탭에서 검색창에 SmartThings를 검색해 나오는 결과 중 본 플러그인을 설치합니다.
4. 설치가 끝나면 최초 한번만 입력받는 SmartThingsAPI Token값과 언어설정을 할 수 있는 설정창이 나옵니다. SmartThingsAPI Token을 발급받는 방법은 뒤에 이어서 작성하겠습니다.
5. 이후는 자동적으로 사용자의 삼성계정에 등록된 SmartThings Device를 검색하고 지원하는 기기를 Homebridge에 등록합니다.

## SmartThingsAPI Token 발급받는 방법

1. [SmartThings token 페이지](https://account.smartthings.com/tokens)에 접속하고 SmartThings 소유자의 삼성계정으로 로그인합니다.
![guide1](../guide/1.png?raw=true)

2. GENERATE NEW TOKEN 을 클릭해 새 토큰을 생성합니다.
![guide2](../guide/2.png?raw=true)

3. 인증 범위를 Devices 만 전부 체크합니다. 이 플러그인은 이 이상의 인증을 필요로 하지 않습니다.
![guide3](../guide/3.png?raw=true)

4. 페이지를 벗어나면 다시 조회할 수 없는 SmartThings API토큰이 발급됐습니다. 잊어버려도 새로 발급받으면 됩니다.
![guide4](../guide/4.png?raw=true)

## 릴리스 노트
<span align="center">

### ver0.0.1
</span>

![Homebridge-SmartThings-niconyan v0.0.1 Summary Introduction(kr)](./../ReleaseNote/v0.0.1/Summary_Introduction_Homebridge-SmartThings-AirPurifier(kr).png?raw=true)

새 액세서리: 공기청정기
* 공기청정기의 전원을 껐다 킬 수 있습니다.
* 공기청정기의 자동모드를 수동과 자동중에 선택할 수 있습니다.
* 공기질을 확인할 수 있습니다.
* 미세먼지 PM10과 PM2.5의 수치를 확인할 수 있습니다.

## Thanks to
* [노멀피플](https://www.youtube.com/c/%EB%85%B8%EB%A9%80%ED%94%BC%ED%94%8C): 번역검수 제공
* imeSven: 버그제보, 'AX60R5080WD' 토큰 제공
* [SmartThings community](https://community.smartthings.com/): 개발 팁 제공.