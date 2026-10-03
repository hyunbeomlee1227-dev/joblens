import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="JobLens 홈">
        <span className="brand-mark" aria-hidden="true">
          JL
        </span>
        <span>JobLens</span>
      </Link>
      <nav className="site-header-nav" aria-label="주요 메뉴">
        <Link className="header-link" href="/">
          공고 찾기
        </Link>
        <Link className="header-link" href="/resume">
          이력서 준비
        </Link>
        <span className="header-status">공개 데모</span>
      </nav>
    </header>
  );
}
