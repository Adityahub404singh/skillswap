import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

interface JitsiCallProps {
  sessionId: string;
  userName?: string;
  email?: string;
}

export default function JitsiCall({ sessionId, userName, email }: JitsiCallProps) {
  const roomName = `skillswap-session-${sessionId}`;

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          disableThirdPartyRequests: true,
          prejoinPageEnabled: false,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        userInfo={{
          displayName: userName || 'SkillSwap User',
          email: email || 'user@skillswap.com', // Fix: Added email field
        }}
        onApiReady={(externalApi) => {
          externalApi.addEventListener('videoConferenceLeft', () => {
            window.location.href = '/dashboard';
          });
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100%';
          iframeRef.style.borderRadius = '12px';
        }}
      />
    </div>
  );
}