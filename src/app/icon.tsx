import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = {
  width: 192,
  height: 192,
};

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 360 360" width="182" height="182" fill="none">
          <path
            d="M52 296L180 88"
            stroke="#111111"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M180 88L312 296H128L230 170"
            stroke="#111111"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
