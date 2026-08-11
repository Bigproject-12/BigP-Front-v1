import { useState } from 'react';
import Icon from '../icons/Icon';
import './ui.css';

/**
 * Push 성공 안내 + 로컬 pull 유도.
 *
 * GuardrAil의 Push는 로컬 git을 거치지 않고 백엔드가 원격 브랜치를 직접 커밋한다.
 * 그래서 Push 직후 사용자(및 팀원)의 로컬 저장소는 자동으로 뒤처진 상태가 되고,
 * 그걸 모른 채 VS Code에서 계속 작업하면 다음 push에서 충돌이 난다.
 * 성공 메시지만으로는 이 사실이 드러나지 않으므로 pull 명령을 함께 안내한다.
 */
export default function PushSuccessNotice({ branch }) {
  const [copied, setCopied] = useState(false);
  const targetBranch = branch || 'main';
  const command = `git pull origin ${targetBranch}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없거나 http 환경이면 실패할 수 있다.
      // 명령어는 화면에 그대로 보이므로 직접 선택해 복사하면 된다.
      setCopied(false);
    }
  };

  return (
    <div className="push-notice">
      <div className="push-notice__head">
        <Icon name="check" size={14} className="push-notice__icon" />
        <span className="text-body-sm">GitHub Push에 성공했습니다.</span>
      </div>
      <p className="push-notice__desc text-caption-md">
        원격 <strong>{targetBranch}</strong> 브랜치가 직접 변경되었습니다.
        VS Code 등 다른 환경에서 작업 중이라면 먼저 최신 상태를 받아오세요.
      </p>
      <div className="push-notice__cmd">
        <code>{command}</code>
        <button
          type="button"
          className="push-notice__copy"
          onClick={handleCopy}
          aria-label="pull 명령 복사"
        >
          <Icon name="copy" size={13} />
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  );
}
