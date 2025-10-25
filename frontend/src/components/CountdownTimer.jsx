import { useState, useEffect } from 'react';

const CountdownTimer = ({ endTime }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(endTime) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const timerComponents = [];

  Object.keys(timeLeft).forEach((interval) => {
    if (!timeLeft[interval] && interval !== 'seconds' && interval !== 'minutes') {
        return;
    }

    timerComponents.push(
      <span key={interval} className="text-xl font-mono">
        {String(timeLeft[interval]).padStart(2, '0')}
        {interval.charAt(0)}{' '}
      </span>
    );
  });

  return (
    <div className="text-center bg-gray-800 p-2 rounded-lg">
      <h3 className="text-lg font-semibold text-teal-400 mb-1">Time Remaining</h3>
      <div className="text-2xl text-white">
        {timerComponents.length ? timerComponents : <span>Contest Over!</span>}
      </div>
    </div>
  );
};

export default CountdownTimer;