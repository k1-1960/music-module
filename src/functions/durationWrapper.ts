export interface WrappedDuration {
  decimalMinutes: number;
  flatMinutes: number;
  seconds: number;
  timestamp: string;
}

export function durationWrapper(seconds: number): WrappedDuration {
  let decimalMinutes: number = seconds / 60;
  let minutes: number = Math.floor(seconds / 60);
  let secondsLeft: number = seconds - minutes * 60;

  return {
    decimalMinutes: decimalMinutes,
    flatMinutes: minutes,
    seconds: secondsLeft,
    timestamp: `${minutes}:${secondsLeft}`,
  };
}
