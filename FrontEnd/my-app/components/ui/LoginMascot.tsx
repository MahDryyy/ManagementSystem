"use client";

import {
  useRive,
  useStateMachineInput,
} from "@rive-app/react-canvas";
import { useEffect } from "react";

interface Props {
  username: string;
  usernameFocused: boolean;
  passwordFocused: boolean;
}

const STATE_MACHINE = "Login Machine";

export default function LoginMascot({
  username,
  usernameFocused,
  passwordFocused,
}: Props) {
  const { rive, RiveComponent } = useRive({
    src: "/Animated/login-machine.riv",
    stateMachines: STATE_MACHINE,
    autoplay: true,
  });

  const isChecking = useStateMachineInput(
    rive,
    STATE_MACHINE,
    "isChecking"
  );

  const isHandsUp = useStateMachineInput(
    rive,
    STATE_MACHINE,
    "isHandsUp"
  );

  const numLook = useStateMachineInput(
    rive,
    STATE_MACHINE,
    "numLook"
  );

  /* eslint-disable react-hooks/immutability -- Rive state machine inputs are set via .value, this is the official API */
  useEffect(() => {
    if (isChecking) {
      isChecking.value = usernameFocused;
    }

    if (isHandsUp) {
      isHandsUp.value = passwordFocused;
    }

    if (numLook) {
      numLook.value = username.length;
    }
  }, [
    username,
    usernameFocused,
    passwordFocused,
    isChecking,
    isHandsUp,
    numLook,
  ]);

  return (
    <div
      className="w-full border-b border-zinc-200 bg-gradient-to-b from-zinc-50/30 to-zinc-50/70"
      aria-hidden
    >
      {/* Clip hanya bagian bawah; animasi di-anchor dari atas supaya kepala tidak kepotong */}
      <div className="relative mx-auto h-36 w-full max-w-[15.5rem] overflow-hidden sm:h-40 sm:max-w-[17rem]">
        <div className="absolute top-0 left-1/2 h-[calc(100%+2rem)] w-full -translate-x-1/2 sm:h-[calc(100%+2.25rem)]">
          <RiveComponent className="block h-full w-full [&_canvas]:!h-full [&_canvas]:!w-full" />
        </div>
      </div>
    </div>
  );
}
