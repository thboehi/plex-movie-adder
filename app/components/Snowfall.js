"use client";

import Snowfall from 'react-snowfall';

export default function SnowfallEffect() {
  return (
    <Snowfall
      color="#dee4fd"
      snowflakeCount={100}
      speed={[0.5, 1.5]}
      wind={[-0.5, 1.0]}
      radius={[0.5, 3.0]}
      style={{
        position: 'fixed',
        width: '100vw',
        height: '100vh',
        zIndex: 999,
        pointerEvents: 'none'
      }}
    />
  );
}
