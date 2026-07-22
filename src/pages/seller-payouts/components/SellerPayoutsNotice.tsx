export default function SellerPayoutsNotice({
  type,
  message,
}: {
  type: "success" | "error" | "info";
  message: string;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : type === "error"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {message}
    </div>
  );
}
