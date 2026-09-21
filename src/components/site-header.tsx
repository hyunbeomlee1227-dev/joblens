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
      <span className="header-status">공개 데모</span>
    </header>
  );
}
