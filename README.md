# AL CLI (Agent Ledger)

**AL CLI**는 개인의 금융 자산을 효율적으로 관리하고 조회할 수 있도록 도와주는 경량 커맨드라인 도구(CLI)입니다. 특히 증권사의 API(키움증권 등)와 연동하여 실시간 포트폴리오 현황을 확인하는 데 특화되어 있습니다.

## 🚀 주요 기능

- **실시간 포트폴리오 조회**: `al finance get stocks` 명령어를 통해 보유 중인 국내/해외 주식의 실시간 평가 금액과 손익을 확인합니다.
- **잔고 관리**: 보유 현금 및 예탁금 상태를 조회할 수 있습니다.
- **데이터 정합성**: Yahoo Finance 등의 외부 데이터를 활용하여 API에서 제공하지 않는 최신 시세를 보충하여 정확한 평가액을 계산합니다.

## 📂 프로젝트 구조

```text
al-cli/
├── bin/
│   └── al                  # CLI 진입점 (Node.js 스크립트)
├── src/                    # JavaScript 로직
│   ├── commands/           # 기능별 명령어 모듈
│   └── util/               # 설정 및 인증 유틸리티
├── src_py/                 # Python 로직 (양립 지원)
│   ├── commands/finance/   # 금융 관련 로직
│   └── util/config.py      # 환경 변수 관리
├── requirements.txt        # Python 의존성
├── package.json            # Node.js 의존성
└── README.md
```

## 🛠️ 설치 및 실행

1. 의존성 설치:
   ```bash
   npm install
   ```

2. 환경 변수 설정:
   - 프로젝트 루트에 `.env` 파일을 생성하고 API 인증키 등을 입력합니다.

3. 실행 예시:
   ```bash
   npm run start -- finance get stocks
   ```

## 💡 개발 노트

본 도구는 개인 투자자의 효율적인 자산 관리를 목적으로 개발되었으며, `openclaw`와 같은 어시스턴트 에이전트와 연동하여 자동화된 리포트 작성이 가능하도록 설계되었습니다.
