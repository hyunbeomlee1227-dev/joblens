import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="section-kicker">404</p>
      <h1>데모 공고를 찾을 수 없습니다</h1>
      <p>주소를 다시 확인하거나 공개 데모 목록으로 돌아가 주세요.</p>
      <Link className="primary-link" href="/">
        공고 목록으로
      </Link>
    </main>
  );
}
