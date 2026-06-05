// Visually-hidden form trap. Bots that auto-fill every text input will set
// this field; humans never see it. The server checks for any non-empty value
// and silently drops the submission.
//
// Pattern notes:
// - aria-hidden + tabIndex=-1 + autoComplete=off keeps the field out of
//   assistive tech and tab order
// - The field is named "company" client-side but serialized as `hp_company`
//   in the JSON body so the server contract is explicit
// - Hidden via off-screen positioning rather than display:none so headless
//   browsers and form-autofill libs that ignore display:none still fill it

export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      className="absolute h-0 w-0 overflow-hidden"
      style={{
        position: "absolute",
        left: "-10000px",
        top: "auto",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    >
      <label>
        Company name (do not fill)
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
