export default function SellerPayoutsNotice({
  type,
  message,
  details,
}: {
  type: "success" | "error" | "info";
  message: string;
  details?: string[];
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
        type === "success"
          ? "border-bm-success/35 bg-bm-success-bg text-bm-success"
          : type === "error"
            ? "border-bm-danger/35 bg-bm-danger-bg text-bm-danger"
            : "border-bm-warning/35 bg-bm-warning-bg text-bm-warning"
      }`}
    >
      <div>{message}</div>
      {details && details.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-medium opacity-90">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
