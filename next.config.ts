import type { NextConfig } from "next";

/**
 * Docker 볼륨 마운트(특히 Windows)에서는 OS 파일 이벤트가 컨테이너에 안 올 때가 많다.
 * Next 16은 루트의 watchOptions.pollIntervalMs 를 webpack·Turbopack 양쪽 감시에 넣어 준다.
 * (webpack() 안에서 watchOptions 를 덮어쓰면 멀티 컴파일러와 충돌해 HMR 이 안 되는 경우가 있다.)
 */
const devWatchPoll =
  process.env.DOCKER_DEV === "1" || process.env.WATCHPACK_POLLING === "true";

const nextConfig: NextConfig = {
  turbopack: {},
  ...(devWatchPoll
    ? {
        watchOptions: {
          pollIntervalMs: 400,
        },
      }
    : {}),
};

export default nextConfig;
