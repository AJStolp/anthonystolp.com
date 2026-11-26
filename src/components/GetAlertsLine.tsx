// The one small line under a listings link, offering the alert sign up the
// email gate used to ask for (T-088). `href` is the page's own alerts card,
// "#alerts", unless the card lives on another page.
export function GetAlertsLine({
  town,
  href = "#alerts",
  className = "mt-3 text-[14px] leading-[1.6] text-ink-soft",
}: {
  town?: string;
  href?: string;
  className?: string;
}) {
  return (
    <p className={className}>
      {town
        ? `Want new ${town} listings sent to you first?`
        : "Want new listings sent to you first?"}{" "}
      <a href={href} className="underline underline-offset-4">
        Get alerts
      </a>
    </p>
  );
}
