type Props = {
  rating: number;
  index: number;
  onRate: (value: number) => void;
};

export default function Star({ rating, index, onRate }: Props) {
  const diff = rating - (index - 1);

  const fill = diff >= 1 ? "full" : diff > 0 ? "half" : "empty";

  return (
    <div className="relative w-7 h-7">
      {/* GRAU (Hintergrund) */}
      <svg
        className="absolute inset-0 text-gray-300"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.54 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>

      {/* GELB – FULL */}
      {fill === "full" && (
        <svg
          className="absolute inset-0 text-yellow-400"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.54 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
        </svg>
      )}

      {/* GELB – HALF (PERFEKT ABGESCHNITTEN) */}
      {fill === "half" && (
        <svg
          className="absolute inset-0 text-yellow-400"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{
            clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
          }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.54 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
        </svg>
      )}

      {/* Klickbereiche */}
      <button
        className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
        onClick={() => onRate(index - 0.5)}
      />
      <button
        className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
        onClick={() => onRate(index)}
      />
    </div>
  );
}
